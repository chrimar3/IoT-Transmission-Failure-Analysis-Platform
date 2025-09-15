# Source Tree Structure - CU-BEMS IoT Platform

## Project Directory Structure

```
CU-BEMS IoT Transmission Failure Analysis Platform/
├── .bmad-core/                    # BMAD framework configuration
│   ├── agents/                    # AI agent definitions
│   ├── checklists/               # Quality assurance checklists
│   ├── core-config.yaml          # BMAD configuration
│   └── tasks/                    # Automated task definitions
│
├── docs/                         # Project documentation
│   ├── architecture/             # Architecture documentation
│   │   ├── coding-standards.md   # Development standards
│   │   ├── tech-stack.md         # Technology stack details
│   │   └── source-tree.md        # This file
│   ├── stories/                  # Epic and story definitions
│   │   ├── epic-1-core-data-foundation.md
│   │   ├── epic-2-authentication-subscriptions.md
│   │   ├── epic-3-core-analytics-dashboard.md
│   │   └── epic-4-mvp-completion.md
│   ├── prd.md                    # Product Requirements Document
│   └── architecture.md           # System architecture overview
│
├── CU-BEMS dataset/              # Bangkok dataset files
│   ├── 2018_energy_data.csv     # 2018 sensor data (215MB)
│   ├── 2019_energy_data.csv     # 2019 sensor data (483MB)
│   └── metadata/                 # Dataset metadata files
│
├── src/                          # Application source code
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # Authentication pages
│   │   ├── api/                 # API endpoints
│   │   │   ├── auth/            # NextAuth.js configuration
│   │   │   ├── analytics/       # Analytics API endpoints
│   │   │   ├── subscription/    # Stripe integration endpoints
│   │   │   └── export/          # Data export endpoints
│   │   ├── dashboard/           # Protected dashboard pages
│   │   ├── globals.css          # Global styles
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Landing page
│   │
│   ├── components/              # React components
│   │   ├── ui/                  # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Chart.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── features/            # Feature-specific components
│   │   │   ├── analytics/       # Analytics dashboard components
│   │   │   ├── auth/            # Authentication components
│   │   │   └── subscription/    # Subscription management components
│   │   └── layout/              # Layout components
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Footer.tsx
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAnalytics.ts     # Analytics data management
│   │   ├── useAuth.ts          # Authentication state
│   │   ├── useSubscription.ts  # Subscription status
│   │   └── useLocalStorage.ts  # Local storage utilities
│   │
│   ├── lib/                     # Utility functions and configurations
│   │   ├── auth.ts             # NextAuth.js configuration
│   │   ├── database.ts         # Supabase client configuration
│   │   ├── stripe.ts           # Stripe client configuration
│   │   ├── utils.ts            # General utility functions
│   │   ├── validations.ts      # Zod validation schemas
│   │   └── constants.ts        # Application constants
│   │
│   ├── types/                   # TypeScript type definitions
│   │   ├── database.ts         # Database schema types
│   │   ├── auth.ts             # Authentication types
│   │   ├── analytics.ts        # Analytics data types
│   │   └── subscription.ts     # Subscription types
│   │
│   └── middleware.ts            # Next.js middleware for auth/routing
│
├── scripts/                     # Data processing and deployment scripts
│   ├── process-dataset.js       # Bangkok dataset processing
│   ├── setup-database.js       # Database schema setup
│   ├── validate-data.js        # Data integrity validation
│   └── deploy.sh               # Deployment script
│
├── __tests__/                   # Test files
│   ├── components/             # Component tests
│   ├── hooks/                  # Hook tests
│   ├── api/                    # API endpoint tests
│   ├── lib/                    # Utility function tests
│   └── __mocks__/              # Mock data and utilities
│
├── public/                      # Static assets
│   ├── images/                 # Image assets
│   ├── icons/                  # Icon assets
│   └── favicon.ico            # Site favicon
│
├── .github/                     # GitHub configuration
│   └── workflows/              # CI/CD workflows
│       ├── test.yml           # Testing workflow
│       ├── deploy.yml         # Deployment workflow
│       └── security.yml       # Security scanning
│
├── .next/                       # Next.js build output (ignored)
├── node_modules/               # Dependencies (ignored)
├── .env.local                  # Environment variables (ignored)
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
├── package.json               # Node.js dependencies and scripts
├── package-lock.json          # Dependency lock file
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── jest.config.js             # Jest testing configuration
├── playwright.config.ts       # Playwright E2E configuration
├── next.config.js             # Next.js configuration
└── README.md                  # Project documentation
```

