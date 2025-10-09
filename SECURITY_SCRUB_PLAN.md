# Security Scrub Plan

## Objective
Remove hard-coded secrets from documentation and source files, and replace them with placeholders.

## Checklist

1. Identify files containing secrets using keyword search.
2. Replace secret values with placeholders (e.g., `TODO_SUPABASE_ANON_KEY`).
3. Update documentation to reference `.env.example` instead of real keys.
4. Commit scrubbing changes and push to GitHub.
5. Rotate keys in Supabase/Netlify (outside of repository).
