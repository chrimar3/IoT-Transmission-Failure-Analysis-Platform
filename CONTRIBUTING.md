# 🤝 Contributing to CU-BEMS IoT Platform

Thank you for your interest in contributing to the CU-BEMS IoT Transmission Failure Analysis Platform! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow:

- **Be respectful** and inclusive in all interactions
- **Be constructive** when providing feedback
- **Focus on what is best** for the community and the project
- **Show empathy** towards other community members

## Getting Started

### Prerequisites

- **Node.js** ≥18.0.0
- **npm** ≥8.0.0
- **Git** for version control
- **TypeScript** knowledge recommended
- **React/Next.js** experience helpful

### Development Setup

1. **Fork the repository**
   ```bash
   # Fork via GitHub UI, then clone your fork
   git clone https://github.com/YOUR_USERNAME/cu-bems-iot-platform.git
   cd cu-bems-iot-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Run tests**
   ```bash
   npm test
   ```

## Contributing Guidelines

### Types of Contributions

We welcome several types of contributions:

- 🐛 **Bug fixes**
- ✨ **New features**
- 📝 **Documentation improvements**
- 🎨 **UI/UX enhancements**
- ⚡ **Performance optimizations**
- 🧪 **Test coverage improvements**
- 🔒 **Security enhancements**

### Before You Start

1. **Check existing issues** to avoid duplicate work
2. **Create an issue** for new features or significant changes
3. **Discuss your approach** in the issue before implementing
4. **Keep changes focused** - one feature/fix per PR

### Branching Strategy

We use GitHub Flow with the following branch naming conventions:

- `feature/description-of-feature` - New features
- `fix/description-of-bug` - Bug fixes
- `docs/description-of-change` - Documentation updates
- `refactor/description-of-change` - Code refactoring
- `test/description-of-tests` - Test improvements

Example:
```bash
git checkout -b feature/real-time-alerts
git checkout -b fix/dashboard-loading-issue
git checkout -b docs/api-documentation-update
```

## Pull Request Process

### 1. Preparation Checklist

Before submitting a PR, ensure:

- [ ] Code follows project coding standards
- [ ] All tests pass (`npm test`)
- [ ] TypeScript compilation succeeds (`npm run typecheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Changes are documented
- [ ] PR description is clear and comprehensive

### 2. PR Description Template

Use this template for your PR description:

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that breaks existing functionality)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring (no functional changes)

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Cross-browser testing (if applicable)

## Screenshots/Demo
If applicable, add screenshots or GIFs demonstrating the changes.

## Related Issues
Fixes #123
Related to #456

## Additional Notes
Any additional information reviewers should know.
```

### 3. Review Process

1. **Automated checks** must pass (tests, linting, type checking)
2. **Code review** by at least one maintainer
3. **Manual testing** if applicable
4. **Documentation review** for user-facing changes
5. **Security review** for sensitive changes

## Coding Standards

### TypeScript Guidelines

```typescript
// ✅ Good: Use explicit types
interface UserData {
  id: string;
  name: string;
  email: string;
}

// ✅ Good: Use meaningful names
const getUserAnalytics = async (userId: string): Promise<UserData> => {
  // implementation
};

// ❌ Bad: Use any type
const userData: any = getUser();

// ❌ Bad: Use unclear names
const fn1 = (x: any) => { /* ... */ };
```

### React Component Guidelines

```tsx
// ✅ Good: Functional components with proper TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} ${disabled ? 'btn-disabled' : ''}`}
    >
      {label}
    </button>
  );
};
```

### API Route Guidelines

```typescript
// ✅ Good: Proper error handling and typing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '10';

    // Validate input
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return Response.json(
        { success: false, error: 'Invalid limit parameter' },
        { status: 400 }
      );
    }

    const data = await fetchData(parsedLimit);

    return Response.json({
      success: true,
      data,
      metadata: { count: data.length }
    });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### CSS/Styling Guidelines

```tsx
// ✅ Good: Use Tailwind utility classes consistently
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <div className="bg-white shadow-sm rounded-lg p-6">
    <h2 className="text-2xl font-bold text-gray-900 mb-4">
      Dashboard Analytics
    </h2>
  </div>
</div>

// ✅ Good: Responsive design patterns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* responsive grid items */}
</div>
```

## Testing Requirements

### Unit Tests