## Key Directory Explanations

### **/.bmad-core/**
Contains the BMAD (Business Methodology and Development) framework configuration for agent-based development, quality checklists, and automated task definitions.

### **/docs/**
Comprehensive project documentation including PRD, architecture specifications, and epic/story definitions following BMAD conventions.

### **/CU-BEMS dataset/**
Bangkok university dataset files (700MB total) containing 18 months of IoT sensor data from 134 sensors across 7 floors.

### **/src/app/**
Next.js 14+ App Router structure with file-based routing:
- Route groups `(auth)` for authentication pages
- API routes in `/api/` directory
- Protected routes in `/dashboard/`

### **/src/components/**
React component organization:
- `ui/` - Reusable design system components
- `features/` - Business logic components grouped by feature
- `layout/` - Application shell components

### **/src/lib/**
Application configuration and utilities:
- Third-party service configurations (Supabase, Stripe, NextAuth)
- Validation schemas using Zod
- Shared utility functions

### **/scripts/**
Data processing and operational scripts:
- Bangkok dataset processing pipeline
- Database setup and migration
- Data validation and integrity checks

## File Naming Conventions

### **React Components**
- **Files**: PascalCase (`UserDashboard.tsx`)
- **Tests**: Component name + `.test.tsx` (`UserDashboard.test.tsx`)
- **Stories**: Component name + `.stories.tsx` (if using Storybook)

### **API Routes**
- **Files**: lowercase with hyphens (`user-analytics.ts`)
- **Directories**: Feature-based grouping (`/api/analytics/summary/`)

### **Utilities & Hooks**
- **Hooks**: camelCase starting with "use" (`useAnalytics.ts`)
- **Utils**: camelCase describing function (`formatCurrency.ts`)
- **Types**: camelCase with descriptive names (`userAnalytics.ts`)

### **Documentation**
- **BMAD**: kebab-case (`po-master-checklist.md`)
- **Architecture**: kebab-case (`tech-stack.md`)
- **Epics**: numbered with kebab-case (`epic-1-core-data-foundation.md`)

## Environment Configuration

### **Development**
```bash
# Required environment variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### **Production**
```bash
# Production environment variables
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXTAUTH_URL=https://cu-bems-analytics.com
# ... other production values
```

## Build and Deployment Structure

### **Local Development**
```bash
npm run dev          # Start development server
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run Playwright E2E tests
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### **Production Build**
```bash
npm run build        # Create production build
npm run start        # Start production server
npm run analyze      # Bundle size analysis
```

### **Database Operations**
```bash
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with test data
npm run db:reset     # Reset database (development only)
npm run process:data # Process Bangkok dataset
```

## Security Considerations

### **Sensitive Files (.gitignore)**
```gitignore
# Environment variables
.env.local
.env.production

# API keys and secrets
*.key
*.pem

# Database files
*.db
*.sqlite

# Build output
.next/
out/
dist/

# Dependencies
node_modules/
.pnp
.pnp.js

# IDE files
.vscode/
.idea/
*.swp
*.swo
```

### **Public vs Private**
- **Public** (`/public/`): Static assets accessible via URL
- **Private** (`/src/`, `/scripts/`): Server-side code never exposed to client
- **Environment** (`.env.local`): Sensitive configuration never committed

## Scalability Considerations

### **Code Organization**
- **Feature-based**: Components grouped by business functionality
- **Layer separation**: Clear boundaries between UI, business logic, and data
- **Type safety**: Comprehensive TypeScript coverage for maintainability

### **Asset Management**
- **Static assets**: Optimized images and icons in `/public/`
- **Dynamic imports**: Code splitting for large components and pages
- **Bundle optimization**: Tree shaking and dead code elimination

This source tree structure supports the ultra-lean architecture while maintaining scalability, security, and developer experience standards for the CU-BEMS IoT Transmission Failure Analysis Platform.