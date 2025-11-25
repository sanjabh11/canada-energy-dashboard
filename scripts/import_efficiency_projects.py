#!/usr/bin/env python3
"""Import efficiency projects from CSV into efficiency_projects.

You prepare the CSV from EMRF/ERA/company project lists with columns
matching EFF_CSV_COLUMNS below.

Usage:
    python scripts/import_efficiency_projects.py --csv data/efficiency_projects.csv

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

EFF_CSV_COLUMNS = {
    'project_name': 'project_name',
    'company': 'company',
    'facility_name': 'facility_name',
    'province_code': 'province_code',
    'project_type': 'project_type',
    'investment_cad': 'investment_cad',
    'start_date': 'start_date',
    'completion_date': 'completion_date',
    'status': 'status',
    'annual_emissions_avoided_tonnes': 'annual_emissions_avoided_tonnes',
    'annual_cost_savings_cad': 'annual_cost_savings_cad',
    'government_funding_cad': 'government_funding_cad',
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
            row: Dict[str, Any] = {
                'project_name': raw.get(EFF_CSV_COLUMNS['project_name'], '').strip(),
                'company': raw.get(EFF_CSV_COLUMNS['company'], '').strip(),
                'facility_name': raw.get(EFF_CSV_COLUMNS['facility_name'], '').strip() or None,
                'province_code': raw.get(EFF_CSV_COLUMNS['province_code'], '').strip(),
                'project_type': raw.get(EFF_CSV_COLUMNS['project_type'], '').strip(),
                'investment_cad': parse_number(raw.get(EFF_CSV_COLUMNS['investment_cad'], '')) or 0,
                'start_date': raw.get(EFF_CSV_COLUMNS['start_date'], '').strip() or None,
                'completion_date': raw.get(EFF_CSV_COLUMNS['completion_date'], '').strip() or None,
                'status': raw.get(EFF_CSV_COLUMNS['status'], '').strip(),
                'annual_emissions_avoided_tonnes': parse_number(raw.get(EFF_CSV_COLUMNS['annual_emissions_avoided_tonnes'], '')),
                'annual_cost_savings_cad': parse_number(raw.get(EFF_CSV_COLUMNS['annual_cost_savings_cad'], '')),
                'government_funding_cad': parse_number(raw.get(EFF_CSV_COLUMNS['government_funding_cad'], '')),
                'funding_source': None,
            }

            if not row['project_name'] or not row['company']:
                continue
            rows.append(row)

    return rows


def import_rows(client: Client, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        print("No efficiency project rows to import")
        return

    print(f"Importing {len(rows)} efficiency project rows...")
    batch_size = 500
    imported = 0

    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        try:
            client.table('efficiency_projects').upsert(batch).execute()
            imported += len(batch)
            print(f"  Batch {i // batch_size + 1}: {len(batch)} rows")
        except Exception as e:
            print(f"  Error importing batch {i // batch_size + 1}: {e}")

    print(f"Imported {imported} efficiency project rows")


def main() -> None:
    parser = argparse.ArgumentParser(description='Import efficiency projects CSV into efficiency_projects')
    parser.add_argument('--csv', required=True, help='Path to efficiency projects CSV')
    args = parser.parse_args()

    if not os.path.exists(args.csv):
        print(f"CSV file not found: {args.csv}")
        sys.exit(1)

    rows = load_rows(args.csv)
    client = get_client()
    import_rows(client, rows)


if __name__ == '__main__':
    main()
