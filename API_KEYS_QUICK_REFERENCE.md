# API Keys Quick Reference

## Required API Keys for Renewable Energy Optimization

### 1. OpenWeatherMap (Primary Weather Source)

**Sign Up**: https://openweathermap.org/api  
**Get API Key**: https://home.openweathermap.org/api_keys  
**Free Tier**: 1,000 calls/day (sufficient for development)  
**Paid Tier**: $40/month for 100,000 calls/day (for production)

**Environment Variable**:
```bash
VITE_OPENWEATHERMAP_API_KEY=your_key_here
```

**Usage in Code**:
```typescript
// Automatically used in weatherService.ts
const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
```

**API Endpoint**:
```
https://api.openweathermap.org/data/3.0/onecall?lat={lat}&lon={lon}&appid={API_KEY}
```

---

### 2. Environment Canada (Backup Weather Source)

**URL**: https://api.weather.gc.ca/  
**Documentation**: https://eccc-msc.github.io/open-data/msc-data/obs_station/readme_obs_insitu_en/  
**Cost**: FREE (government API)  
**Rate Limit**: Unspecified, but reasonable usage expected

**No API Key Required** ✅

**API Endpoint**:
```
https://api.weather.gc.ca/observations?lat={lat}&lon={lon}
```

---

### 3. WeatherAPI.com (Optional Alternative)

**Sign Up**: https://www.weatherapi.com/  
**Get API Key**: https://www.weatherapi.com/my/  
**Free Tier**: 1 million calls/month  
**Paid Tier**: $4/month for 10 million calls

**Environment Variable**:
```bash
VITE_WEATHERAPI_KEY=your_key_here
```

**API Endpoint**:
```
https://api.weatherapi.com/v1/current.json?key={API_KEY}&q={lat},{lon}
```

---

## Supabase Configuration (Already Set Up)

**Environment Variables**:
```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Find Your Keys**:
1. Go to https://app.supabase.com/project/YOUR_PROJECT/settings/api
2. Copy "Project URL" → `VITE_SUPABASE_URL`
3. Copy "anon public" key → `VITE_SUPABASE_ANON_KEY`

---

## Feature Flags

**Enable renewable optimization features**:
```bash
VITE_ENABLE_RENEWABLE_OPTIMIZATION=true
VITE_ENABLE_EDGE_FETCH=true
```

---

## Complete .env.local Template

```bash
# Supabase (Core Platform)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Weather APIs (For Renewable Forecasting)
VITE_OPENWEATHERMAP_API_KEY=your_openweathermap_key_here
VITE_WEATHERAPI_KEY=your_weatherapi_key_here (optional)

# Feature Flags
VITE_ENABLE_RENEWABLE_OPTIMIZATION=true
VITE_ENABLE_EDGE_FETCH=true

# Optional: LLM API (if using external LLM)
VITE_OPENAI_API_KEY=your_openai_key_here (optional)
```

---

## Deployment Checklist

- [ ] Sign up for OpenWeatherMap (5 minutes)
- [ ] Add `VITE_OPENWEATHERMAP_API_KEY` to `.env.local`
- [ ] Verify Supabase keys are present
- [ ] Push database migrations: `supabase db push`
- [ ] Deploy Edge Functions: `supabase functions deploy api-v2-renewable-forecast`
- [ ] Test locally: `npm run dev`
- [ ] Navigate to: http://localhost:5173/renewable-optimization

---

## Testing Your Setup

### Test 1: Weather API

```bash
# Test OpenWeatherMap
curl "https://api.openweathermap.org/data/3.0/onecall?lat=43.65&lon=-79.38&appid=YOUR_KEY&exclude=minutely,hourly,daily,alerts"
```

Expected: JSON response with current weather

### Test 2: Forecast Generation

```typescript
import { generateRenewableForecast } from './src/lib/renewableForecastEngine';

const forecast = await generateRenewableForecast({
  province: 'ON',
  sourceType: 'solar',
  horizonHours: 24,
  fetchWeather: true,
});

console.log(forecast);
```

Expected: Forecast object with predicted_output_mw

### Test 3: Edge Function

```bash
curl "https://YOUR_PROJECT.supabase.co/functions/v1/api-v2-renewable-forecast?province=ON&source_type=solar&horizon_hours=24" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Expected: JSON with forecasts array

---

## Cost Estimates

### Development (Free Tier)

- OpenWeatherMap: **FREE** (1,000 calls/day)
- Environment Canada: **FREE** (unlimited)
- Supabase: **FREE** (500MB database, 2GB bandwidth)
- **Total**: $0/month

### Production (Recommended)

- OpenWeatherMap Pro: **$40/month** (100,000 calls/day)
- Supabase Pro: **$25/month** (8GB database, 100GB bandwidth)
- **Total**: $65/month

### Scale Estimate

- 13 provinces × 15-minute updates = 52 calls/hour
- 52 × 24 hours = 1,248 calls/day
- **Within free tier** ✅ for first 6 months

---

## Troubleshooting

### Error: "Weather API key not configured"

**Solution**: Add to `.env.local`:
```bash
VITE_OPENWEATHERMAP_API_KEY=your_key_here
```

Restart dev server: `npm run dev`

### Error: "Failed to fetch weather"

**Check**:
1. API key is valid (test with curl)
2. Not exceeding rate limit (1,000/day for free)
3. Network connectivity

**Fallback**: System will use Environment Canada automatically

### Error: "Supabase connection failed"

**Check**:
1. `VITE_SUPABASE_URL` is correct
2. `VITE_SUPABASE_ANON_KEY` is correct
3. Database migrations applied: `supabase db push`

---

## Support Resources

- **OpenWeatherMap Docs**: https://openweathermap.org/api/one-call-3
- **Environment Canada**: https://eccc-msc.github.io/open-data/
- **Supabase Docs**: https://supabase.com/docs
- **Project Docs**: `/docs/RENEWABLE_OPTIMIZATION_SETUP.md`

---

**Last Updated**: October 9, 2025  
**Next Review**: After production deployment
