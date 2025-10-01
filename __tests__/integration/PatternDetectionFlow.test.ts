/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST as detectPatterns } from '@/app/api/patterns/detect/route';
import { POST as acknowledgePattern } from '@/app/api/patterns/acknowledge/route';

// Mock external dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/services/UserSubscriptionService', () => ({
  UserSubscriptionService: {
    checkSubscription: jest.fn(),
  },
}));

jest.mock('@/lib/services/BangkokDataService', () => ({
  BangkokDataService: {
    getSensorData: jest.fn(),
    getEquipmentInfo: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth';
import { UserSubscriptionService } from '@/lib/services/UserSubscriptionService';
import { BangkokDataService } from '@/lib/services/BangkokDataService';

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockCheckSubscription =
  UserSubscriptionService.checkSubscription as jest.MockedFunction<
    typeof UserSubscriptionService.checkSubscription
  >;
const mockGetSensorData =
  BangkokDataService.getSensorData as jest.MockedFunction<
    typeof BangkokDataService.getSensorData
  >;
const mockGetEquipmentInfo =
  BangkokDataService.getEquipmentInfo as jest.MockedFunction<
    typeof BangkokDataService.getEquipmentInfo
  >;

describe('Pattern Detection Integration Flow', () => {
  const mockUser = {
    id: 'user_123',
    email: 'test@cu-bems.com',
    name: 'Test User',
  };

  const mockSession = {
    user: mockUser,
    expires: '2025-12-31T23:59:59.999Z',
  };

  const mockSensorData = [
    {
      timestamp: '2025-01-15T08:00:00Z',
      value: 22.5,
      sensor_id: 'SENSOR_HVAC_001',
      unit: '°C',
      equipment_type: 'HVAC',
    },
    {
      timestamp: '2025-01-15T08:15:00Z',
      value: 22.8,
      sensor_id: 'SENSOR_HVAC_001',
      unit: '°C',
      equipment_type: 'HVAC',
    },
    {
      timestamp: '2025-01-15T08:30:00Z',
      value: 45.2,
      sensor_id: 'SENSOR_HVAC_001',
      unit: '°C',
      equipment_type: 'HVAC',
    }, // Anomaly
    {
      timestamp: '2025-01-15T08:45:00Z',
      value: 23.1,
      sensor_id: 'SENSOR_HVAC_001',
      unit: '°C',
      equipment_type: 'HVAC',
    },
    {
      timestamp: '2025-01-15T09:00:00Z',
      value: 22.9,
      sensor_id: 'SENSOR_HVAC_001',
      unit: '°C',
      equipment_type: 'HVAC',
    },
  ];

  const mockEquipmentInfo = [
    {
      equipment_id: 'SENSOR_HVAC_001',
      type: 'HVAC',
      location: 'North Wing, Floor 3',
      floor: 3,
      status: 'operational',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockGetServerSession.mockResolvedValue(mockSession);
    mockCheckSubscription.mockResolvedValue({
      isAdvanced: true,
      tier: 'professional',
      limits: { sensors: 50, patterns: 1000 },
    });
    mockGetSensorData.mockResolvedValue(mockSensorData);
    mockGetEquipmentInfo.mockResolvedValue(mockEquipmentInfo);
  });

  describe('End-to-End Pattern Detection and Acknowledgment Flow', () => {
    it('should complete full pattern detection and acknowledgment workflow', async () => {
      // Step 1: Detect patterns
      const detectRequest = new NextRequest(
        'http://localhost/api/patterns/detect',
        {
          method: 'POST',
          body: JSON.stringify({
            sensor_ids: ['SENSOR_HVAC_001'],
            time_window: '24h',
            confidence_threshold: 70,
            include_recommendations: true,
          }),
        }
      );

      const detectResponse = await detectPatterns(detectRequest);
      const detectData = await detectResponse.json();

      // Verify pattern detection succeeded
      expect(detectResponse.status).toBe(200);
      expect(detectData.success).toBe(true);
      expect(detectData.data.patterns).toBeDefined();
      expect(detectData.data.summary).toBeDefined();

      // Should detect the anomaly in our mock data
      expect(detectData.data.patterns.length).toBeGreaterThan(0);

      const detectedPattern = detectData.data.patterns[0];
      expect(detectedPattern.id).toBeDefined();
      expect(detectedPattern.sensor_id).toBe('SENSOR_HVAC_001');
      expect(detectedPattern.equipment_type).toBe('HVAC');
      expect(detectedPattern.acknowledged).toBe(false);

      // Step 2: Acknowledge the detected pattern
      const acknowledgeRequest = new NextRequest(
        'http://localhost/api/patterns/acknowledge',
        {
          method: 'POST',
          body: JSON.stringify({
            pattern_id: detectedPattern.id,
            notes:
              'Investigated temperature spike, appears to be sensor calibration issue',
            action_planned: 'Schedule sensor recalibration for tomorrow',
            follow_up_required: true,
            follow_up_date: '2025-01-16T09:00:00Z',
          }),
        }
      );

      const acknowledgeResponse = await acknowledgePattern(acknowledgeRequest);
      const acknowledgeData = await acknowledgeResponse.json();

      // Verify acknowledgment succeeded
      expect(acknowledgeResponse.status).toBe(200);
      expect(acknowledgeData.success).toBe(true);
      expect(acknowledgeData.data.acknowledgment).toBeDefined();
      expect(acknowledgeData.data.acknowledgment.pattern_id).toBe(
        detectedPattern.id
      );
      expect(acknowledgeData.data.acknowledgment.acknowledged_by).toBe(
        mockUser.email
      );
      expect(acknowledgeData.data.acknowledgment.notes).toBe(
        'Investigated temperature spike, appears to be sensor calibration issue'
      );
      expect(acknowledgeData.data.acknowledgment.follow_up_required).toBe(true);
    });

    it('should handle multiple sensors with different patterns', async () => {
      // Mock data for multiple sensors with different anomaly types
      mockGetSensorData.mockResolvedValueOnce([
        // HVAC sensor with temperature anomaly
        {
          timestamp: '2025-01-15T08:00:00Z',
          value: 22.5,
          sensor_id: 'SENSOR_HVAC_001',
          unit: '°C',
          equipment_type: 'HVAC',
        },
        {
          timestamp: '2025-01-15T08:15:00Z',
          value: 45.0,
          sensor_id: 'SENSOR_HVAC_001',
          unit: '°C',
          equipment_type: 'HVAC',
        }, // Spike
        {
          timestamp: '2025-01-15T08:30:00Z',
          value: 22.8,
          sensor_id: 'SENSOR_HVAC_001',
          unit: '°C',
          equipment_type: 'HVAC',
        },
        // Lighting sensor with gradual increase trend
        {
          timestamp: '2025-01-15T08:00:00Z',
          value: 150,
          sensor_id: 'SENSOR_LIGHT_001',
          unit: 'lux',
          equipment_type: 'Lighting',
        },
        {
          timestamp: '2025-01-15T08:15:00Z',
          value: 155,
          sensor_id: 'SENSOR_LIGHT_001',
          unit: 'lux',
          equipment_type: 'Lighting',
        },
        {
          timestamp: '2025-01-15T08:30:00Z',
          value: 160,
          sensor_id: 'SENSOR_LIGHT_001',
          unit: 'lux',
          equipment_type: 'Lighting',
        },
        {
          timestamp: '2025-01-15T08:45:00Z',
          value: 165,
          sensor_id: 'SENSOR_LIGHT_001',
          unit: 'lux',
          equipment_type: 'Lighting',
        }, // Trend
      ]);

      const detectRequest = new NextRequest(
        'http://localhost/api/patterns/detect',
        {
          method: 'POST',
          body: JSON.stringify({
            sensor_ids: ['SENSOR_HVAC_001', 'SENSOR_LIGHT_001'],
            time_window: '6h',
            confidence_threshold: 75,
            pattern_types: ['anomaly', 'trend'],
            include_recommendations: true,
          }),
        }
      );

      const response = await detectPatterns(detectRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.patterns.length).toBeGreaterThan(0);

      // Should detect different pattern types
      const patternTypes = data.data.patterns.map((p: any) => p.pattern_type);
      expect(patternTypes).toContain('anomaly');

      // Should have appropriate recommendations for each pattern type
      const patternsWithRecommendations = data.data.patterns.filter(
        (p: any) => p.recommendations.length > 0
      );
      expect(patternsWithRecommendations.length).toBeGreaterThan(0);
    });

    it('should enforce subscription limits correctly', async () => {
      // Test free tier limits
      mockCheckSubscription.mockResolvedValue({
        isAdvanced: false,
        tier: 'free',
        limits: { sensors: 5, patterns: 100 },
      });

      const detectRequest = new NextRequest(
        'http://localhost/api/patterns/detect',
        {
          method: 'POST',
          body: JSON.stringify({
            sensor_ids: Array.from({ length: 10 }, (_, i) => `SENSOR_${i + 1}`), // Exceed free limit
            time_window: '24h',
          }),
        }
      );

      const response = await detectPatterns(detectRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Subscription limit exceeded');
      expect(data.upgrade_required).toBe(true);
    });

    it('should handle authentication failures gracefully', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const detectRequest = new NextRequest(
        'http://localhost/api/patterns/detect',
        {
          method: 'POST',
          body: JSON.stringify({
            sensor_ids: ['SENSOR_001'],
            time_window: '24h',
          }),
        }
      );

      const response = await detectPatterns(detectRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should prevent duplicate pattern acknowledgments', async () => {
      // First, detect a pattern
      const detectRequest = new NextRequest(
        'http://localhost/api/patterns/detect',
        {
          method: 'POST',
          body: JSON.stringify({
            sensor_ids: ['SENSOR_HVAC_001'],
            time_window: '24h',
          }),
        }
      );

      const detectResponse = await detectPatterns(detectRequest);
      const detectData = await detectResponse.json();
      const patternId = detectData.data.patterns[0]?.id;

      if (patternId) {
        // Acknowledge the pattern first time
        const acknowledgeRequest1 = new NextRequest(
          'http://localhost/api/patterns/acknowledge',
          {
            method: 'POST',
            body: JSON.stringify({
              pattern_id: patternId,
              notes: 'First acknowledgment',
            }),
          }
        );

        const response1 = await acknowledgePattern(acknowledgeRequest1);
        expect(response1.status).toBe(200);

        // Try to acknowledge the same pattern again
        const acknowledgeRequest2 = new NextRequest(
          'http://localhost/api/patterns/acknowledge',
          {
            method: 'POST',
            body: JSON.stringify({
              pattern_id: patternId,
              notes: 'Second acknowledgment',
            }),
          }
        );

        const response2 = await acknowledgePattern(acknowledgeRequest2);
        const data2 = await response2.json();

        expect(response2.status).toBe(409);
        expect(data2.success).toBe(false);
        expect(data2.error).toBe('Pattern already acknowledged');
      }
    });

    it('should handle high-volume concurrent requests', async () => {
      const concurrentRequests = Array.from(
        { length: 5 },
        (_, i) =>
          new NextRequest('http://localhost/api/patterns/detect', {
            method: 'POST',
            body: JSON.stringify({
              sensor_ids: [`SENSOR_CONCURRENT_${i + 1}`],
              time_window: '1h',
            }),
          })
      );

      const responses = await Promise.all(
        concurrentRequests.map((request) => detectPatterns(request))
      );

      // All requests should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      }
    });

    it('should provide comprehensive error information for debugging', async () => {
      // Simulate a data service failure
      mockGetSensorData.mockRejectedValue(
        new Error('Database connection failed')
      );

      const detectRequest = new NextRequest(
        'http://localhost/api/patterns/detect',
        {
          method: 'POST',
          body: JSON.stringify({
            sensor_ids: ['SENSOR_HVAC_001'],
            time_window: '24h',
          }),
        }
      );

      const response = await detectPatterns(detectRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error_id).toBeDefined();
      expect(data.error_id).toMatch(/^DET_\d+_[a-z0-9]+$/);
      expect(data.timestamp).toBeDefined();
      expect(data.support_contact).toBe('support@cu-bems.com');
    });

    it('should handle malformed request data gracefully', async () => {
      const invalidRequest = new NextRequest(
        'http://localhost/api/patterns/detect',
        {
          method: 'POST',
          body: 'invalid json{',
        }
      );

      const response = await detectPatterns(invalidRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON');
    });

    it('should validate follow-up requirements in acknowledgments', async () => {
      const acknowledgeRequest = new NextRequest(
        'http://localhost/api/patterns/acknowledge',
        {
          method: 'POST',
          body: JSON.stringify({
            pattern_id: 'pattern_test_001',
            notes: 'Test acknowledgment',
            follow_up_required: true,
            // Missing follow_up_date
          }),
        }
      );

      const response = await acknowledgePattern(acknowledgeRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Follow-up date required');
      expect(data.message).toBe(
        'Follow-up date must be specified when follow-up is required'
      );
    });
  });

  describe('Performance and Reliability', () => {
    it('should complete pattern detection within reasonable time limits', async () => {
      const startTime = Date.now();

      const detectRequest = new NextRequest(
        'http://localhost/api/patterns/detect',
        {
          method: 'POST',
          body: JSON.stringify({
            sensor_ids: ['SENSOR_HVAC_001'],
            time_window: '24h',
          }),
        }
      );

      const response = await detectPatterns(detectRequest);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle data service timeouts gracefully', async () => {
      // Simulate slow data service
      mockGetSensorData.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockSensorData), 100)
          )
      );

      const detectRequest = new NextRequest(
        'http://localhost/api/patterns/detect',
        {
          method: 'POST',
          body: JSON.stringify({
            sensor_ids: ['SENSOR_HVAC_001'],
            time_window: '24h',
          }),
        }
      );

      const response = await detectPatterns(detectRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    }, 10000);

    it('should maintain data consistency across operations', async () => {
      // Detect patterns
      const detectRequest = new NextRequest(
        'http://localhost/api/patterns/detect',
        {
          method: 'POST',
          body: JSON.stringify({
            sensor_ids: ['SENSOR_HVAC_001'],
            time_window: '24h',
          }),
        }
      );

      const detectResponse = await detectPatterns(detectRequest);
      const detectData = await detectResponse.json();

      if (detectData.data.patterns.length > 0) {
        const pattern = detectData.data.patterns[0];

        // Acknowledge the pattern
        const acknowledgeRequest = new NextRequest(
          'http://localhost/api/patterns/acknowledge',
          {
            method: 'POST',
            body: JSON.stringify({
              pattern_id: pattern.id,
              notes: 'Data consistency test',
            }),
          }
        );

        const acknowledgeResponse =
          await acknowledgePattern(acknowledgeRequest);
        const acknowledgeData = await acknowledgeResponse.json();

        // Verify data consistency
        expect(acknowledgeData.data.acknowledgment.pattern_id).toBe(pattern.id);
        expect(acknowledgeData.data.acknowledgment.acknowledged_by).toBe(
          mockUser.email
        );
      }
    });
  });

  describe('Business Logic Validation', () => {
    it('should generate appropriate recommendations based on equipment type', async () => {
      const detectRequest = new NextRequest(
        'http://localhost/api/patterns/detect',
        {
          method: 'POST',
          body: JSON.stringify({
            sensor_ids: ['SENSOR_HVAC_001'],
            time_window: '24h',
            include_recommendations: true,
          }),
        }
      );

      const response = await detectPatterns(detectRequest);
      const data = await response.json();

      if (data.data.patterns.length > 0) {
        const pattern = data.data.patterns[0];
        expect(pattern.equipment_type).toBe('HVAC');

        if (pattern.recommendations.length > 0) {
          // HVAC recommendations should be relevant to HVAC systems
          const recommendationText =
            pattern.recommendations[0].description.toLowerCase();
          expect(
            recommendationText.includes('hvac') ||
              recommendationText.includes('temperature') ||
              recommendationText.includes('cooling') ||
              recommendationText.includes('heating')
          ).toBe(true);
        }
      }
    });

    it('should respect confidence thresholds', async () => {
      const highThresholdRequest = new NextRequest(
        'http://localhost/api/patterns/detect',
        {
          method: 'POST',
          body: JSON.stringify({
            sensor_ids: ['SENSOR_HVAC_001'],
            time_window: '24h',
            confidence_threshold: 95, // Very high threshold
          }),
        }
      );

      const response = await detectPatterns(highThresholdRequest);
      const data = await response.json();

      // All returned patterns should meet the high confidence threshold
      data.data.patterns.forEach((pattern: unknown) => {
        expect(pattern.confidence_score).toBeGreaterThanOrEqual(95);
      });
    });

    it('should audit trail all operations', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const detectRequest = new NextRequest(
        'http://localhost/api/patterns/detect',
        {
          method: 'POST',
          body: JSON.stringify({
            sensor_ids: ['SENSOR_HVAC_001'],
            time_window: '24h',
          }),
        }
      );

      await detectPatterns(detectRequest);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Pattern detection request:',
        expect.objectContaining({
          user_id: mockUser.id,
          sensor_count: 1,
          time_window: '24h',
        })
      );

      consoleSpy.mockRestore();
    });
  });
});
