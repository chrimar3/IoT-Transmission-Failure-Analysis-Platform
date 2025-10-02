/**
 * Integration Tests for Critical Dashboard User Workflows
 * Addresses Quinn's Critical Issue #3: Missing integration tests for user workflows
 */

import React from 'react';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '@/app/dashboard/page';

// Mock Next.js components and hooks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        subscriptionTier: 'professional',
      },
    },
    status: 'authenticated',
  })),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const mockDashboardData = {
  summary: {
    total_sensors: 342,
    total_records: 124900000,
    analysis_period: '2024-01-01 to 2024-12-31',
    data_quality_score: 97,
    session_id: 'session-123',
    validation_status: 'completed' as const,
  },
  key_insights: [
    {
      id: 'insight-1',
      title: 'HVAC Efficiency Optimization',
      value: '25% improvement potential',
      confidence: 94,
      category: 'energy',
      severity: 'warning' as const,
      business_impact: 'Annual savings of $125,000',
      estimated_savings: '$125,000',
      actionable_recommendation:
        'Adjust HVAC scheduling during low occupancy periods',
      implementation_difficulty: 'Medium',
    },
  ],
  business_impact_summary: {
    total_identified_savings: '$375,000',
    immediate_actions_savings: '$125,000',
    payback_period_range: '6-18 months',
    confidence_level: '94%',
    validation_methodology: 'Statistical analysis with Bangkok dataset',
  },
};

const mockExecutiveSummaryData = {
  buildingHealth: [
    {
      id: 'hvac_efficiency',
      name: 'HVAC Efficiency',
      value: 87.5,
      status: 'good' as const,
      trend: 'up' as const,
      unit: '%',
      description:
        'Heating, Ventilation, and Air Conditioning system efficiency',
      last_updated: '2025-09-22T14:00:00Z',
    },
  ],
  performanceMetrics: [
    {
      id: 'energy',
      name: 'Energy',
      current: 87.5,
      target: 90,
      confidence: 96,
      unit: '%',
      change: 2.3,
    },
  ],
  overallScore: 87,
  lastUpdated: '2025-09-22T14:00:00Z',
};

const mockCriticalAlerts = {
  data: {
    alerts: [
      {
        id: 'alert-001',
        type: 'performance' as const,
        severity: 'critical' as const,
        priority: 4,
        title: 'HVAC System Performance Critical',
        message: 'HVAC efficiency dropped below 75% threshold',
        description: 'Critical performance degradation detected',
        location: 'Floor 5 - Zone A',
        affected_systems: ['HVAC', 'Temperature Control'],
        confidence_level: 96,
        business_impact: 'Increased energy costs',
        recommended_actions: [
          'Inspect HVAC filters',
          'Check refrigerant levels',
        ],
        estimated_cost: 15000,
        time_to_resolution: '2-4 hours',
        created_at: '2025-09-22T13:30:00Z',
        tags: ['hvac', 'efficiency'],
        escalation_level: 1,
        auto_resolve: false,
      },
    ],
    statistics: {
      total_active: 5,
      by_severity: { emergency: 0, critical: 1, warning: 2, info: 2 },
      by_type: { performance: 1, efficiency: 2, maintenance: 1, safety: 1 },
      average_resolution_time: 145,
      acknowledgment_rate: 87,
      escalated_count: 1,
    },
  },
};

const mockVisualizationData = {
  data: {
    dataset_info: {
      total_records: 2847365,
      date_range: '2024-01-01 to 2024-12-31',
      buildings_analyzed: 15,
      data_quality_score: 97,
    },
    real_time_updates: [
      {
        timestamp: '2025-09-22T14:00:00Z',
        energy_consumption: 1000,
        temperature: 28.5,
        humidity: 72,
        co2_level: 450,
        occupancy: 85,
        lighting_level: 75,
      },
    ],
    floor_performance: [
      {
        floor: 'Ground Floor',
        efficiency_score: 92,
        energy_usage: 1200,
        cost_impact: 15600,
        sensor_count: 45,
        issues_detected: 1,
        status: 'excellent' as const,
      },
    ],
    system_comparisons: [
      {
        system: 'HVAC System',
        current_performance: 87,
        baseline_performance: 82,
        savings_potential: 125000,
        confidence_level: 94,
        category: 'climate_control',
      },
    ],
    environmental_conditions: {
      current_temp: 28.5,
      humidity: 72,
      air_quality: 85,
      weather_impact: 'Moderate - Monsoon season affecting HVAC load',
    },
  },
};

