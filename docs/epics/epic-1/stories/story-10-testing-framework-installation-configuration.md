# Story 1.0: Testing Framework Installation & Configuration

## Status
Draft

## Story
**As a** developer,  
**I want** a complete testing framework setup with Jest, React Testing Library, and Playwright,  
**so that** all subsequent development follows TDD principles and maintains quality standards with automated testing in CI/CD.

## Acceptance Criteria
1. Jest, React Testing Library, and Playwright dependencies installed and configured
2. Test scripts added to package.json and functional (test, test:watch, test:e2e, test:coverage)
3. jest.config.js created with TypeScript and React support
4. setupTests.js configured with common test utilities
5. Playwright configuration file created for E2E testing
6. GitHub Actions workflow configured for automated testing
7. Test coverage reporting configured with 85% minimum threshold
8. Example unit, integration, and E2E tests created and passing
9. Test directory structure aligned with source tree architecture
10. CI/CD pipeline successfully runs all test suites

## Priority & Effort
**Priority**: P0 (Blocking - Must Complete First)  
**Effort**: 2 points  
**Epic**: Epic 1 - Core Data Foundation

## Tasks / Subtasks
- [ ] Install testing dependencies (AC: 1)
  - [ ] Install Jest and related packages: jest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event
  - [ ] Install Playwright: @playwright/test
  - [ ] Install additional testing utilities: jest-environment-jsdom, supertest
  - [ ] Verify all packages installed correctly with npm list
- [ ] Configure Jest testing framework (AC: 3)
  - [ ] Create jest.config.js with TypeScript support and React environment
  - [ ] Configure test file patterns and directories
  - [ ] Set up module name mapping for path aliases
  - [ ] Configure coverage collection and thresholds (85% minimum)
- [ ] Set up test utilities and environment (AC: 4)
  - [ ] Create setupTests.js with common test setup
  - [ ] Configure testing-library custom matchers
  - [ ] Set up mock utilities and test helpers
  - [ ] Create test data factories and fixtures
- [ ] Configure Playwright for E2E testing (AC: 5)
  - [ ] Create playwright.config.ts with browser configurations
  - [ ] Set up test directories and base URL configuration
  - [ ] Configure test reporters and screenshot options
  - [ ] Set up parallel execution and retry logic
- [ ] Update package.json scripts (AC: 2)
  - [ ] Add test script for Jest unit/integration tests
  - [ ] Add test:watch script for development workflow
  - [ ] Add test:e2e script for Playwright tests
  - [ ] Add test:coverage script for coverage reporting
- [ ] Create test directory structure (AC: 9)
  - [ ] Create __tests__ directory following source tree structure
  - [ ] Set up component test directories matching src structure
  - [ ] Create API test directory for endpoint testing
  - [ ] Set up E2E test directory for user journey tests
- [ ] Configure GitHub Actions CI/CD (AC: 6, 10)
  - [ ] Create .github/workflows/test.yml workflow
  - [ ] Configure Node.js environment and caching
  - [ ] Add Jest test execution step
  - [ ] Add Playwright test execution with browsers
  - [ ] Configure test result reporting and artifact storage
- [ ] Create example tests (AC: 8)
  - [ ] Create unit test example for React component
  - [ ] Create integration test example for API endpoint
  - [ ] Create E2E test example for user workflow
  - [ ] Verify all tests pass locally and in CI

## Dev Notes

### Previous Story Insights
No previous stories - this is the foundational story that enables TDD development for all subsequent stories.

### Technical Context from Architecture

#### Testing Architecture Requirements
[Source: docs/architecture/5-testing-framework-setup-installation.md]
- **Unit Tests**: Jest + Testing Library for components and utilities
- **Integration Tests**: API endpoint testing with test database
- **Data Pipeline Tests**: CSV processing validation (for Bangkok dataset)
- **E2E Tests**: Playwright for critical user journeys only
- **Performance Tests**: Lighthouse CI for load testing

#### Mandatory Installation Sequence
[Source: docs/architecture/5-testing-framework-setup-installation.md]
```bash
# Essential testing dependencies - MUST be installed before development begins
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev supertest @playwright/test
npm install --save-dev jest-environment-jsdom
```

#### Coverage Requirements
[Source: docs/architecture/5-testing-framework-setup-installation.md]
- Unit Tests: 85% minimum coverage
- API Endpoints: 100% happy path + error cases
- Data Pipeline: 100% validation coverage

