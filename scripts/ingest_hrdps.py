#!/usr/bin/env python3
"""
ECCC HRDPS Data Ingestion Script

Downloads High Resolution Deterministic Prediction System (HRDPS) weather
forecasts from the MSC Datamart via the Open-Meteo GEM API proxy and stores
them in Supabase for use by the Canada Energy Dashboard.

HRDPS provides 2.5km resolution, 48-hour pan-Canadian NWP forecasts.
RDPS provides 10km resolution, 72-hour forecasts for longer horizons.

Data sources:
  - ECCC MSC Datamart: https://eccc-msc.github.io/open-data/msc-data/nwp_hrdps/readme_hrdps_en/
  - Open-Meteo GEM API: https://open-meteo.com/en/docs/gem-api (free, no API key)

Usage:
  python scripts/ingest_hrdps.py                          # Ingest HRDPS for all provinces
  python scripts/ingest_hrdps.py --model rdps              # Use RDPS instead
  python scripts/ingest_hrdps.py --provinces ON AB QC     # Specific provinces
  python scripts/ingest_hrdps.py --dry-run                 # Print without storing
  python scripts/ingest_hrdps.py --hours 24                # Limit forecast hours

Environment variables:
  SUPABASE_URL          - Supabase project URL
  SUPABASE_SERVICE_KEY  - Supabase service role key (for writes)
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Any

# Provincial capital coordinates (matching weatherService.ts)
PROVINCIAL_COORDINATES = {
    "ON": {"lat": 43.6532, "lon": -79.3832, "station": "YYZ"},   # Toronto
    "QC": {"lat": 45.5017, "lon": -73.5673, "station": "YUL"},   # Montreal
    "BC": {"lat": 49.2827, "lon": -123.1207, "station": "YVR"},  # Vancouver
    "AB": {"lat": 53.5461, "lon": -113.4938, "station": "YEG"},  # Edmonton
    "SK": {"lat": 50.4452, "lon": -104.6189, "station": "YQR"},  # Regina
    "MB": {"lat": 49.8951, "lon": -97.1384, "station": "YWG"},   # Winnipeg
    "NS": {"lat": 44.6488, "lon": -63.5752, "station": "YHZ"},   # Halifax
    "NB": {"lat": 45.9636, "lon": -66.6431, "station": "YFC"},   # Fredericton
    "NL": {"lat": 47.5605, "lon": -52.7129, "station": "YYT"},   # St. John's
    "PE": {"lat": 46.2382, "lon": -63.1311, "station": "YYG"},   # Charlottetown
}

GEM_HRDPS_URL = "https://api.open-meteo.com/v1/gem"
GEM_RDPS_URL = "https://api.open-meteo.com/v1/gem?model=rdps"

HOURLY_VARIABLES = [
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "wind_direction_10m",
    "precipitation",
    "cloud_cover",
    "shortwave_radiation",
    "dew_point_2m",
    "surface_pressure",
]

CURRENT_VARIABLES = HOURLY_VARIABLES  # Same vars for current


def fetch_gem_forecast(
    province: str,
    model: str = "hrdps",
    hours: int = 48,
) -> dict[str, Any] | None:
    """Fetch HRDPS/RDPS forecast from Open-Meteo GEM API."""
    coords = PROVINCIAL_COORDINATES.get(province)
    if not coords:
        print(f"  ERROR: No coordinates for province {province}", file=sys.stderr)
        return None

    base_url = GEM_HRDPS_URL if model == "hrdps" else GEM_RDPS_URL

    params = {
        "latitude": str(coords["lat"]),
        "longitude": str(coords["lon"]),
        "current": ",".join(CURRENT_VARIABLES),
        "hourly": ",".join(HOURLY_VARIABLES),
        "forecast_days": "2" if model == "hrdps" else "3",
        "timezone": "America/Toronto",
    }

    query_string = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{base_url}&{query_string}" if "?" in base_url else f"{base_url}?{query_string}"

    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data
    except urllib.error.URLError as e:
        print(f"  ERROR: Failed to fetch {model.upper()} for {province}: {e}", file=sys.stderr)
        return None
    except json.JSONDecodeError as e:
        print(f"  ERROR: Failed to parse response for {province}: {e}", file=sys.stderr)
        return None


def parse_observation(province: str, model: str, data: dict[str, Any]) -> dict[str, Any]:
    """Parse GEM API response into a WeatherObservation record."""
    current = data.get("current", {})
    coords = PROVINCIAL_COORDINATES[province]

    return {
        "id": f"{model}_{province}_{current.get('time', datetime.now(timezone.utc).isoformat())}",
        "province": province,
        "station_id": f"{model.upper()}_{coords.get('station', province)}",
        "latitude": coords["lat"],
        "longitude": coords["lon"],
        "temperature_c": current.get("temperature_2m"),
        "humidity_percent": current.get("relative_humidity_2m"),
        "wind_speed_ms": current.get("wind_speed_10m"),
        "wind_direction_deg": current.get("wind_direction_10m"),
        "cloud_cover_percent": current.get("cloud_cover"),
        "precipitation_mm": current.get("precipitation"),
        "solar_radiation_wm2": current.get("shortwave_radiation"),
        "condition_code": (
            "Cloudy" if (current.get("cloud_cover") or 0) > 75
            else "Partly Cloudy" if (current.get("cloud_cover") or 0) > 25
            else "Clear"
        ),
        "source": f"eccc_{model}",
        "observed_at": current.get("time", ""),
        "received_at": datetime.now(timezone.utc).isoformat(),
        "raw_data": data,
    }


def parse_forecast_series(
    province: str,
    model: str,
    data: dict[str, Any],
    hours: int = 48,
) -> list[dict[str, Any]]:
    """Parse GEM API hourly response into a list of forecast records."""
    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    n = min(hours, len(times))

    records = []
    for i in range(n):
        records.append({
            "province": province,
            "model": model,
            "time": times[i],
            "temperature_c": hourly.get("temperature_2m", [None] * n)[i],
            "humidity_pct": hourly.get("relative_humidity_2m", [None] * n)[i],
            "wind_speed_ms": hourly.get("wind_speed_10m", [None] * n)[i],
            "wind_direction_deg": hourly.get("wind_direction_10m", [None] * n)[i],
            "precipitation_mm": hourly.get("precipitation", [None] * n)[i],
            "cloud_cover_pct": hourly.get("cloud_cover", [None] * n)[i],
            "solar_radiation_wm2": hourly.get("shortwave_radiation", [None] * n)[i],
            "dew_point_c": hourly.get("dew_point_2m", [None] * n)[i],
            "surface_pressure_hpa": hourly.get("surface_pressure", [None] * n)[i],
            "ingested_at": datetime.now(timezone.utc).isoformat(),
        })

    return records


def store_in_supabase(
    observation: dict[str, Any],
    forecast_series: list[dict[str, Any]],
    supabase_url: str,
    supabase_key: str,
) -> bool:
    """Store observation and forecast series in Supabase."""
    try:
        # Store current observation
        obs_url = f"{supabase_url}/rest/v1/weather_observations"
        obs_headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
        obs_data = json.dumps(observation).encode("utf-8")
        obs_req = urllib.request.Request(obs_url, data=obs_data, headers=obs_headers, method="POST")
        with urllib.request.urlopen(obs_req, timeout=30) as resp:
            if resp.status not in (200, 201):
                print(f"  WARN: Observation storage returned {resp.status}", file=sys.stderr)

        # Store forecast series
        if forecast_series:
            fc_url = f"{supabase_url}/rest/v1/weather_forecasts"
            fc_data = json.dumps(forecast_series).encode("utf-8")
            fc_req = urllib.request.Request(fc_url, data=fc_data, headers=obs_headers, method="POST")
            with urllib.request.urlopen(fc_req, timeout=30) as resp:
                if resp.status not in (200, 201):
                    print(f"  WARN: Forecast storage returned {resp.status}", file=sys.stderr)

        return True
    except Exception as e:
        print(f"  ERROR: Supabase storage failed: {e}", file=sys.stderr)
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingest ECCC HRDPS/RDPS weather data")
    parser.add_argument(
        "--model",
        choices=["hrdps", "rdps"],
        default="hrdps",
        help="NWP model to use (default: hrdps)",
    )
    parser.add_argument(
        "--provinces",
        nargs="+",
        default=list(PROVINCIAL_COORDINATES.keys()),
        help="Provinces to ingest (default: all)",
    )
    parser.add_argument(
        "--hours",
        type=int,
        default=48,
        help="Number of forecast hours to ingest (default: 48)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print data without storing in Supabase",
    )
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")

    if not args.dry_run and (not supabase_url or not supabase_key):
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY required for storage", file=sys.stderr)
        print("Use --dry-run to test without storage.", file=sys.stderr)
        return 1

    print(f"ECCC {args.model.upper()} Weather Ingestion")
    print(f"  Provinces: {', '.join(args.provinces)}")
    print(f"  Forecast hours: {args.hours}")
    print(f"  Mode: {'dry-run' if args.dry_run else 'live'}")
    print()

    success_count = 0
    fail_count = 0

    for province in args.provinces:
        print(f"  [{province}] Fetching {args.model.upper()} forecast...")

        data = fetch_gem_forecast(province, args.model, args.hours)
        if not data:
            fail_count += 1
            continue

        observation = parse_observation(province, args.model, data)
        forecast_series = parse_forecast_series(province, args.model, data, args.hours)

        print(f"    Current: {observation.get('temperature_c', 'N/A')}°C, "
              f"Wind: {observation.get('wind_speed_ms', 'N/A')} m/s, "
              f"Cloud: {observation.get('cloud_cover_percent', 'N/A')}%")
        print(f"    Forecast points: {len(forecast_series)}")

        if args.dry_run:
            print(f"    [DRY RUN] Would store observation + {len(forecast_series)} forecast records")
        else:
            if store_in_supabase(observation, forecast_series, supabase_url, supabase_key):
                print(f"    Stored successfully")
                success_count += 1
            else:
                print(f"    Storage failed")
                fail_count += 1
                continue

        success_count += 1

    print()
    print(f"Ingestion complete: {success_count} succeeded, {fail_count} failed")
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
