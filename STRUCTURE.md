# 📁 Repository Structure

This document describes the organized structure of the CU-BEMS IoT Transmission Failure Analysis Platform repository.

## 🏗️ Directory Structure

```
├── app/                          # Next.js 14 App Router (Pages & API Routes)
│   ├── api/                      # API endpoints
│   │   ├── health/               # Health check endpoint
│   │   ├── insights/             # Business insights API
│   │   └── readings/             # Sensor data API endpoints
│   ├── dashboard/                # Analytics dashboard pages
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout component
│   └── page.tsx                  # Landing page
│
├── components/                   # Reusable React components
│   ├── ui/                       # UI components (buttons, cards, etc.)
│   ├── charts/                   # Data visualization components
│   ├── forms/                    # Form components
│   └── Navigation.tsx            # Main navigation component
│
├── lib/                          # Shared utilities and configurations
│   ├── types/                    # TypeScript type definitions
│   │   ├── api.ts                # API types
│   │   └── database.ts           # Database types
│   ├── utils/                    # Utility functions
│   ├── hooks/                    # Custom React hooks
│   ├── middleware/               # Next.js middleware
│   ├── insight-engine.ts         # Business logic for insights
│   ├── r2-client.ts              # Cloudflare R2 client
│   ├── supabase.ts               # Supabase client
│   └── supabase-server.ts        # Server-side Supabase client
│
├── tests/                        # Test files organized by type
│   ├── unit/                     # Unit tests (individual functions)
│   ├── integration/              # Integration tests (API endpoints)
│   └── e2e/                      # End-to-end tests (user workflows)
│
├── docs/                         # Project documentation
│   ├── api/                      # API documentation
│   ├── architecture/             # System architecture docs
│   ├── business/                 # Business requirements
│   ├── deployment/               # Deployment guides
│   ├── epics/                    # Epic-based project planning
│   ├── qa/                       # Quality assurance documentation
│   └── testing/                  # Testing strategies
│
├── config/                       # Configuration files
│   ├── database/                 # Database schemas and migrations
│   │   ├── 001-core-schema.sql   # Core database schema
│   │   ├── 002-materialized-views.sql
│   │   └── 003-rls-policies.sql
│   └── environment/              # Environment configurations
│
├── scripts/                      # Build and deployment scripts
│   ├── build/                    # Build scripts
│   ├── deploy/                   # Deployment scripts
│   └── dev/                      # Development scripts
│
├── tools/                        # Development tools
│   ├── generators/               # Code generators
│   └── validators/               # Data validators
│
├── .github/                      # GitHub configurations
│   └── workflows/                # CI/CD workflows
│       └── ci.yml                # Main CI/CD pipeline
│
└── Root Files
    ├── README.md                 # Project overview
    ├── CONTRIBUTING.md           # Contribution guidelines
    ├── SECURITY.md               # Security policy
    ├── LICENSE                   # MIT license
    ├── package.json              # Node.js dependencies
    ├── next.config.js            # Next.js configuration
    ├── tailwind.config.js        # Tailwind CSS configuration
    ├── tsconfig.json             # TypeScript configuration
    ├── jest.config.js            # Jest testing configuration
    └── requirements.txt          # Python dependencies
```

## 📋 Directory Guidelines

### `/app` - Next.js App Router
- **Purpose**: Pages and API routes using Next.js 14 App Router
- **Structure**: Follows Next.js file-based routing conventions
- **Co-location**: Test files placed in `__tests__/` subdirectories

### `/components` - React Components
- **Purpose**: Reusable UI components
- **Organization**: Grouped by functionality (ui, charts, forms)
- **Naming**: PascalCase for component files

### `/lib` - Shared Code
- **Purpose**: Business logic, utilities, and shared configurations
- **Subfolders**:
  - `types/`: TypeScript definitions
  - `utils/`: Helper functions
  - `hooks/`: Custom React hooks
  - `middleware/`: Next.js middleware

### `/tests` - Testing
- **Purpose**: All test files organized by test type
- **Structure**:
  - `unit/`: Individual function testing
  - `integration/`: API endpoint testing
  - `e2e/`: Full user workflow testing

### `/docs` - Documentation
- **Purpose**: Comprehensive project documentation
- **Organization**: By domain (architecture, business, deployment)

### `/config` - Configuration
- **Purpose**: Database schemas, environment configs
- **Database**: SQL files for schema management
- **Environment**: Configuration templates

### `/scripts` - Automation
- **Purpose**: Build, deployment, and development scripts
- **Organization**: By purpose (build, deploy, dev)

### `/tools` - Development Tools
- **Purpose**: Custom development utilities
- **Examples**: Code generators, data validators

## 🔄 Migration from Old Structure

### Changes Made:
1. **Consolidated** `src/` and root-level code organization
2. **Moved** scattered test files to `/tests` directory
3. **Reorganized** database files to `/config/database`
4. **Centralized** utilities in `/lib`
5. **Cleaned up** duplicate directory structures

### Import Path Updates:
- `src/lib/*` → `lib/*`
- `src/types/*` → `lib/types/*`
- `src/components/*` → `components/*`

## ✅ Best Practices Implemented

1. **Clear Separation of Concerns**: Each directory has a specific purpose
2. **Co-location**: Tests near their corresponding code
3. **Consistent Naming**: PascalCase for components, camelCase for utilities
4. **Scalable Structure**: Easy to navigate and extend
5. **Framework Conventions**: Follows Next.js 14 best practices
6. **Documentation**: Each major directory documented

## 🚀 Next Steps

1. **Component Library**: Organize components into a design system
2. **API Versioning**: Add versioning strategy to API routes
3. **Testing Strategy**: Expand test coverage across all directories
4. **Documentation**: Add README files to each major directory

This structure follows industry best practices for Next.js applications and scales well for enterprise development.