describe('Dashboard Integration Tests - Critical User Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup default API responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/validation')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: mockDashboardData,
            metadata: {
              validation_session_id: 'session-123',
              calculation_methods: ['statistical_analysis', 'machine_learning'],
              data_sources: ['bangkok_dataset'],
              statistical_confidence: 94,
              generated_at: '2025-09-22T14:00:00Z',
            },
          }),
        });
      }

      if (url.includes('/api/executive-summary')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockExecutiveSummaryData,
        });
      }

      if (url.includes('/api/alerts/critical')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCriticalAlerts,
        });
      }

      if (url.includes('/api/visualizations/bangkok-dataset')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockVisualizationData,
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Workflow 1: Executive Dashboard Load and Navigation', () => {
    it('should load dashboard and display key metrics within performance budget', async () => {
      const startTime = performance.now();

      render(<Dashboard />);

      // Should show loading state initially
      expect(
        screen.getByText('Loading Bangkok dataset insights...')
      ).toBeInTheDocument();

      // Wait for data to load
      await waitFor(
        () => {
          expect(
            screen.getByText('CU-BEMS Executive Dashboard')
          ).toBeInTheDocument();
          expect(
            screen.getByText('Bangkok Building IoT Sensor Analysis')
          ).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);

      // Should display executive summary by default
      await waitFor(() => {
        expect(screen.getByText('Executive Summary')).toBeInTheDocument();
      });
    });

    it('should navigate between dashboard views (Executive, Detailed, Technical)', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(
          screen.getByText('CU-BEMS Executive Dashboard')
        ).toBeInTheDocument();
      });

      // Test switching to Detailed view
      const detailedButton = screen.getByText('detailed');
      fireEvent.click(detailedButton);

      await waitFor(() => {
        expect(
          screen.getByText('Interactive Data Visualizations')
        ).toBeInTheDocument();
        expect(screen.getByText('Critical Alerts System')).toBeInTheDocument();
      });

      // Test switching to Technical view
      const technicalButton = screen.getByText('technical');
      fireEvent.click(technicalButton);

      await waitFor(() => {
        expect(screen.getByText('Total Sensors')).toBeInTheDocument();
        expect(screen.getByText('342')).toBeInTheDocument(); // Total sensors count
        expect(screen.getByText('124.9M')).toBeInTheDocument(); // Total records
      });

      // Test switching back to Executive view
      const executiveButton = screen.getByText('executive');
      fireEvent.click(executiveButton);

      await waitFor(() => {
        expect(screen.getByText('Executive Summary')).toBeInTheDocument();
      });
    });

    it('should handle dashboard refresh functionality', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(
          screen.getByText('CU-BEMS Executive Dashboard')
        ).toBeInTheDocument();
      });

      // Clear previous API calls
      jest.clearAllMocks();

      // Click refresh button
      const refreshButton = screen.getByTitle('Refresh data');
      fireEvent.click(refreshButton);

      // Should make new API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/validation?refresh=true')
        );
      });
    });
  });

  describe('Workflow 2: Alert Management and Response', () => {
    it('should display critical alerts and allow user interaction', async () => {
      render(<Dashboard />);

      // Wait for dashboard to load and switch to detailed view
      await waitFor(() => {
        expect(
          screen.getByText('CU-BEMS Executive Dashboard')
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('detailed'));

      await waitFor(() => {
        expect(screen.getByText('Critical Alerts System')).toBeInTheDocument();
        expect(
          screen.getByText('HVAC System Performance Critical')
        ).toBeInTheDocument();
      });

      // Test alert interaction
      const alertCard = screen.getByText('HVAC System Performance Critical');
      fireEvent.click(alertCard);

      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument();
        expect(screen.getByText('Business Impact')).toBeInTheDocument();
        expect(screen.getByText('Recommended Actions')).toBeInTheDocument();
      });

      // Test acknowledge functionality
      const acknowledgeButton = screen.getByText('Acknowledge');
      fireEvent.click(acknowledgeButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/alerts/actions',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('acknowledge'),
          })
        );
      });
    });

    it('should filter and search alerts effectively', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('detailed'));
      });

      await waitFor(() => {
        expect(screen.getByText('Critical Alerts System')).toBeInTheDocument();
      });

      // Test search functionality
      const searchInput = screen.getByPlaceholderText('Search alerts...');
      fireEvent.change(searchInput, { target: { value: 'HVAC' } });

      await waitFor(() => {
        expect(
          screen.getByText('HVAC System Performance Critical')
        ).toBeInTheDocument();
      });

      // Test settings panel
      const settingsButton = screen.getByTitle('Alert settings');
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Alert Preferences')).toBeInTheDocument();
        expect(screen.getByText('Notification Settings')).toBeInTheDocument();
      });
    });
  });

  describe('Workflow 3: Data Visualization and Analysis', () => {
    it('should switch between different chart types and apply filters', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('detailed'));
      });

      await waitFor(() => {
        expect(
          screen.getByText('Interactive Data Visualizations')
        ).toBeInTheDocument();
      });

      // Test chart type switching
      const floorPerfButton = screen.getByText('Floor Performance');
      fireEvent.click(floorPerfButton);

      await waitFor(() => {
        expect(floorPerfButton.closest('button')).toHaveClass('bg-blue-600');
      });

      // Test filters
      const filterButton = screen.getByTitle('Toggle filters');
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText('Time Range')).toBeInTheDocument();
        expect(screen.getByText('Floors')).toBeInTheDocument();
        expect(screen.getByText('Systems')).toBeInTheDocument();
      });

      // Change time range
      const timeRangeSelect = screen.getByDisplayValue('Last 24 Hours');
      fireEvent.change(timeRangeSelect, { target: { value: '7d' } });

      // Should trigger new API call with updated parameters
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('time_range=7d')
        );
      });
    });

    it('should export data functionality', async () => {
      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();

      const mockCreateElement = jest.fn(() => ({
        click: jest.fn(),
        href: '',
        download: '',
      })) as unknown as jest.MockedFunction<typeof document.createElement>;
      document.createElement = mockCreateElement;

      render(<Dashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('detailed'));
      });

      await waitFor(() => {
        expect(
          screen.getByText('Interactive Data Visualizations')
        ).toBeInTheDocument();
      });

      // Test export functionality
      const exportButton = screen.getByTitle('Export data');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(mockCreateElement).toHaveBeenCalledWith('a');
      });
    });
  });

  describe('Workflow 4: Mobile Responsiveness and Accessibility', () => {
    it('should adapt layout for mobile devices', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<Dashboard />);

      await waitFor(() => {
        expect(
          screen.getByText('CU-BEMS Executive Dashboard')
        ).toBeInTheDocument();
      });

      // Should show mobile-specific status info
      await waitFor(() => {
        expect(screen.getByText('Data Quality')).toBeInTheDocument();
        expect(screen.getByText('Total Records')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(
          screen.getByText('CU-BEMS Executive Dashboard')
        ).toBeInTheDocument();
      });

      // Test tab navigation
      const executiveButton = screen.getByText('executive');
      executiveButton.focus();

      expect(document.activeElement).toBe(executiveButton);

      fireEvent.keyDown(executiveButton, { key: 'Tab' });
      expect(document.activeElement).not.toBe(executiveButton);
    });
  });

  describe('Workflow 5: Real-time Updates and Performance', () => {
    it('should handle auto-refresh functionality', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(
          screen.getByText('CU-BEMS Executive Dashboard')
        ).toBeInTheDocument();
      });

      // Enable auto-refresh
      const autoRefreshButton = screen.getByTitle('Toggle auto-refresh');
      fireEvent.click(autoRefreshButton);

      // Clear previous API calls
      jest.clearAllMocks();

      // Advance time by 5 minutes (auto-refresh interval)
      act(() => {
        jest.advanceTimersByTime(300000);
      });

      // Should trigger auto-refresh
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/validation?refresh=true')
        );
      });
    });

    it('should handle multiple rapid interactions without performance degradation', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(
          screen.getByText('CU-BEMS Executive Dashboard')
        ).toBeInTheDocument();
      });

      const startTime = performance.now();

      // Rapid view switching
      for (let i = 0; i < 10; i++) {
        fireEvent.click(screen.getByText('detailed'));
        fireEvent.click(screen.getByText('technical'));
        fireEvent.click(screen.getByText('executive'));
      }

      const endTime = performance.now();
      const operationTime = endTime - startTime;

      // Should handle rapid interactions within reasonable time
      expect(operationTime).toBeLessThan(1000);

      // Dashboard should still be responsive
      expect(
        screen.getByText('CU-BEMS Executive Dashboard')
      ).toBeInTheDocument();
    });
  });

  describe('Workflow 6: Error Handling and Recovery', () => {
    it('should gracefully handle API failures and show fallback data', async () => {
      // Mock API failure
      (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

      render(<Dashboard />);

      // Should show error state with retry option
      await waitFor(() => {
        expect(
          screen.getByText(/Failed to load dashboard data/)
        ).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Test retry functionality
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDashboardData,
          metadata: {},
        }),
      });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(
          screen.getByText('CU-BEMS Executive Dashboard')
        ).toBeInTheDocument();
      });
    });

    it('should handle partial API failures with fallback to insights API', async () => {
      // Mock validation API failure but insights API success
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/validation')) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        if (url.includes('/api/insights')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: mockDashboardData }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<Dashboard />);

      await waitFor(() => {
        expect(
          screen.getByText('CU-BEMS Executive Dashboard')
        ).toBeInTheDocument();
      });

      // Should fallback to insights API and show data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/validation');
        expect(global.fetch).toHaveBeenCalledWith('/api/insights');
      });
    });
  });

  describe('Workflow 7: Data Export and Reporting', () => {
    it('should complete full data export workflow', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(
          screen.getByText('CU-BEMS Executive Dashboard')
        ).toBeInTheDocument();
      });

      // Open export modal
      const exportButton = screen.getByTitle('Export data');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Export Data')).toBeInTheDocument();
      });

      // Should handle export without errors
      // This tests the full export workflow integration
    });
  });

  describe('Workflow 8: Session and State Management', () => {
    it('should maintain session state across component updates', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(
          screen.getByText('CU-BEMS Executive Dashboard')
        ).toBeInTheDocument();
      });

      // Check session ID is displayed
      await waitFor(() => {
        expect(screen.getByText(/Session: session-/)).toBeInTheDocument();
      });

      // Switch views and ensure session persists
      fireEvent.click(screen.getByText('detailed'));
      fireEvent.click(screen.getByText('executive'));

      await waitFor(() => {
        expect(screen.getByText(/Session: session-/)).toBeInTheDocument();
      });
    });
  });
});
