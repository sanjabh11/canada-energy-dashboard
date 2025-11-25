#!/usr/bin/env python3
"""Import OBPS compliance data from a prepared CSV into obps_compliance.

This is a thin CSV -> Supabase helper. You are expected to prepare the CSV
from Alberta TIER / Saskatchewan OBPS reports with columns matching
OBPS_CSV_COLUMNS below.

Usage:
    python scripts/import_obps_compliance.py --csv data/obps_compliance_2023.csv

Environment:
    SUPABASE_URL, SUPABASE_KEY (or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY)
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

OBPS_CSV_COLUMNS = {
    # obps_compliance table -> CSV column name
    'facility_name': 'facility_name',
    'operator': 'operator',
    'province_code': 'province_code',
    'reporting_year': 'reporting_year',
    'production_volume': 'production_volume',
    'production_unit': 'production_unit',
    'baseline_emission_intensity': 'baseline_emission_intensity',
    'actual_emission_intensity': 'actual_emission_intensity',
    'credit_market_price_per_tonne': 'credit_market_price_per_tonne',
    'compliance_status': 'compliance_status',
}


def get_client() -> Client:
    url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')
    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_KEY (or VITE_*) must be set")
        sys.exit(1)
    return create_client(url, key)


def parse_number(value: str) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def load_rows(csv_path: str) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for raw in reader:
            try:
                year = int(raw.get(OBPS_CSV_COLUMNS['reporting_year'], 0) or 0)
            except ValueError:
                continue

            row: Dict[str, Any] = {
                'facility_name': raw.get(OBPS_CSV_COLUMNS['facility_name'], '').strip(),
                'operator': raw.get(OBPS_CSV_COLUMNS['operator'], '').strip(),
                'province_code': raw.get(OBPS_CSV_COLUMNS['province_code'], '').strip() or None,
                'reporting_year': year,
                'production_volume': parse_number(raw.get(OBPS_CSV_COLUMNS['production_volume'], '')) or 0,
                'production_unit': raw.get(OBPS_CSV_COLUMNS['production_unit'], '').strip(),
                'baseline_emission_intensity': parse_number(raw.get(OBPS_CSV_COLUMNS['baseline_emission_intensity'], '')) or 0,
                'actual_emission_intensity': parse_number(raw.get(OBPS_CSV_COLUMNS['actual_emission_intensity'], '')) or 0,
                'credit_market_price_per_tonne': parse_number(raw.get(OBPS_CSV_COLUMNS['credit_market_price_per_tonne'], '')),
                'compliance_status': raw.get(OBPS_CSV_COLUMNS['compliance_status'], '').strip() or None,
            }

            if not row['facility_name'] or not row['operator']:
                continue
            rows.append(row)

    return rows


def import_rows(client: Client, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        print("No OBPS rows to import")
        return

    print(f"Importing {len(rows)} OBPS compliance rows...")
    batch_size = 500
    imported = 0

    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        try:
            client.table('obps_compliance').upsert(
                batch,
                on_conflict='facility_name,reporting_year',
            ).execute()
            imported += len(batch)
            print(f"  Batch {i // batch_size + 1}: {len(batch)} rows")
        except Exception as e:
            print(f"  Error importing batch {i // batch_size + 1}: {e}")

    print(f"Imported {imported} OBPS compliance rows")


def main() -> None:
    parser = argparse.ArgumentParser(description='Import OBPS compliance CSV into obps_compliance')
    parser.add_argument('--csv', required=True, help='Path to OBPS compliance CSV')
    args = parser.parse_args()

    if not os.path.exists(args.csv):
        print(f"CSV file not found: {args.csv}")
        sys.exit(1)

    rows = load_rows(args.csv)
    client = get_client()
    import_rows(client, rows)


if __name__ == '__main__':
    main()
