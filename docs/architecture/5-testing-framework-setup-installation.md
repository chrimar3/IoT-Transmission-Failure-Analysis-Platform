# 5. Testing Framework Setup & Installation

## Mandatory Installation Sequence (Epic 1, Story 1.0)
```bash
# Essential testing dependencies - MUST be installed before development begins
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev supertest @playwright/test
npm install --save-dev jest-environment-jsdom

# Create jest.config.js, setupTests.js, and .github/workflows/test.yml
npm run setup:testing-framework
```

## Testing Architecture
- **Unit Tests**: Jest + Testing Library (components, utilities)
- **Integration Tests**: API endpoint testing with test database  
- **Data Pipeline Tests**: CSV processing validation
- **E2E Tests**: Playwright (critical user journeys only)
- **Performance Tests**: Lighthouse CI for load testing

## Test Database Strategy
- **Local**: Docker PostgreSQL with sample dataset
- **CI**: Supabase test project with sanitized data
- **Staging**: Separate Supabase project with 10% dataset

## Coverage Requirements
- Unit Tests: 85% minimum
- API Endpoints: 100% happy path + error cases
- Data Pipeline: 100% validation coverage
