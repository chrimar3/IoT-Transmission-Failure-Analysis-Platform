# Repository Reorganization Plan

## Current Issues
1. ❌ Root directory cluttered with 98 items (should be ~15-20)
2. ❌ Duplicate lib/ directories (both root and src/lib/)
3. ❌ Config files scattered (root, config/, and duplicates)
4. ❌ Utility scripts mixed with source code
5. ❌ Multiple fix-*.js scripts in root
6. ❌ Test mocks in root __mocks__/ directory
7. ❌ Documentation files scattered across root
8. ❌ Middleware split between middleware/ and middleware.ts

## Target Structure (Next.js 14 Best Practices)

```
├── .github/                    # GitHub workflows & templates
├── .vscode/                    # Editor config
├── app/                        # Next.js App Router
├── components/                 # Shared React components
├── lib/                        # Core business logic & utilities
│   ├── algorithms/
│   ├── api/
│   ├── auth/
│   ├── database/
│   ├── export/
│   ├── middleware/
│   ├── services/
│   └── utils/
├── hooks/                      # Custom React hooks
├── types/                      # TypeScript type definitions
├── config/                     # Configuration files
│   ├── database/
│   ├── jest.config.js
│   ├── next.config.js
│   ├── postcss.config.js
│   └── tailwind.config.js
├── scripts/                    # Build & deployment scripts
│   ├── build/
│   ├── deployment/
│   └── validation/
├── tests/                      # Test files
│   ├── __mocks__/
│   ├── integration/
│   ├── unit/
│   ├── e2e/
│   └── utils/
├── docs/                       # Documentation
│   ├── guides/
│   ├── api/
│   └── architecture/
├── public/                     # Static assets
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
└── CHANGELOG.md
```

## Reorganization Actions

### Phase 1: Move Configuration Files
- ✅ Consolidate config files to config/
- ✅ Remove duplicate config files
- ✅ Update import paths

### Phase 2: Reorganize Source Code
- ✅ Merge src/lib/ into lib/
- ✅ Move src/components/ to components/
- ✅ Move src/hooks/ to hooks/
- ✅ Move src/types/ to types/
- ✅ Consolidate middleware

### Phase 3: Clean Root Directory
- ✅ Move utility scripts to scripts/
- ✅ Move test mocks to tests/__mocks__/
- ✅ Organize documentation to docs/
- ✅ Remove temporary fix-*.js files

### Phase 4: Update References
- ✅ Update tsconfig.json paths
- ✅ Update import statements
- ✅ Update test configurations
- ✅ Update documentation

### Phase 5: Verification
- ✅ Run type checking
- ✅ Run linting
- ✅ Run tests
- ✅ Verify build

## Files to Move

### To scripts/utils/
- fix-any-types.js
- fix-function-types.js
- fix-lint-issues.js
- fix-remaining-unused.js
- fix-unused-vars.js
- debug-alert-engine.js
- execute-bmad.js
- execute-bmad-qa.js
- bmad-story-3-3-qa.js
- run-bmad-analysis.ts

### To tests/__mocks__/
- __mocks__/* (move entire directory)

### To tests/
- __tests__/* (move entire directory)

### To docs/reports/
- *_REPORT.md files
- *_IMPLEMENTATION.md files
- QUALITY_BASELINE_REPORT.md
- TEST_*.md files

### To docs/guides/
- QUICK_FIX_GUIDE.md
- QUICK-FIX-REFERENCE.md
- BMAD_MANUAL_INSTALL.md

### To docs/architecture/
- ARCHITECTURE.md
- STRUCTURE.md
- GOALS_TRACKER.md
- PROJECT_ROADMAP.md

### To Keep in Root
- README.md
- LICENSE
- CHANGELOG.md
- CONTRIBUTING.md
- SECURITY.md
- SUPPORT.md
- package.json
- tsconfig.json
- .gitignore
- .env.example
- docker-compose.yml
- Dockerfile
- vercel.json

### To Remove/Archive
- lint_output.txt
- test-output.log
- tsconfig.tsbuildinfo
- coverage/ (gitignored, generated)

## Import Path Updates

All imports will use consistent path aliases:
- `@/lib/*` → Core utilities and business logic
- `@/components/*` → React components
- `@/hooks/*` → Custom hooks
- `@/types/*` → TypeScript types
- `@/app/*` → App Router pages/layouts
- `@/config/*` → Configuration files
- `@/tests/*` → Test utilities

## Expected Benefits

1. ✅ Clean root directory (20 items vs 98)
2. ✅ Consistent import paths
3. ✅ Better code organization
4. ✅ Easier onboarding for new developers
5. ✅ Industry-standard structure
6. ✅ Improved IDE performance
7. ✅ Clearer separation of concerns
