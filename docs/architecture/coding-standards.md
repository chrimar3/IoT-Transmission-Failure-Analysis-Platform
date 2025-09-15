# Coding Standards - CU-BEMS IoT Platform

## TypeScript Development Standards

### **Code Quality Requirements**
- **Type Safety**: Strict TypeScript configuration, no `any` types
- **Test Coverage**: 85% minimum, 100% for business logic
- **Documentation**: JSDoc for public APIs and complex functions
- **Linting**: ESLint with strict rules, Prettier for formatting

### **File Organization**
```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   └── features/       # Feature-specific components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── types/              # TypeScript type definitions
├── app/                # Next.js App Router pages and layouts
└── __tests__/          # Test files (co-located with source)
```

### **Naming Conventions**
- **Components**: PascalCase (`UserDashboard.tsx`)
- **Files**: kebab-case (`user-dashboard.tsx`)
- **Functions**: camelCase (`getUserMetrics`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_ENDPOINTS`)
- **Types**: PascalCase with prefix (`IUserData`, `TApiResponse`)

## React Development Patterns

### **Component Structure**
```typescript
interface IComponentProps {
  data: UserData;
  onUpdate: (data: UserData) => void;
  className?: string;
}

/**
 * UserDashboard component displays user analytics with interactive charts
 * @param data - User analytics data
 * @param onUpdate - Callback for data updates
 */
export const UserDashboard: React.FC<IComponentProps> = ({ 
  data, 
  onUpdate, 
  className 
}) => {
  // Hooks first
  const [isLoading, setIsLoading] = useState(false);
  const { metrics } = useUserMetrics(data.id);
  
  // Event handlers
  const handleUpdate = useCallback((newData: UserData) => {
    setIsLoading(true);
    onUpdate(newData);
    setIsLoading(false);
  }, [onUpdate]);
  
  // Early returns
  if (!data) return <LoadingSpinner />;
  
  // Main render
  return (
    <div className={cn("dashboard-container", className)}>
      {/* Component JSX */}
    </div>
  );
};
```

### **Hook Patterns**
```typescript
/**
 * Custom hook for user analytics data management
 * @param userId - User identifier
 * @returns Analytics data with loading and error states
 */
export const useUserMetrics = (userId: string) => {
  const [data, setData] = useState<IUserMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        const response = await getUserMetrics(userId);
        setData(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMetrics();
  }, [userId]);
  
  return { data, isLoading, error };
};
```

## API Development Standards

### **Next.js API Routes**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Request validation schema
const requestSchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d']),
  sensorIds: z.array(z.string()).optional(),
});

/**
 * GET /api/analytics/summary
 * Returns user analytics summary for specified time range
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Request validation
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const validatedParams = requestSchema.parse(params);
    
    // Business logic
    const analytics = await getAnalyticsSummary(
      session.user.id,
      validatedParams.timeRange
    );
    
    return NextResponse.json({ data: analytics });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Database Standards

### **Supabase Integration**
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Type-safe Supabase client
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Database query with error handling
export async function getUserAnalytics(
  userId: string,
  timeRange: string
): Promise<IAnalyticsData> {
  const { data, error } = await supabase
    .from('analytics_summary')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', getTimeRangeStart(timeRange))
    .order('created_at', { ascending: false });
    
  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }
  
  return transformAnalyticsData(data);
}
```

## Testing Standards

### **Test Structure**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { UserDashboard } from '../UserDashboard';
import { mockUserData } from '@/test/mocks';

describe('UserDashboard', () => {
  const defaultProps = {
    data: mockUserData,
    onUpdate: jest.fn(),
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should render user metrics correctly', () => {
    render(<UserDashboard {...defaultProps} />);
    
    expect(screen.getByText(mockUserData.name)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
  });
  
  it('should handle update callback when button clicked', async () => {
    render(<UserDashboard {...defaultProps} />);
    
    const updateButton = screen.getByRole('button', { name: /update/i });
    fireEvent.click(updateButton);
    
    expect(defaultProps.onUpdate).toHaveBeenCalledWith(mockUserData);
  });
  
  it('should show loading state during updates', async () => {
    render(<UserDashboard {...defaultProps} />);
    // Test implementation
  });
});
```

### **API Testing**
```typescript
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/analytics/route';

describe('/api/analytics', () => {
  it('should return analytics data for authenticated user', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { timeRange: '7d' },
    });
    
    // Mock authentication
    jest.spyOn(require('next-auth'), 'getServerSession')
      .mockResolvedValue({ user: { id: 'test-user' } });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('data');
  });
});
```

## Performance Standards

### **Optimization Requirements**
- **Bundle Size**: <500KB initial JavaScript bundle
- **Code Splitting**: Dynamic imports for non-critical components
- **Image Optimization**: Next.js Image component with proper sizing
- **Caching**: Appropriate cache headers and service worker for static assets

### **React Performance**
```typescript
// Memoization for expensive calculations
const ExpensiveChart = React.memo(({ data }) => {
  const processedData = useMemo(
    () => processChartData(data),
    [data]
  );
  
  return <Chart data={processedData} />;
});

// Callback optimization
const UserList = ({ users, onUpdate }) => {
  const handleUserUpdate = useCallback((userId: string, data: UserData) => {
    onUpdate(userId, data);
  }, [onUpdate]);
  
  return users.map(user => (
    <UserItem key={user.id} user={user} onUpdate={handleUserUpdate} />
  ));
};
```

## Error Handling Standards

### **Client-Side Error Boundaries**
```typescript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    // Log to monitoring service
    console.error('Component error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    
    return this.props.children;
  }
}
```

### **API Error Handling**
```typescript
// Consistent error response format
interface IApiError {
  error: string;
  code?: string;
  details?: unknown;
  timestamp: string;
}

// Error handling utility
export function handleApiError(error: unknown): NextResponse {
  const timestamp = new Date().toISOString();
  
  if (error instanceof ValidationError) {
    return NextResponse.json({
      error: error.message,
      code: 'VALIDATION_ERROR',
      details: error.details,
      timestamp,
    }, { status: 400 });
  }
  
  // Log unexpected errors
  console.error('Unexpected API error:', error);
  
  return NextResponse.json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp,
  }, { status: 500 });
}
```

## Security Standards

### **Input Validation**
- **Client-Side**: React Hook Form with Zod validation
- **Server-Side**: Zod schema validation for all API inputs
- **Database**: Parameterized queries, no string concatenation
- **File Uploads**: Type validation, size limits, virus scanning

### **Authentication & Authorization**
- **Session Management**: Secure HTTP-only cookies via NextAuth.js
- **API Protection**: All protected routes require valid session
- **Database Security**: Row Level Security (RLS) policies in Supabase
- **Environment Variables**: All secrets in environment variables, never in code

These coding standards ensure consistent, maintainable, and secure code across the entire CU-BEMS IoT platform development.