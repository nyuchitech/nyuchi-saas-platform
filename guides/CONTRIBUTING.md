# Contributing to Nyuchi Platform

Thank you for your interest in contributing to Nyuchi Platform! This document provides guidelines for contributors.

## 🤝 How to Contribute

We welcome contributions in many forms:

- 🐛 **Bug reports and fixes**
- ✨ **New features and enhancements**
- 📖 **Documentation improvements**
- 🧪 **Testing and quality assurance**
- 🌐 **Translations**
- 💡 **Ideas and feature requests**

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase CLI** installed globally
- **Git** for version control
- **WordPress** development environment (for plugin work)

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/nyuchi-platform.git
   cd nyuchi-platform
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

5. **Start development servers**:
   ```bash
   npm run dev
   ```

## 📝 Development Guidelines

### Code Style

- **TypeScript**: Use TypeScript for all new code
- **ESLint**: Follow the project's ESLint configuration
- **Prettier**: Format code with Prettier
- **Naming**: Use descriptive variable and function names

### Commit Messages

Follow conventional commit format:
```
feat: add new SEO analysis feature
fix: resolve API authentication issue
docs: update installation instructions
style: format code with prettier
refactor: improve database query performance
test: add unit tests for API client
