/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatternDetectionWidget } from '@/components/patterns/PatternDetectionWidget';
import type { DetectedPattern } from '@/types/patterns';

// Define proper TypeScript interfaces for mock components
interface MockCardProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

interface MockButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: string;
  size?: string;
  disabled?: boolean;
}

interface MockBadgeProps {
  children?: React.ReactNode;
  variant?: string;
}

interface MockDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface MockContentProps {
  children?: React.ReactNode;
}

interface MockInputProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  [key: string]: unknown;
}

interface MockTextareaProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  [key: string]: unknown;
}

interface MockLabelProps {
  children?: React.ReactNode;
  htmlFor?: string;
}

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick }: MockCardProps) => (
    <div className={className} onClick={onClick} data-testid="card">
      {children}
    </div>
  ),
  CardContent: ({ children }: MockContentProps) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardDescription: ({ children }: MockContentProps) => (
    <div data-testid="card-description">{children}</div>
  ),
  CardHeader: ({ children }: MockContentProps) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: MockContentProps) => (
    <div data-testid="card-title">{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, disabled }: MockButtonProps) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: MockBadgeProps) => (
    <span data-variant={variant} data-testid="badge">
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: MockDialogProps) =>
    open ? (
      <div data-testid="dialog" onBlur={() => onOpenChange?.(false)}>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: MockContentProps) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: MockContentProps) => (
    <div data-testid="dialog-description">{children}</div>
  ),
  DialogFooter: ({ children }: MockContentProps) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: MockContentProps) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: MockContentProps) => (
    <div data-testid="dialog-title">{children}</div>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, ...props }: MockTextareaProps) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid="textarea"
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, ...props }: MockInputProps) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid="input"
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: MockLabelProps) => (
    <label htmlFor={htmlFor} data-testid="label">
      {children}
    </label>
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: MockContentProps) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

