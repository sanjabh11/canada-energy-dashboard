#!/usr/bin/env python3
"""
Yahoo Finance ESG Scores Import Script
Fetches ESG scores for Canadian energy companies and imports to Supabase.

This script maps Yahoo's 0–100 ESG score into the esg_ratings table by
populating msci_score_numeric on a 0–10 scale and leaving other vendor-
specific fields nullable. It uses company name as the upsert key.

Usage:
    python scripts/import_yahoo_finance_esg.py

Environment Variables Required:
    SUPABASE_URL: Your Supabase project URL
    SUPABASE_KEY: Your Supabase service role key
"""

import os
import sys
from datetime import datetime
try:
    import yfinance as yf
    from supabase import create_client, Client
except ImportError:
    print("Error: Required packages not installed")
    print("Run: pip install yfinance supabase")
    sys.exit(1)

# Canadian Energy Company Tickers
CANADIAN_ENERGY_TICKERS = [
    'SU.TO',    # Suncor Energy
    'CNQ.TO',   # Canadian Natural Resources
    'IMO.TO',   # Imperial Oil
    'CPX.TO',   # Capital Power
    'TA.TO',    # TransAlta
    'ENB.TO',   # Enbridge
    'CVE.TO',   # Cenovus Energy
    'TRP.TO',   # TC Energy
    'PPL.TO',   # Pembina Pipeline
    'BIR.TO',   # Birchcliff Energy
]

def get_supabase_client() -> Client:
    """Initialize Supabase client"""
    url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')
    
    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_KEY environment variables required")
        sys.exit(1)
    
    return create_client(url, key)

def fetch_esg_scores(ticker: str) -> dict:
    """Fetch ESG scores from Yahoo Finance"""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        sustainability = stock.sustainability
        
        if sustainability is None or sustainability.empty:
            print(f"  ⚠️  No ESG data available for {ticker}")
            return None
        
        # Extract ESG scores from sustainability DataFrame.
        # Yahoo Finance returns ESG data in a DataFrame with specific row indices.
        esg_data = {
            'ticker': ticker,
            'company': info.get('longName', ticker),
            'sector': info.get('sector', 'Energy'),
            'esg_score': None,            # 0–100 overall score
            'environment_score': None,
            'social_score': None,
            'governance_score': None,
            'controversy_level': None,
            'last_updated': datetime.now().isoformat(),
        }
        
        # Try to extract scores (Yahoo Finance format can vary)
        try:
            if 'totalEsg' in sustainability.index:
                esg_data['esg_score'] = float(sustainability.loc['totalEsg'].values[0])
            if 'environmentScore' in sustainability.index:
                esg_data['environment_score'] = float(sustainability.loc['environmentScore'].values[0])
            if 'socialScore' in sustainability.index:
                esg_data['social_score'] = float(sustainability.loc['socialScore'].values[0])
            if 'governanceScore' in sustainability.index:
                esg_data['governance_score'] = float(sustainability.loc['governanceScore'].values[0])
            if 'highestControversy' in sustainability.index:
                esg_data['controversy_level'] = int(sustainability.loc['highestControversy'].values[0])
        except Exception as e:
            print(f"  ⚠️  Error extracting scores for {ticker}: {e}")
        
        return esg_data
    
    except Exception as e:
        print(f"  ❌ Error fetching {ticker}: {e}")
        return None

def transform_to_esg_ratings_rows(esg_records: list) -> list:
    """Transform raw Yahoo ESG data into esg_ratings table rows.

    - Maps esg_score (0–100) -> msci_score_numeric (0–10 scale)
    - Uses company name as the logical key
    - Leaves vendor-specific fields nullable for now
    """
    rating_date = datetime.now().date().isoformat()
    transformed = []

    for rec in esg_records:
        score = rec.get('esg_score')
        msci_numeric = None
        if score is not None:
            try:
                msci_numeric = float(score) / 10.0
            except (TypeError, ValueError):
                msci_numeric = None

        company = rec.get('company') or rec.get('ticker')
        sector_raw = (rec.get('sector') or '').lower()

        # Simple sector mapping into esg_ratings.sector enum
        if 'utility' in sector_raw:
            sector = 'utility'
        elif 'renewable' in sector_raw:
            sector = 'renewable'
        elif 'mining' in sector_raw:
            sector = 'mining'
        else:
            sector = 'oil_gas'

        row = {
            'company': company,
            'sector': sector,
            'msci_score': None,
            'msci_score_numeric': msci_numeric,
            'sustainalytics_risk_score': None,
            'sp_global_score': None,
            'cdp_climate_score': None,
            'rating_date': rating_date,
            'peer_percentile': None,
            'trend': None,
        }
        transformed.append(row)

    return transformed


def import_to_supabase(supabase: Client, esg_rows: list):
    """Import transformed ESG ratings into Supabase esg_ratings table."""
    if not esg_rows:
        print("\n❌ No ESG records to import")
        return

    try:
        # Upsert to esg_ratings table (based on company name)
        supabase.table('esg_ratings').upsert(
            esg_rows,
            on_conflict='company',
        ).execute()

        print(f"\n✅ Successfully imported {len(esg_rows)} ESG records to Supabase (esg_ratings)")

    except Exception as e:
        print(f"\n❌ Error importing to Supabase: {e}")
        print("Make sure the esg_ratings table exists with the expected schema")

def main():
    print("=" * 60)
    print("Yahoo Finance ESG Scores Import")
    print("=" * 60)
    print(f"\nFetching ESG scores for {len(CANADIAN_ENERGY_TICKERS)} Canadian energy companies...")
    print()
    
    # Initialize Supabase client
    supabase = get_supabase_client()
    
    # Fetch raw ESG scores from Yahoo Finance
    esg_records = []
    for ticker in CANADIAN_ENERGY_TICKERS:
        print(f"Fetching {ticker}...")
        esg_data = fetch_esg_scores(ticker)
        if esg_data:
            print(f"  ✓ {esg_data['company']}: ESG={esg_data['esg_score']}")
            esg_records.append(esg_data)

    # Transform into esg_ratings rows and import to Supabase
    if esg_records:
        esg_rows = transform_to_esg_ratings_rows(esg_records)
        import_to_supabase(supabase, esg_rows)

        print("\nSummary:")
        print(f"  Total tickers: {len(CANADIAN_ENERGY_TICKERS)}")
        print(f"  Successful imports: {len(esg_rows)}")
        print(f"  Failed (no ESG data): {len(CANADIAN_ENERGY_TICKERS) - len(esg_records)}")
    else:
        print("\n❌ No ESG data was successfully fetched")
    
    print("\n" + "=" * 60)

if __name__ == '__main__':
    main()
