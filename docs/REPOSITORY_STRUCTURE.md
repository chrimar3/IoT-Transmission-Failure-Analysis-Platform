# Repository Structure

## Overview
This document describes the final organized structure of the CU-BEMS IoT Platform repository, following Next.js 14 and industry best practices.

## Directory Structure

```
cu-bems-platform/
├── app/                        # Next.js 14 App Router
│   ├── api/                    # API routes
│   ├── dashboard/              # Dashboard pages
│   ├── bmad/                   # BMAD integration page
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
│
├── components/                 # Shared React components
│   ├── ui/                     # UI primitives (cards, buttons, etc.)
│   ├── patterns/               # Pattern detection components
│   ├── alerts/                 # Alert configuration components
│   └── export/                 # Export dialog components
│
├── lib/                        # Core business logic
│   ├── algorithms/             # Statistical & ML algorithms
│   ├── alerts/                 # Alert system logic
│   ├── api/                    # API utilities
│   ├── auth/                   # Authentication utilities
│   ├── database/               # Database connection & utils
│   ├── export/                 # Export functionality
│   ├── middleware/             # Custom middleware
│   ├── services/               # Business services
│   └── stripe/                 # Stripe integration
│
├── hooks/                      # Custom React hooks
│   ├── useReports.ts
│   └── ...
│
├── types/                      # TypeScript type definitions
│   ├── analytics.ts
│   ├── dashboard.ts
│   ├── export.ts
│   ├── patterns.ts
│   └── alerts.ts
│
├── tests/                      # All test files
│   ├── __mocks__/              # Test mocks
│   ├── integration/            # Integration tests
│   ├── unit/                   # Unit tests
│   ├── e2e/                    # End-to-end tests
│   ├── security/               # Security tests
│   ├── performance/            # Performance tests
│   ├── validation/             # Validation tests
│   ├── api/                    # API tests
│   ├── components/             # Component tests
│   ├── hooks/                  # Hook tests
│   ├── algorithms/             # Algorithm tests
│   └── utils/                  # Test utilities
│
├── docs/                       # Documentation
│   ├── api/                    # API documentation
│   ├── guides/                 # User & developer guides
│   ├── architecture/           # Architecture docs
│   ├── reports/                # Implementation reports
│   ├── DEPLOYMENT.md           # Deployment guide
│   ├── API.md                  # API reference
│   ├── TESTING.md              # Testing guide
│   ├── TROUBLESHOOTING.md      # Troubleshooting guide
│   └── PROJECT_SUMMARY.md      # Project overview
│
├── scripts/                    # Build & deployment scripts
│   ├── utils/                  # Utility scripts
│   ├── domain/                 # Domain setup scripts
│   ├── analyze-bangkok-data.ts
│   ├── validate-*.js
│   └── quality-monitoring.sh
│
├── config/                     # Additional configuration
│   ├── database/               # SQL schemas
│   ├── domain/                 # Domain configuration
│   └── environment/            # Environment configs
│
├── tools/                      # Development tools
│   ├── deployment/             # Deployment utilities
│   ├── build/                  # Build tools
│   └── generators/             # Code generators
│
├── middleware/                 # Next.js middleware
│   └── security-headers.ts
│
├── public/                     # Static assets
│
├── data/                       # Data files
│
├── assets/                     # Project assets
│
├── qa/                         # Quality assurance
│
├── .github/                    # GitHub configuration
│   ├── workflows/              # CI/CD workflows
│   └── ISSUE_TEMPLATE/         # Issue templates
│
├── .vscode/                    # VS Code settings
│
├── babel.config.js             # Babel configuration
├── jest.config.js              # Jest configuration
├── jest.setup.js               # Jest setup
├── jest.d.ts                   # Jest type definitions
├── next.config.js              # Next.js configuration
├── postcss.config.js           # PostCSS configuration
├── tailwind.config.js          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
├── middleware.ts               # Next.js middleware entry
├── vercel.json                 # Vercel configuration
├── docker-compose.yml          # Docker Compose
├── Dockerfile                  # Docker image
├── package.json                # Dependencies
├── package-lock.json           # Lock file
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── README.md                   # Project README
├── CHANGELOG.md                # Version history
├── LICENSE                     # MIT License
├── CONTRIBUTING.md             # Contribution guide
├── SECURITY.md                 # Security policy
└── SUPPORT.md                  # Support information
```

## Import Path Mappings

The project uses TypeScript path aliases for clean imports:

```typescript
// Core utilities and business logic
import { supabase } from '@/lib/supabase'

// React components
import { Card } from '@/components/ui/card'

// Custom hooks
import { useReports } from '@/hooks/useReports'

// Type definitions
import type { DashboardData } from '@/types/dashboard'

// App Router pages/layouts
import Layout from '@/app/layout'

// Configuration
import dbConfig from '@/config/database/core'
```

