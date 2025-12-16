# ESG & Industrial Decarb API

This document describes how to access the **Sustainable Finance & ESG** and **Industrial Decarbonization** data via Supabase Edge Functions.

The APIs are designed for:
- quick prototypes and research notebooks
- sponsor demos and what-if analysis
- classroom / training use

For production integrations, add your own rate limiting and monitoring on top.

---

## 1. Base URL & Authentication

### 1.1 Base URL

The Edge Functions base URL is:

```text
{SUPABASE_URL}/functions/v1
```

In a production Supabase project this typically looks like:

```text
https://<project-ref>.functions.supabase.co
```

### 1.2 API Keys

These endpoints expect an API key in either header:

- `apikey: YOUR_API_KEY`
- `Authorization: Bearer YOUR_API_KEY`

There are two typical key types:

- **Anon key (front-end):**
  - The Vite app uses `VITE_SUPABASE_ANON_KEY`.
  - This key is sufficient for the first‑party dashboard and for low‑risk experiments.
- **Named API keys (`api_keys` table):**
  - For sponsors / external consumers, create dedicated keys in the `api_keys` table with:
    - `label`
    - `api_key` (random string)
    - `is_active`, `expires_at`
  - The ESG and Industrial Edge Functions validate incoming keys against this table (after first checking the configured anon key).

> Never hard‑code real keys in public repos or client JavaScript. Use environment variables or server‑side secrets.

---

## 2. ESG Finance API

**Endpoint:**

```text
GET /api-v2-esg-finance
```

**Query parameters:**

- `type` (optional, default `overview`)
  - `overview`
  - `green_bonds`
  - `esg_ratings`
  - `sustainability_loans`
  - `carbon_exposure`
- `company` (optional): filter by company name.
- `sector` (optional): filter by sector on supported types.

### 2.1 Examples

**Overview summary:**

```bash
curl "https://<project-ref>.functions.supabase.co/api-v2-esg-finance?type=overview" \
  -H "apikey: YOUR_API_KEY"
```

**ESG ratings for a single company:**

```bash
curl "https://<project-ref>.functions.supabase.co/api-v2-esg-finance?type=esg_ratings&company=Enbridge%20Inc" \
  -H "apikey: YOUR_API_KEY"
```

**Green bonds table:**

```bash
curl "https://<project-ref>.functions.supabase.co/api-v2-esg-finance?type=green_bonds" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

The JSON response matches what the dashboard expects:

- `overview`: `{ summary: { ... }, top_performers: [...], highest_carbon_exposure: [...] }`
- tables: `{ rows: [...] }`

---

## 3. Industrial Decarbonization API

**Endpoint:**

```text
GET /api-v2-industrial-decarb
```

**Query parameters:**

- `type` (optional, default `overview`)
  - `overview`
  - `facility_emissions`
  - `methane_reduction`
  - `obps_compliance`
  - `efficiency_projects`
- `province` (optional): 2‑letter province code (e.g. `AB`, `BC`).
- `year` (optional): reporting year (e.g. `2021`).
- `company` (optional): filter by operator/company.
- `sector` (optional): filter by sector.
- `facility` (optional): facility name (for OBPS).
- `project_type` (optional): filter efficiency projects.

### 3.1 Examples

**Overview summary:**

```bash
curl "https://<project-ref>.functions.supabase.co/api-v2-industrial-decarb?type=overview" \
  -H "apikey: YOUR_API_KEY"
```

**Top emitting facilities in Alberta, 2021:**

```bash
curl "https://<project-ref>.functions.supabase.co/api-v2-industrial-decarb?type=facility_emissions&province=AB&year=2021" \
  -H "apikey: YOUR_API_KEY"
```

**OBPS compliance records for a single facility:**

```bash
curl "https://<project-ref>.functions.supabase.co/api-v2-industrial-decarb?type=obps_compliance&facility=Suncor%20Base%20Plant" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Responses follow the same pattern as the dashboard:

- `overview`: `{ summary: { ... }, top_facilities: [...], methane_leaders: [...], top_efficiency_projects: [...] }`
- tables: `{ rows: [...] }`

---

## 4. Rate Limiting & Usage Logs

A generic `api_usage` table exists for logging and rate‑limit analysis. The ESG and Industrial Edge Functions now write into this table and apply lightweight protections:

- Per‑request logs for:
  - `api-v2-esg-finance`
  - `api-v2-industrial-decarb`
- Fields captured: endpoint, method, status code, API key (if present), IP address, response time, and a small `extra` JSON payload (e.g., `type`, `province`, `company`).
- Simple per‑client rate limiting for `api-v2-esg-finance` using an in‑memory window (sufficient for Supabase Edge scale) and standard `X-RateLimit-*` headers.

If you plan to front these APIs with your own gateway, you can still layer additional controls on top:

1. Use the `api_usage` table for request/second limits and anomaly detection (e.g., scrapers).
2. Apply stricter per‑key or per‑IP thresholds before serving heavy queries.

---

## 5. Safety & Governance Notes

- Keep the **anon key** scoped to read‑only tables and public dashboards.
- Use **`api_keys`** for external consumers, with `is_active` + `expires_at` to quickly rotate or revoke.
- For regulatory or investment‑critical analysis, always cross‑check dashboard/API values against NPRI, OBPS reports, and issuer filings.