#### Technology Stack Integration
[Source: docs/architecture/tech-stack.md#development-tools]
- **Testing**: Jest + React Testing Library + Playwright
- **CI/CD**: GitHub Actions with automated testing and deployment
- **Package Manager**: npm with lockfile version control

#### File Structure Requirements
[Source: docs/architecture/source-tree.md]
```
__tests__/                   # Test files
├── components/             # Component tests
├── hooks/                  # Hook tests
├── api/                    # API endpoint tests
├── lib/                    # Utility function tests
└── __mocks__/              # Mock data and utilities
```

#### Configuration Files Required
[Source: docs/architecture/source-tree.md]
- `jest.config.js` - Jest testing configuration
- `playwright.config.ts` - Playwright E2E configuration
- `.github/workflows/test.yml` - CI/CD testing workflow

#### Package.json Scripts Required
[Source: docs/architecture/source-tree.md#local-development]
```bash
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run Playwright E2E tests
```

#### Testing Standards from Coding Standards
[Source: docs/architecture/coding-standards.md#testing-standards]
- Test Coverage: 85% minimum, 100% for business logic
- Test Structure: Arrange-Act-Assert pattern
- File Naming: Component.test.tsx for component tests
- Mock Strategy: Mock external dependencies, test business logic

#### Current Project State
- Package.json exists in parent directory with basic React dependencies
- No testing framework currently installed
- No test directories or configuration files exist
- TypeScript 5.8.3 already configured
- ESLint and Prettier already configured

### Production Readiness Requirements

#### API Failure Handling
- Test suite must handle CI/CD failures gracefully
- GitHub Actions workflow must fail fast on test failures
- Coverage reporting must block deployment if below thresholds

#### Service Rate Limit Management
- CI/CD testing must not overwhelm external services
- Playwright tests must include retry logic for flaky tests
- Test database connections must be properly managed

#### Error Logging and Alerting
- Test failures must be clearly reported in CI/CD logs
- Coverage reports must be automatically generated and stored
- Failed tests must provide actionable error messages

#### Performance Benchmarks
- Test suite execution time must be under 5 minutes
- E2E tests must complete within 10 minutes
- Coverage generation must not significantly impact CI/CD time

#### Security Requirements
- Test environment variables must be properly secured
- Mock data must not contain real sensitive information
- Database test credentials must use separate test instances

#### Monitoring and Observability
- Test execution metrics must be tracked in CI/CD
- Coverage trends must be monitored over time
- Test failure patterns must be identifiable

#### Documentation Requirements
- Testing standards must be documented for team
- Example tests must serve as templates
- CI/CD workflow must be documented with troubleshooting

### Testing

#### Test File Location and Naming
[Source: docs/architecture/source-tree.md]
- Component tests: `__tests__/components/ComponentName.test.tsx`
- Hook tests: `__tests__/hooks/useHookName.test.ts`
- API tests: `__tests__/api/endpoint.test.ts`
- Utility tests: `__tests__/lib/utility.test.ts`

#### Test Coverage Requirements
[Source: docs/architecture/coding-standards.md]
- Minimum 85% code coverage overall
- 100% coverage for business logic in hooks and utilities
- Integration tests for all user interactions
- E2E tests for critical user paths

#### Testing Frameworks and Patterns
[Source: docs/architecture/tech-stack.md]
- Jest for unit and integration testing
- React Testing Library for component testing
- Playwright for E2E testing
- Supertest for API endpoint testing

#### Specific Testing Requirements for This Story
- All configuration files must be tested for valid syntax
- Example tests must demonstrate all testing patterns
- CI/CD workflow must be tested with sample test failures
- Coverage reporting must be verified to work correctly

#### Performance Testing Requirements
- Test suite performance must be benchmarked
- E2E tests must include performance assertions
- CI/CD pipeline timing must be optimized

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-01-11 | 2.0 | Complete story enhancement with template compliance and comprehensive technical context | Claude Code |
| [Original] | 1.0 | Initial basic story outline | Previous Author |

## Dev Agent Record

*This section will be populated by the development agent during implementation*

### Agent Model Used
*To be filled by development agent*

### Debug Log References
*To be filled by development agent*

### Completion Notes List
*To be filled by development agent*

### File List
*To be filled by development agent*

## QA Results

*This section will be populated by the QA Agent after story implementation review*
