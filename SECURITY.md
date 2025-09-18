# Security Policy

## Overview
This document outlines the security measures implemented in the Canada Energy Intelligence Platform (CEIP).

## Security Headers
Production security headers are configured in `public/_headers` for Netlify deployment:
- **Content Security Policy (CSP)**: Restricts resource loading to prevent XSS
- **Strict Transport Security (HSTS)**: Forces HTTPS connections
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **Referrer Policy**: Controls referrer information leakage
- **Permissions Policy**: Disables unnecessary browser features

## Client-Side Security
- HTML sanitization using DOMPurify for any dynamic content
- Environment variables properly scoped (VITE_ prefix for client-safe vars)
- No eval() or Function() constructors used
- Proper CORS handling for API requests

## Data Protection
- Local storage used for client-side data persistence
- No sensitive credentials in client code
- Service role keys only in server-side Edge Functions
- All .env files ignored in git

## API Security
- Request timeouts implemented (15s default)
- AbortController for request cancellation
- Rate limiting on server endpoints
- Input validation and sanitization

## Vulnerability Reporting
Report security issues to: [your-security-email]
Include: steps to reproduce, affected components, potential impact

## Security Checklist
✅ CSP headers configured
✅ HSTS enabled
✅ HTML sanitization implemented
✅ Environment secrets protected
✅ Request timeouts configured
✅ No dangerous JavaScript patterns
✅ Proper CORS configuration
✅ Input validation in place

Last Updated: 2025-09-18