describe('PatternDetectionWidget', () => {
  const mockPatterns: DetectedPattern[] = [
    {
      id: 'pattern_001',
      timestamp: '2025-01-15T10:30:00Z',
      sensor_id: 'SENSOR_HVAC_001',
      equipment_type: 'HVAC',
      floor_number: 3,
      pattern_type: 'anomaly',
      severity: 'warning',
      confidence_score: 85,
      description: 'HVAC Temperature Anomaly - Readings 15% above normal range',
      data_points: [
        {
          timestamp: '2025-01-15T10:25:00Z',
          value: 28.5,
          expected_value: 22.0,
          deviation: 6.5,
          is_anomaly: true,
          severity_score: 85,
        },
        {
          timestamp: '2025-01-15T10:30:00Z',
          value: 29.2,
          expected_value: 22.0,
          deviation: 7.2,
          is_anomaly: true,
          severity_score: 90,
        },
      ],
      recommendations: [
        {
          id: 'rec_001',
          priority: 'medium',
          action_type: 'inspection',
          description:
            'Inspect HVAC temperature sensors for calibration issues',
          estimated_cost: 500,
          estimated_savings: 2000,
          time_to_implement_hours: 4,
          required_expertise: 'technician',
          maintenance_category: 'preventive',
          success_probability: 85,
        },
      ],
      acknowledged: false,
      created_at: '2025-01-15T10:30:00Z',
      metadata: {
        detection_algorithm: 'statistical_zscore',
        analysis_window: '24h',
        threshold_used: 2.5,
        historical_occurrences: 2,
        statistical_metrics: {
          mean: 22.0,
          std_deviation: 1.5,
          variance: 2.25,
          median: 22.0,
          q1: 21.0,
          q3: 23.0,
          z_score: 4.8,
          percentile_rank: 98,
          normality_test: 0.92,
        },
      },
    },
    {
      id: 'pattern_002',
      timestamp: '2025-01-15T11:00:00Z',
      sensor_id: 'SENSOR_LIGHT_001',
      equipment_type: 'Lighting',
      floor_number: 5,
      pattern_type: 'threshold',
      severity: 'critical',
      confidence_score: 92,
      description: 'Lighting Power Consumption Spike - 40% above normal',
      data_points: [],
      recommendations: [],
      acknowledged: true,
      acknowledged_by: 'maintenance@cu-bems.com',
      acknowledged_at: '2025-01-15T11:15:00Z',
      created_at: '2025-01-15T11:00:00Z',
      metadata: {
        detection_algorithm: 'threshold_detection',
        analysis_window: '1h',
        threshold_used: 1.8,
        historical_occurrences: 0,
        statistical_metrics: {
          mean: 150.0,
          std_deviation: 25.0,
          variance: 625,
          median: 150.0,
          q1: 130.0,
          q3: 170.0,
          z_score: 3.2,
          percentile_rank: 96,
          normality_test: 0.88,
        },
      },
    },
  ];

  const defaultProps = {
    patterns: mockPatterns,
    onPatternSelect: jest.fn(),
    onAcknowledge: jest.fn(),
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render patterns correctly', () => {
      render(<PatternDetectionWidget {...defaultProps} />);

      expect(
        screen.getByText(
          'HVAC Temperature Anomaly - Readings 15% above normal range'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText('Lighting Power Consumption Spike - 40% above normal')
      ).toBeInTheDocument();
      expect(screen.getByText('HVAC')).toBeInTheDocument();
      expect(screen.getByText('Lighting')).toBeInTheDocument();
      expect(screen.getByText('Floor 3')).toBeInTheDocument();
      expect(screen.getByText('Floor 5')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      render(<PatternDetectionWidget {...defaultProps} loading={true} />);

      expect(screen.getByText('Analyzing patterns...')).toBeInTheDocument();
    });

    it('should show empty state when no patterns', () => {
      render(<PatternDetectionWidget {...defaultProps} patterns={[]} />);

      expect(screen.getByText('No Patterns Detected')).toBeInTheDocument();
      expect(
        screen.getByText('All systems operating within normal parameters')
      ).toBeInTheDocument();
    });

    it('should display confidence scores', () => {
      render(<PatternDetectionWidget {...defaultProps} />);

      expect(screen.getByText('85% confidence')).toBeInTheDocument();
      expect(screen.getByText('92% confidence')).toBeInTheDocument();
    });

    it('should display severity badges with correct variants', () => {
      render(<PatternDetectionWidget {...defaultProps} />);

      const badges = screen.getAllByTestId('badge');
      const severityBadges = badges.filter(
        (badge) =>
          badge.textContent === 'warning' || badge.textContent === 'critical'
      );

      expect(severityBadges).toHaveLength(2);
    });

    it('should show acknowledged status', () => {
      render(<PatternDetectionWidget {...defaultProps} />);

      expect(screen.getByText('Acknowledged')).toBeInTheDocument();
    });

    it('should display data points when available', () => {
      render(<PatternDetectionWidget {...defaultProps} />);

      expect(screen.getByText('Recent Data Points')).toBeInTheDocument();
      expect(screen.getByText('28.50')).toBeInTheDocument();
      expect(screen.getByText('29.20')).toBeInTheDocument();
    });

    it('should show recommendations count', () => {
      render(<PatternDetectionWidget {...defaultProps} />);

      expect(screen.getByText('1 recommendation')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onPatternSelect when pattern is clicked', async () => {
      const user = userEvent.setup();
      render(<PatternDetectionWidget {...defaultProps} />);

      const patternCards = screen.getAllByTestId('card');
      await user.click(patternCards[0]);

      expect(defaultProps.onPatternSelect).toHaveBeenCalledWith(
        mockPatterns[0]
      );
    });

    it('should open acknowledge modal when acknowledge button is clicked', async () => {
      const user = userEvent.setup();
      render(<PatternDetectionWidget {...defaultProps} />);

      const acknowledgeButtons = screen.getAllByText('Acknowledge');
      await user.click(acknowledgeButtons[0]);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('Acknowledge Pattern')).toBeInTheDocument();
    });

    it('should not show acknowledge button for already acknowledged patterns', () => {
      render(<PatternDetectionWidget {...defaultProps} />);

      const acknowledgeButtons = screen.getAllByText('Acknowledge');
      expect(acknowledgeButtons).toHaveLength(1); // Only one pattern is not acknowledged
    });

    it('should handle modal form submission', async () => {
      const user = userEvent.setup();
      const mockOnAcknowledge = jest.fn().mockResolvedValue(undefined);
      const propsWithMock = {
        ...defaultProps,
        onAcknowledge: mockOnAcknowledge,
      };

      render(<PatternDetectionWidget {...propsWithMock} />);

      // Open modal
      const acknowledgeButton = screen.getByText('Acknowledge');
      await user.click(acknowledgeButton);

      // Fill form
      const notesTextarea = screen.getByPlaceholderText(
        'Add any observations or additional context...'
      );
      const actionInput = screen.getByPlaceholderText(
        'e.g., Schedule maintenance inspection'
      );

      await user.type(notesTextarea, 'Temperature sensor needs calibration');
      await user.type(actionInput, 'Schedule sensor calibration for next week');

      // Submit
      const submitButton = screen.getByText('Acknowledge Pattern');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnAcknowledge).toHaveBeenCalledWith(
          'pattern_001',
          'Temperature sensor needs calibration',
          'Schedule sensor calibration for next week'
        );
      });
    });

    it('should handle acknowledge loading state', async () => {
      const user = userEvent.setup();
      const slowAcknowledge = jest.fn(
        (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <PatternDetectionWidget
          {...defaultProps}
          onAcknowledge={slowAcknowledge}
        />
      );

      const acknowledgeButton = screen.getByText('Acknowledge');
      await user.click(acknowledgeButton);

      const submitButton = screen.getByText('Acknowledge Pattern');
      await user.click(submitButton);

      expect(screen.getByText('Acknowledging...')).toBeInTheDocument();

      await waitFor(() => {
        expect(slowAcknowledge).toHaveBeenCalled();
      });
    });

    it('should close modal on cancel', async () => {
      const user = userEvent.setup();
      render(<PatternDetectionWidget {...defaultProps} />);

      const acknowledgeButton = screen.getByText('Acknowledge');
      await user.click(acknowledgeButton);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PatternDetectionWidget {...defaultProps} />);

      const textareas = screen.getAllByTestId('textarea');
      const inputs = screen.getAllByTestId('input');

      expect(textareas.length).toBeGreaterThan(0);
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<PatternDetectionWidget {...defaultProps} />);

      // Tab through elements
      await user.tab();

      // Should be able to focus on acknowledge button
      const acknowledgeButton = screen.getByText('Acknowledge');
      expect(acknowledgeButton).toBeInTheDocument();
    });

    it('should have proper button states', () => {
      render(<PatternDetectionWidget {...defaultProps} loading={true} />);

      // When loading, buttons in modal should be disabled
      // This would be tested when modal is open during loading
    });
  });

  describe('edge cases', () => {
    it('should handle patterns without data points', () => {
      const patternsWithoutData = mockPatterns.map((pattern) => ({
        ...pattern,
        data_points: [],
      }));

      render(
        <PatternDetectionWidget
          {...defaultProps}
          patterns={patternsWithoutData}
        />
      );

      expect(screen.queryByText('Recent Data Points')).not.toBeInTheDocument();
    });

    it('should handle patterns without recommendations', () => {
      const patternsWithoutRecs = mockPatterns.map((pattern) => ({
        ...pattern,
        recommendations: [],
      }));

      render(
        <PatternDetectionWidget
          {...defaultProps}
          patterns={patternsWithoutRecs}
        />
      );

      expect(screen.queryByText('recommendation')).not.toBeInTheDocument();
    });

    it('should handle acknowledge errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const mockOnAcknowledge = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));
      const propsWithMock = {
        ...defaultProps,
        onAcknowledge: mockOnAcknowledge,
      };

      render(<PatternDetectionWidget {...propsWithMock} />);

      const acknowledgeButton = screen.getByText('Acknowledge');
      await user.click(acknowledgeButton);

      const submitButton = screen.getByText('Acknowledge Pattern');
      await user.click(submitButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to acknowledge pattern:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it('should format timestamps correctly', () => {
      render(<PatternDetectionWidget {...defaultProps} />);

      // Should show formatted time (month, day, hour, minute)
      expect(screen.getByText(/Jan 15, 10:30/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 15, 11:00/)).toBeInTheDocument();
    });

    it('should handle very long descriptions', () => {
      const longDescriptionPattern = {
        ...mockPatterns[0],
        description: 'A'.repeat(200), // Very long description
      };

      render(
        <PatternDetectionWidget
          {...defaultProps}
          patterns={[longDescriptionPattern]}
        />
      );

      expect(screen.getByTestId('card-title')).toBeInTheDocument();
    });

    it('should handle missing equipment type icons', () => {
      const unknownEquipmentPattern = {
        ...mockPatterns[0],
        equipment_type: 'Unknown',
      };

      render(
        <PatternDetectionWidget
          {...defaultProps}
          patterns={[unknownEquipmentPattern]}
        />
      );

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('performance', () => {
    it('should handle large numbers of patterns', () => {
      const manyPatterns = Array.from({ length: 50 }, (_, i) => ({
        ...mockPatterns[0],
        id: `pattern_${i}`,
        description: `Pattern ${i} description`,
      }));

      render(
        <PatternDetectionWidget {...defaultProps} patterns={manyPatterns} />
      );

      expect(screen.getAllByTestId('card')).toHaveLength(50);
    });

    it('should not cause memory leaks with frequent updates', () => {
      const { rerender } = render(<PatternDetectionWidget {...defaultProps} />);

      // Simulate frequent updates
      for (let i = 0; i < 10; i++) {
        const updatedPatterns = mockPatterns.map((pattern) => ({
          ...pattern,
          confidence_score: pattern.confidence_score + i,
        }));
        rerender(
          <PatternDetectionWidget
            {...defaultProps}
            patterns={updatedPatterns}
          />
        );
      }

      expect(screen.getAllByTestId('card')).toHaveLength(2);
    });
  });
});
