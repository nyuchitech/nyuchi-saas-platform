# Nyuchi Platform Documentation

This folder contains all the technical documentation and guides for the Nyuchi Platform - a secure, enterprise-grade SaaS platform built with Astro, Cloudflare, and Supabase.

## 📚 Available Guides

### 🔒 Security & Architecture
- **[Security Audit & Fixes](./SECURITY_AUDIT_AND_FIXES.md)** - Comprehensive security review and enterprise-grade fixes
- **[Role-Based Access Control](./ROLE_BASED_ACCESS_CONTROL.md)** - RBAC system with 5-tier hierarchy and granular permissions
- **[API Documentation](./API.md)** - Secure API endpoints with validation and authentication

### 🏗️ Setup & Development
- **[Installation Guide](./INSTALLATION.md)** - Step-by-step setup instructions
- **[Dashboard & API Implementation](./DASHBOARD_AND_API_IMPLEMENTATION.md)** - User dashboards and product API endpoints
- **[Contributing Guidelines](./CONTRIBUTING.md)** - Development workflow and contribution standards

## 🎯 Quick Start

1. **🚀 New to the project?** Start with [Installation Guide](./INSTALLATION.md)
2. **🔒 Security focused?** Read [Security Audit & Fixes](./SECURITY_AUDIT_AND_FIXES.md)
3. **👥 Setting up access control?** Check [Role-Based Access Control](./ROLE_BASED_ACCESS_CONTROL.md)
4. **🔌 Building with APIs?** See [API Documentation](./API.md)
5. **🤝 Ready to contribute?** Follow [Contributing Guidelines](./CONTRIBUTING.md)

## 🏗️ Current Architecture

```
Mail-Organizer/
├── guides/                          # 📚 Documentation (this folder)
│   ├── README.md                   # This index
│   ├── SECURITY_AUDIT_AND_FIXES.md
│   ├── ROLE_BASED_ACCESS_CONTROL.md
│   ├── DASHBOARD_AND_API_IMPLEMENTATION.md
│   ├── INSTALLATION.md
│   ├── API.md
│   └── CONTRIBUTING.md
├── src/                            # Astro application source
│   ├── pages/                      # Routes and API endpoints
│   │   ├── api/                   # Secure API with validation
│   │   ├── dashboard/             # User dashboards
│   │   └── admin/                 # Admin interface
│   ├── lib/                        # Security & validation utilities
│   └── components/                 # Reusable UI components
├── database/                       # Unified database architecture
│   ├── clients/                   # Database clients (Supabase, D1)
│   ├── migrations/                # Database migrations
│   └── config.ts                  # Secure environment config
├── packages/                       # Shared packages and extensions
│   ├── gmail-tabs-extension/      # Chrome extension
│   ├── ui/                        # UI components
│   └── wordpress-plugin/          # WordPress integration
├── env.example                     # Environment template (SECURE)
├── wrangler.toml                   # Cloudflare configuration
└── README.md                       # Main project overview
```

## 🔒 Security Features

The platform implements enterprise-grade security:

- ✅ **Input Validation**: Comprehensive Zod schemas and sanitization
- ✅ **Rate Limiting**: Multi-tier protection (auth, API, admin, uploads)
- ✅ **Security Headers**: CSP, CORS, XSS protection
- ✅ **RBAC System**: 5-tier role hierarchy with granular permissions
- ✅ **Audit Logging**: Complete admin action tracking
- ✅ **Environment Security**: Validated configuration with secret protection

## 🔗 Related Links

- **Main Project**: [README.md](../README.md)
- **Live Site**: [https://nyuchi.com](https://nyuchi.com)
- **Support**: [hello@nyuchi.com](mailto:hello@nyuchi.com)

---

**⚠️ Security Notice**: This platform has undergone comprehensive security auditing. See [Security Audit & Fixes](./SECURITY_AUDIT_AND_FIXES.md) for details.

**Need help?** Contact us at [hello@nyuchi.com](mailto:hello@nyuchi.com) or check the [Installation Guide](./INSTALLATION.md) for setup instructions.