```typescript
// Example test structure
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  it('should render with correct label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button label="Click me" onClick={handleClick} />);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button label="Click me" onClick={() => {}} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Integration Tests

```typescript
// Example API integration test
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/insights';

describe('/api/insights', () => {
  it('should return insights data', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('key_insights');
  });
});
```

### Test Coverage Requirements

- **Minimum 85% code coverage** for all new code
- **100% coverage** for utility functions and business logic
- **All API endpoints** must have integration tests
- **All React components** must have unit tests
- **Critical user paths** must have end-to-end tests

## Documentation

### Code Documentation

```typescript
/**
 * Processes IoT sensor data and extracts business insights
 * @param sensorData - Array of raw sensor readings
 * @param options - Configuration options for analysis
 * @returns Promise containing extracted insights with confidence scores
 * @throws {Error} When sensor data format is invalid
 *
 * @example
 * ```typescript
 * const insights = await processInsights(sensorData, {
 *   timeWindow: '24h',
 *   minConfidence: 85
 * });
 * console.log(insights.totalSavings); // "$273,500"
 * ```
 */
export async function processInsights(
  sensorData: SensorReading[],
  options: AnalysisOptions
): Promise<InsightResults> {
  // implementation
}
```

### README Updates

When adding new features, update relevant documentation:

- Add new API endpoints to API documentation
- Update installation instructions if dependencies change
- Add new environment variables to setup guide
- Update architecture diagrams for significant changes

### Commit Message Format

Use conventional commit messages:

```
type(scope): brief description

Longer description if needed

Fixes #123
```

Types:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or modifications
- `chore`: Maintenance tasks

Examples:
```
feat(dashboard): add real-time data streaming
fix(api): resolve timeout issues in insights endpoint
docs(readme): update installation instructions
test(components): add unit tests for Button component
```

## Development Workflow

### Daily Development

1. **Pull latest changes**
   ```bash
   git checkout main
   git pull upstream main
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/my-awesome-feature
   ```

3. **Make changes and test**
   ```bash
   # Make your changes
   npm test
   npm run lint
   npm run typecheck
   ```

4. **Commit with clear messages**
   ```bash
   git add .
   git commit -m "feat(dashboard): add energy consumption charts"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/my-awesome-feature
   # Create PR via GitHub UI
   ```

### Debugging Guidelines

```typescript
// ✅ Good: Structured logging
console.log(JSON.stringify({
  level: 'info',
  message: 'Processing insights',
  metadata: { recordCount: sensorData.length },
  timestamp: new Date().toISOString()
}));

// ✅ Good: Error context
try {
  await processData();
} catch (error) {
  console.error('Data processing failed', {
    error: error.message,
    stack: error.stack,
    context: { userId, dataSize: data.length }
  });
}
```

## Performance Guidelines

### Code Performance

- Use `React.memo()` for expensive components
- Implement proper dependency arrays in hooks
- Use `useMemo()` and `useCallback()` appropriately
- Optimize database queries with proper indexing
- Implement pagination for large datasets

### Bundle Optimization

```typescript
// ✅ Good: Dynamic imports for large components
const AnalyticsChart = dynamic(() => import('./AnalyticsChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
});

// ✅ Good: Tree shaking
import { format } from 'date-fns';  // Not: import * as dateFns
```

## Security Guidelines

### Input Validation

```typescript
import { z } from 'zod';

const InsightRequestSchema = z.object({
  category: z.enum(['energy', 'maintenance', 'efficiency']).optional(),
  limit: z.number().min(1).max(100).optional(),
  startDate: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const validated = InsightRequestSchema.parse(params);
    // Use validated data
  } catch (error) {
    return Response.json({ error: 'Invalid parameters' }, { status: 400 });
  }
}
```

### Data Protection

- Never log sensitive data
- Use environment variables for secrets
- Implement proper error handling without exposing internal details
- Validate all user inputs
- Use HTTPS in production

## Getting Help

If you need help while contributing:

1. **Check existing issues** and discussions
2. **Read the documentation** in the `docs/` folder
3. **Create a discussion** for questions
4. **Join our community** (Discord/Slack link if available)
5. **Ask in your PR** if you need specific feedback

## Recognition

Contributors who make significant contributions will be:

- Added to the CONTRIBUTORS.md file
- Mentioned in release notes
- Given commit access (for regular contributors)
- Invited to join the core team (for exceptional contributors)

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to the CU-BEMS IoT Platform! Your efforts help create better building management solutions and contribute to energy efficiency worldwide. 🌍⚡