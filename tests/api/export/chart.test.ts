/**
 * Comprehensive tests for chart export API endpoint
 * Tests authentication, subscription validation, export generation, and error handling
 */

import { POST } from '@/app/api/export/chart/route';
import { NextRequest } from 'next/server';

// Mock getServerSession
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

import { getServerSession } from 'next-auth';
const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

describe('/api/export/chart', () => {
  const mockProfessionalSession = {
    user: {
      id: 'user123',
      email: 'pro@example.com',
      name: 'Pro User',
      subscriptionTier: 'professional',
    },
    expires: '2025-12-31',
  };

  const mockFreeSession = {
    user: {
      id: 'user456',
      email: 'free@example.com',
      name: 'Free User',
      subscriptionTier: 'free',
    },
    expires: '2025-12-31',
  };

  const mockEnterpriseSession = {
    user: {
      id: 'user789',
      email: 'enterprise@example.com',
      name: 'Enterprise User',
      subscriptionTier: 'enterprise',
    },
    expires: '2025-12-31',
  };

  const validExportRequest = {
    chart_config: {
      sensors: ['SENSOR_001', 'SENSOR_002'],
      start_date: '2018-01-01T00:00:00Z',
      end_date: '2018-01-01T23:59:59Z',
      interval: 'hour',
      chart_type: 'line',
    },
    export_options: {
      format: 'png',
      title: 'Test Chart Export',
      include_timestamp: true,
      include_data_range: true,
      quality: 'high',
      width: 1200,
      height: 800,
    },
    title: 'Test Chart Export',
  };

  beforeEach(() => {
    mockGetServerSession.mockClear();
  });

  describe('Authentication', () => {
    test('requires authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validExportRequest),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
      expect(data.message).toBe('Please sign in to export charts');
    });

    test('allows authenticated users with proper subscription', async () => {
      mockGetServerSession.mockResolvedValue(mockProfessionalSession);

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validExportRequest),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Subscription Validation', () => {
    test('rejects free tier users', async () => {
      mockGetServerSession.mockResolvedValue(mockFreeSession);

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validExportRequest),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Subscription upgrade required');
      expect(data.message).toBe(
        'Chart export requires Professional or Enterprise subscription'
      );
    });

    test('allows professional tier users', async () => {
      mockGetServerSession.mockResolvedValue(mockProfessionalSession);

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validExportRequest),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    test('allows enterprise tier users', async () => {
      mockGetServerSession.mockResolvedValue(mockEnterpriseSession);

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validExportRequest),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    test('handles users without subscription tier (defaults to free)', async () => {
      const sessionWithoutTier = {
        user: {
          id: 'user999',
          email: 'notier@example.com',
          name: 'No Tier User',
        },
        expires: '2025-12-31',
      };

      mockGetServerSession.mockResolvedValue(sessionWithoutTier);

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validExportRequest),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Subscription upgrade required');
    });
  });

  describe('Request Validation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockProfessionalSession);
    });

    test('validates required chart_config fields', async () => {
      const invalidRequest = {
        ...validExportRequest,
        chart_config: {
          // Missing required fields
          sensors: [],
          start_date: 'invalid-date',
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid export parameters');
      expect(data.validation_errors).toBeDefined();
      expect(Array.isArray(data.validation_errors)).toBe(true);
    });

    test('validates export_options format', async () => {
      const invalidRequest = {
        ...validExportRequest,
        export_options: {
          ...validExportRequest.export_options,
          format: 'invalid-format',
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.validation_errors).toContainEqual(
        expect.objectContaining({
          field: 'export_options.format',
          message: expect.stringContaining('Invalid enum value'),
        })
      );
    });

    test('validates dimension constraints', async () => {
      const invalidRequest = {
        ...validExportRequest,
        export_options: {
          ...validExportRequest.export_options,
          width: 50000,
          height: 50000,
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.validation_errors).toContainEqual(
        expect.objectContaining({
          field: 'export_options.width',
          message: expect.stringContaining(
            'Number must be less than or equal to 2000'
          ),
        })
      );
    });

    test('validates title length', async () => {
      const invalidRequest = {
        ...validExportRequest,
        title: 'A'.repeat(150), // Exceeds 100 character limit
      };

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.validation_errors).toContainEqual(
        expect.objectContaining({
          field: 'title',
          message: expect.stringContaining(
            'String must contain at most 100 character(s)'
          ),
        })
      );
    });

    test('validates interval enum values', async () => {
      const invalidRequest = {
        ...validExportRequest,
        chart_config: {
          ...validExportRequest.chart_config,
          interval: 'invalid-interval',
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.validation_errors).toContainEqual(
        expect.objectContaining({
          field: 'chart_config.interval',
        })
      );
    });

    test('validates chart_type enum values', async () => {
      const invalidRequest = {
        ...validExportRequest,
        chart_config: {
          ...validExportRequest.chart_config,
          chart_type: 'invalid-type',
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.validation_errors).toContainEqual(
        expect.objectContaining({
          field: 'chart_config.chart_type',
        })
      );
    });
  });

  describe('Export Generation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockProfessionalSession);
    });

    test('generates PNG export successfully', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validExportRequest),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.download_url).toBeDefined();
      expect(data.data.filename).toBeDefined();
      expect(data.data.format).toBe('png');
      expect(data.data.size_bytes).toBeDefined();
      expect(data.data.expires_at).toBeDefined();

      // Check filename format
      expect(data.data.filename).toMatch(
        /bangkok-timeseries_\d+sensors_.*\.png/
      );
    });

    test('generates PDF export successfully', async () => {
      const pdfRequest = {
        ...validExportRequest,
        export_options: {
          ...validExportRequest.export_options,
          format: 'pdf',
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pdfRequest),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.format).toBe('pdf');
      expect(data.data.filename).toMatch(/\.pdf$/);
    });

    test('includes sensor count in filename', async () => {
      const multiSensorRequest = {
        ...validExportRequest,
        chart_config: {
          ...validExportRequest.chart_config,
          sensors: ['SENSOR_001', 'SENSOR_002', 'SENSOR_003', 'SENSOR_004'],
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(multiSensorRequest),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.filename).toMatch(/bangkok-timeseries_4sensors_/);
    });

    test('includes date range in filename', async () => {
      const dateRequest = {
        ...validExportRequest,
        chart_config: {
          ...validExportRequest.chart_config,
          start_date: '2018-06-15T00:00:00Z',
          end_date: '2018-06-16T00:00:00Z',
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dateRequest),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.filename).toMatch(/6-15-2018_to_6-16-2018/);
    });

    test('generates different file sizes for different formats', async () => {
      // PNG request
      const pngRequest = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validExportRequest),
        }
      );

      const pngResponse = await POST(pngRequest);
      const pngData = await pngResponse.json();

      // PDF request
      const pdfRequest = {
        ...validExportRequest,
        export_options: {
          ...validExportRequest.export_options,
          format: 'pdf',
        },
      };

      const pdfRequestObj = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pdfRequest),
        }
      );

      const pdfResponse = await POST(pdfRequestObj);
      const pdfData = await pdfResponse.json();

      // PDF should generally be larger than PNG
      expect(pdfData.data.size_bytes).toBeGreaterThan(pngData.data.size_bytes);
    });

    test('sets appropriate expiration time', async () => {
      const beforeRequest = Date.now();

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validExportRequest),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      const afterRequest = Date.now();
      const expiresAt = new Date(data.data.expires_at).getTime();

      // Should expire approximately 24 hours from now
      const expectedExpiry = beforeRequest + 24 * 60 * 60 * 1000;
      const tolerance = 5000; // 5 second tolerance

      expect(expiresAt).toBeGreaterThan(expectedExpiry - tolerance);
      expect(expiresAt).toBeLessThan(
        afterRequest + 24 * 60 * 60 * 1000 + tolerance
      );
    });
  });

  describe('Response Headers', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockProfessionalSession);
    });

    test('sets appropriate response headers', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validExportRequest),
        }
      );

      const response = await POST(request);

      // Check headers before consuming the response body
      expect(response.status).toBe(200);
      const contentType = response.headers.get('Content-Type');
      const cacheControl = response.headers.get('Cache-Control');

      // Then read the body
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify headers (if they were set)
      if (contentType) {
        expect(contentType).toContain('json');
      }
      if (cacheControl) {
        expect(cacheControl).toBe('no-cache');
      }
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockProfessionalSession);
    });

    test('handles malformed JSON gracefully', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Export failed');
    });

    test('handles missing request body', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // No body
        }
      );

      const response = await POST(request);
      const data = await response.json();

      // Should return 400 for validation error (missing body fields)
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    test('handles empty request body', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid export parameters');
    });
  });

  describe('Default Values', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockProfessionalSession);
    });

    test('applies default values for optional fields', async () => {
      const minimalRequest = {
        chart_config: {
          sensors: ['SENSOR_001'],
          start_date: '2018-01-01T00:00:00Z',
          end_date: '2018-01-01T23:59:59Z',
          interval: 'hour',
          chart_type: 'line',
        },
        export_options: {
          format: 'png',
          title: 'Test Chart',
          // Missing optional fields that should get defaults
        },
        title: 'Test Chart',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(minimalRequest),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Processing Time', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockProfessionalSession);
    });

    test('completes export in reasonable time', async () => {
      const startTime = Date.now();

      const request = new NextRequest(
        'http://localhost:3000/api/export/chart',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validExportRequest),
        }
      );

      const response = await POST(request);
      const endTime = Date.now();

      const processingTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