## Configuration Files

### Root Level Config Files
- `babel.config.js` - Babel transpiler configuration
- `jest.config.js` - Test runner configuration
- `jest.setup.js` - Jest global setup
- `next.config.js` - Next.js framework configuration
- `postcss.config.js` - CSS processing configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript compiler configuration

### Config Directory
- `config/database/` - SQL schemas and migrations
- `config/domain/` - Domain-specific configurations
- `config/environment/` - Environment-specific settings

## Test Organization

All tests are located in the `tests/` directory, organized by type:

- **Unit Tests** (`tests/unit/`) - Individual function/module tests
- **Integration Tests** (`tests/integration/`) - Multi-component integration
- **E2E Tests** (`tests/e2e/`) - Full user flow tests
- **Security Tests** (`tests/security/`) - Security validation
- **Performance Tests** (`tests/performance/`) - Load & performance tests
- **API Tests** (`tests/api/`) - API endpoint tests
- **Component Tests** (`tests/components/`) - React component tests

### Test Utilities
- `tests/__mocks__/` - Mock implementations
- `tests/utils/` - Test helpers and factories

## Documentation Organization

All documentation is in the `docs/` directory:

### User Documentation
- `docs/guides/` - Step-by-step guides
- `docs/DEPLOYMENT.md` - Deployment instructions
- `docs/TROUBLESHOOTING.md` - Common issues & solutions

### Developer Documentation
- `docs/architecture/` - Architecture & design docs
- `docs/API.md` - API reference
- `docs/TESTING.md` - Testing strategy
- `docs/PROJECT_SUMMARY.md` - Project overview

### Technical Reports
- `docs/reports/` - Implementation & analysis reports

## Scripts Organization

Development and deployment scripts are in `scripts/`:

- `scripts/utils/` - Utility scripts (linting fixes, etc.)
- `scripts/domain/` - Domain setup scripts
- `scripts/validate-*.js` - Validation scripts
- `scripts/quality-monitoring.sh` - QA monitoring

## Key Improvements

### Before Reorganization
- ❌ 98+ items in root directory
- ❌ Duplicate `lib/` and `src/lib/` directories
- ❌ Tests scattered in `__tests__/` and subdirectories
- ❌ Documentation files mixed with source code
- ❌ Utility scripts in root directory
- ❌ Inconsistent import paths

### After Reorganization
- ✅ 36 items in root directory (clean)
- ✅ Single `lib/` directory for all business logic
- ✅ All tests centralized in `tests/` directory
- ✅ Documentation organized in `docs/` with subdirectories
- ✅ Utility scripts in `scripts/utils/`
- ✅ Consistent path aliases (`@/lib`, `@/components`, etc.)
- ✅ Industry-standard Next.js 14 structure
- ✅ Easier navigation and onboarding
- ✅ Improved IDE performance

## Benefits

1. **Clean Root Directory**: Only essential config files and main folders
2. **Clear Separation of Concerns**: Source, tests, docs, scripts separated
3. **Consistent Imports**: Path aliases work across the entire codebase
4. **Better Developer Experience**: Easy to find files, understand structure
5. **Industry Standard**: Follows Next.js 14 and React best practices
6. **Scalable**: Structure supports future growth
7. **Professional**: Matches expectations of enterprise projects

## Migration Notes

### Path Updates
All import paths have been updated to use the new structure:
- `@/__mocks__/*` → `tests/__mocks__/*` (in test files)
- `@/src/lib/*` → `@/lib/*`
- `@/src/components/*` → `@/components/*`
- `@/src/hooks/*` → `@/hooks/*`
- `@/src/types/*` → `@/types/*`

### Configuration Updates
- `jest.config.js` - Updated test paths to `tests/**`
- `tsconfig.json` - Removed `src/` from path mappings
- Test mocks moved to `tests/__mocks__/`

### Removed Items
- Temporary files (`lint_output.txt`, `test-output.log`)
- Build artifacts (`tsconfig.tsbuildinfo`)
- Duplicate config files
- Old `src/` directory
- Old `__tests__/` directory
- Utility scripts from root

## Maintenance

To maintain this structure:

1. **New Components**: Add to `components/` (not `src/components/`)
2. **New Tests**: Add to appropriate `tests/` subdirectory
3. **New Docs**: Add to appropriate `docs/` subdirectory
4. **New Scripts**: Add to `scripts/utils/` or appropriate subfolder
5. **Use Path Aliases**: Always use `@/` imports, never relative paths for shared code

## Verification

To verify the structure is working:

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Tests
npm test

# Build
npm run build
```

All commands should work with the new structure.
