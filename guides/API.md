# Nyuchi Platform API Documentation

## Overview

The Nyuchi Platform API provides programmatic access to manage WordPress sites, SEO data, and analytics.

**Base URL:** `https://api.nyuchi.com/v1`

## Authentication

All API requests require authentication using API keys:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.nyuchi.com/v1/sites
```

## Endpoints

### Sites Management

#### List Sites
```http
GET /sites
```

#### Add Site
```http
POST /sites
Content-Type: application/json

{
  "domain": "example.com",
  "site_name": "Example Site"
}
```

#### Get Site Details
```http
GET /sites/{site_id}
```

### SEO Operations

#### Analyze Content
```http
POST /seo/analyze
Content-Type: application/json

{
  "site_id": "uuid",
  "content": "Content to analyze"
}
```

#### Get SEO Reports
```http
GET /seo/reports?site_id={site_id}&period=30d
```

## Rate Limits

- **Free Plan:** 1,000 requests/month
- **Starter Plan:** 10,000 requests/month  
- **Professional Plan:** 100,000 requests/month
- **Enterprise Plan:** Unlimited

## Error Handling

All errors return JSON with error details:

```json
{
  "error": "Invalid API key",
  "code": "INVALID_AUTH",
  "status": 401
}
```

## SDKs

- **PHP SDK:** Available for WordPress integration
- **JavaScript SDK:** For web applications
- **Python SDK:** For data analysis and automation

### **Sponsor Development**
Support ongoing development and new features:
- 💖 [GitHub Sponsors](https://github.com/sponsors/bryanfawcett)
- ☕ [Buy me a coffee](https://buymeacoffee.com/bryany)
- 🏢 [Professional services](https://nyuchi.com)

**📧 Contact:**
- **Website**: [https://nyuchi.com](https://nyuchi.com)
- **GitHub**: [https://github.com/nyuchitech](https://github.com/nyuchitech)
- **Email**: [hello@nyuchi.com](mailto:hello@nyuchi.com)
