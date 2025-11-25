#!/usr/bin/env python3
"""
NPRI Facility Emissions Import Script (Lean Version)

Downloads NPRI facility-level GHG data (pre-downloaded CSV recommended)
Transforms into the facility_emissions schema and upserts into Supabase.

Usage (preferred):
    python scripts/import_npri_facilities.py --csv path/to/npri.csv --year 2023 --province AB

Environment:
    SUPABASE_URL, SUPABASE_KEY (or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY)

Notes:
- This script intentionally focuses on the core path (CSV -> facility_emissions)
- You can adjust column names in `ROW_MAPPING` to match the NPRI export you use.
"""

import os
import sys
import csv
import argparse
from typing import List, Dict, Any

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase package not installed. Run: pip install supabase")
    sys.exit(1)

# Map NPRI CSV column names -> our facility_emissions schema
ROW_MAPPING = {
    'facility_name': 'FacilityName',
    'operator': 'CompanyName',
    'province_code': 'ProvinceCode',
    'city': 'City',
    'latitude': 'Latitude',
    'longitude': 'Longitude',
    'sector': 'NAICS_Description',
    'emissions_tonnes': 'TotalEmissions',
    'co2_tonnes': 'CO2',
    'ch4_tonnes': 'CH4_CO2e',
    'n2o_tonnes': 'N2O_CO2e',
    'reporting_year': 'ReportingYear',
}

MIN_EMISSIONS_TONNES = 10_000  # keep only material facilities


def get_supabase_client() -> Client:
    url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')
    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_KEY (or VITE_*) must be set")
        sys.exit(1)
    return create_client(url, key)


def parse_float(value: str) -> float:
    if value is None or value == "":
        return 0.0
    try:
        return float(value)
    except ValueError:
        return 0.0


def load_facilities(csv_path: str, year: int, province: str | None) -> List[Dict[str, Any]]:
    print(f"Loading NPRI CSV: {csv_path}")
    facilities: List[Dict[str, Any]] = []

    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                row_year = int(row.get(ROW_MAPPING['reporting_year'], 0) or 0)
            except ValueError:
                continue
            if row_year != year:
                continue

            if province:
                if row.get(ROW_MAPPING['province_code'], "").upper() != province.upper():
                    continue

            total_emissions = parse_float(row.get(ROW_MAPPING['emissions_tonnes'], "0"))
            if total_emissions < MIN_EMISSIONS_TONNES:
                continue

            facility = {
                'facility_name': row.get(ROW_MAPPING['facility_name'], "").strip(),
                'operator': row.get(ROW_MAPPING['operator'], "").strip(),
                'province_code': row.get(ROW_MAPPING['province_code'], "").strip() or None,
                'city': row.get(ROW_MAPPING['city'], "").strip() or None,
                'latitude': parse_float(row.get(ROW_MAPPING['latitude'], "")) or None,
                'longitude': parse_float(row.get(ROW_MAPPING['longitude'], "")) or None,
                'sector': row.get(ROW_MAPPING['sector'], "").strip() or 'Unknown',
                'emissions_tonnes': total_emissions,
                'co2_tonnes': parse_float(row.get(ROW_MAPPING['co2_tonnes'], "")) or None,
                'ch4_tonnes': parse_float(row.get(ROW_MAPPING['ch4_tonnes'], "")) or None,
                'n2o_tonnes': parse_float(row.get(ROW_MAPPING['n2o_tonnes'], "")) or None,
                'hfc_tonnes': None,
                'reporting_year': row_year,
                'emission_intensity': None,
                'production_unit': None,
            }

            if not facility['facility_name'] or not facility['operator']:
                continue

            facilities.append(facility)

    facilities.sort(key=lambda f: f['emissions_tonnes'], reverse=True)
    print(f"Found {len(facilities)} facilities >= {MIN_EMISSIONS_TONNES:,} tCO2e in {year}")
    return facilities


def import_facilities(client: Client, facilities: List[Dict[str, Any]]) -> None:
    if not facilities:
        print("No facilities to import")
        return

    print(f"Importing {len(facilities)} facilities into facility_emissions...")
    batch_size = 500
    imported = 0

    for i in range(0, len(facilities), batch_size):
        batch = facilities[i:i + batch_size]
        try:
            client.table('facility_emissions').upsert(
                batch,
                on_conflict='facility_name,reporting_year',
            ).execute()
            imported += len(batch)
            print(f"  Batch {i // batch_size + 1}: {len(batch)} rows")
        except Exception as e:
            print(f"  Error importing batch {i // batch_size + 1}: {e}")

    print(f"Imported {imported} facility rows")
    if facilities:
        print("Top 5 facilities by emissions:")
        for idx, f in enumerate(facilities[:5], start=1):
            print(f"  {idx}. {f['facility_name']} ({f['operator']}): {f['emissions_tonnes']:.0f} tCO2e")


def main() -> None:
    parser = argparse.ArgumentParser(description="Import NPRI facility emissions into Supabase")
    parser.add_argument("--csv", required=True, help="Path to NPRI CSV export")
    parser.add_argument("--year", type=int, required=True, help="Reporting year (e.g., 2023)")
    parser.add_argument("--province", type=str, help="Province code filter (e.g., AB)")
    args = parser.parse_args()

    if not os.path.exists(args.csv):
        print(f"CSV file not found: {args.csv}")
        sys.exit(1)

    facilities = load_facilities(args.csv, args.year, args.province)
    client = get_supabase_client()
    import_facilities(client, facilities)


if __name__ == "__main__":
    main()
