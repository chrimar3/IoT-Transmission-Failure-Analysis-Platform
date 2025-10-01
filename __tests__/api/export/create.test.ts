/**
 * Epic 2 Story 2.3: Export Functionality for Professional Tier
 * Tests for export creation API endpoint
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/export/create/route';

// Mock dependencies
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth/config', () => ({
  authOptions: {},
}));

jest.mock('@/src/lib/export/export-manager', () => ({
  ExportManager: {
    getInstance: jest.fn(() => ({
      createExportJob: jest.fn(),
      getUserExportHistory: jest.fn(),
    })),
  },
}));

jest.mock('@/src/lib/api/authentication', () => ({
  validateAPIKey: jest.fn(),
}));

jest.mock('@/src/lib/api/rate-limiting', () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock('@/src/lib/export/usage-tracking-service', () => ({
  exportUsageTrackingService: {
    canUserExport: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth/next';
import { ExportManager } from '@/src/lib/export/export-manager';
import { validateAPIKey } from '@/src/lib/api/authentication';
import { checkRateLimit } from '@/src/lib/api/rate-limiting';
import { exportUsageTrackingService } from '@/src/lib/export/usage-tracking-service';

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockValidateAPIKey = validateAPIKey as jest.MockedFunction<
  typeof validateAPIKey
>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<
  typeof checkRateLimit
>;
const mockCanUserExport =
  exportUsageTrackingService.canUserExport as jest.MockedFunction<
    typeof exportUsageTrackingService.canUserExport
  >;

describe('/api/export/create', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      retryAfter: 0,
    });

    // Default export usage check - allow exports
    mockCanUserExport.mockResolvedValue({
      canExport: true,
      currentCount: 5,
      limit: 100,
      percentageUsed: 5,
      resetsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      message: '5 of 100 exports used this month',
    });
  });

  describe('POST - Create Export Job', () => {
    const validExportRequest = {
      format: 'pdf',
      template: 'executive',
      dateRange: {
        start: '2018-01-01',
        end: '2018-12-31',
      },
    };

    const mockExportJob = {
      id: 'export_123_abc123',
      userId: 'user-123',
      format: 'pdf',
      template: 'executive',
      dateRange: { start: '2018-01-01', end: '2018-12-31' },
      status: 'queued',
      progress: 0,
      createdAt: '2023-09-25T12:00:00Z',
    };

    describe('Authentication', () => {
      it('should accept Professional tier web session', async () => {
        mockGetServerSession.mockResolvedValue({
          user: {
            id: 'user-123',
            subscriptionTier: 'PROFESSIONAL',
          },
        });

        const mockExportManager = {
          createExportJob: jest.fn().mockResolvedValue(mockExportJob),
        };
        (ExportManager.getInstance as jest.Mock).mockReturnValue(
          mockExportManager
        );

        const request = new NextRequest(
          'http://localhost:3000/api/export/create',
          {
            method: 'POST',
            body: JSON.stringify(validExportRequest),
          }
        );

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.data.jobId).toBe(mockExportJob.id);
        expect(mockExportManager.createExportJob).toHaveBeenCalledWith(
          'user-123',
          'pdf',
          'executive',
          { start: '2018-01-01', end: '2018-12-31' }
        );
      });

      it('should reject FREE tier web session', async () => {
        mockGetServerSession.mockResolvedValue({
          user: {
            id: 'user-123',
            subscriptionTier: 'FREE',
          },
        });

        const request = new NextRequest(
          'http://localhost:3000/api/export/create',
          {
            method: 'POST',
            body: JSON.stringify(validExportRequest),
          }
        );

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(403);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Professional subscription required');
      });

      it('should accept Professional tier API key', async () => {
        mockGetServerSession.mockResolvedValue(null);
        mockValidateAPIKey.mockResolvedValue({
          valid: true,
          tier: 'PROFESSIONAL',
          userId: 'user-456',
        });

        const mockExportManager = {
          createExportJob: jest.fn().mockResolvedValue({
            ...mockExportJob,
            userId: 'user-456',
          }),
        };
        (ExportManager.getInstance as jest.Mock).mockReturnValue(
          mockExportManager
        );

        const request = new NextRequest(
          'http://localhost:3000/api/export/create',
          {
            method: 'POST',
            headers: {
              Authorization: 'Bearer professional-api-key',
            },
            body: JSON.stringify(validExportRequest),
          }
        );

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(mockExportManager.createExportJob).toHaveBeenCalledWith(
          'user-456',
          'pdf',
          'executive',
          { start: '2018-01-01', end: '2018-12-31' }
        );
      });

      it('should reject FREE tier API key', async () => {
        mockGetServerSession.mockResolvedValue(null);
        mockValidateAPIKey.mockResolvedValue({
          valid: true,
          tier: 'FREE',
          userId: 'user-456',
        });

        const request = new NextRequest(
          'http://localhost:3000/api/export/create',
          {
            method: 'POST',
            headers: {
              Authorization: 'Bearer free-api-key',
            },
            body: JSON.stringify(validExportRequest),
          }
        );

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(403);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Professional API key required');
      });
    });

    describe('Rate Limiting', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue({
          user: {
            id: 'user-123',
            subscriptionTier: 'PROFESSIONAL',
          },
        });
      });

      it('should allow requests within rate limit', async () => {
        mockCheckRateLimit.mockResolvedValue({
          allowed: true,
          retryAfter: 0,
        });

        const mockExportManager = {
          createExportJob: jest.fn().mockResolvedValue(mockExportJob),
        };
        (ExportManager.getInstance as jest.Mock).mockReturnValue(
          mockExportManager
        );

        const request = new NextRequest(
          'http://localhost:3000/api/export/create',
          {
            method: 'POST',
            body: JSON.stringify(validExportRequest),
          }
        );

        const response = await POST(request);

        expect(response.status).toBe(200);
        expect(mockCheckRateLimit).toHaveBeenCalledWith('user-123', 'export', {
          maxRequests: 10,
          windowMs: 60000,
        });
      });

      it('should reject requests exceeding rate limit', async () => {
        mockCheckRateLimit.mockResolvedValue({
          allowed: false,
          retryAfter: 30,
        });

        const request = new NextRequest(
          'http://localhost:3000/api/export/create',
          {
            method: 'POST',
            body: JSON.stringify(validExportRequest),
          }
        );

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(429);
        expect(result.success).toBe(false);
        expect(result.error).toContain('rate limit exceeded');
        expect(result.retryAfter).toBe(30);
      });
    });

    describe('Request Validation', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue({
          user: {
            id: 'user-123',
            subscriptionTier: 'PROFESSIONAL',
          },
        });
      });

      it('should validate export format', async () => {
        const invalidRequest = {
          ...validExportRequest,
          format: 'invalid-format',
        };

        const request = new NextRequest(
          'http://localhost:3000/api/export/create',
          {
            method: 'POST',
            body: JSON.stringify(invalidRequest),
          }
        );

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid format');
      });

      it('should validate template', async () => {
        const invalidRequest = {
          ...validExportRequest,
          template: 'invalid-template',
        };

        const request = new NextRequest(
          'http://localhost:3000/api/export/create',
          {
            method: 'POST',
            body: JSON.stringify(invalidRequest),
          }
        );

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid template');
      });

      it('should validate date range presence', async () => {
        const invalidRequest = {
          format: 'pdf',
          template: 'executive',
          // Missing dateRange
        };

        const request = new NextRequest(
          'http://localhost:3000/api/export/create',
          {
            method: 'POST',
            body: JSON.stringify(invalidRequest),
          }
        );

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Date range required');
      });

      it('should validate Bangkok dataset date range', async () => {
        const invalidRequest = {
          ...validExportRequest,
          dateRange: {
            start: '2020-01-01', // Outside Bangkok study period
            end: '2020-12-31',
          },
        };

        const request = new NextRequest(
          'http://localhost:3000/api/export/create',
          {
            method: 'POST',
            body: JSON.stringify(invalidRequest),
          }
        );

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Bangkok study period');
      });

      it('should validate start date before end date', async () => {
        const invalidRequest = {
          ...validExportRequest,
          dateRange: {
            start: '2018-12-31',
            end: '2018-01-01', // End before start
          },
        };

        const request = new NextRequest(
          'http://localhost:3000/api/export/create',
          {
            method: 'POST',
            body: JSON.stringify(invalidRequest),
          }
        );

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Start date must be before end date');
      });
    });

    describe('Export Job Creation', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue({
          user: {
            id: 'user-123',
            subscriptionTier: 'PROFESSIONAL',
          },
        });
      });

      it('should create export job successfully', async () => {
        const mockExportManager = {
          createExportJob: jest.fn().mockResolvedValue(mockExportJob),
        };
        (ExportManager.getInstance as jest.Mock).mockReturnValue(
          mockExportManager
        );

        const request = new NextRequest(
          'http://localhost:3000/api/export/create',
          {
            method: 'POST',
            body: JSON.stringify(validExportRequest),
          }
        );

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
          jobId: mockExportJob.id,
          status: mockExportJob.status,
          progress: mockExportJob.progress,
          format: mockExportJob.format,
          template: mockExportJob.template,
          dateRange: mockExportJob.dateRange,
          createdAt: mockExportJob.createdAt,
        });
      });

      it('should handle export job creation errors', async () => {
        const mockExportManager = {
          createExportJob: jest
            .fn()
            .mockRejectedValue(new Error('Export creation failed')),
        };
        (ExportManager.getInstance as jest.Mock).mockReturnValue(
          mockExportManager
        );

        const request = new NextRequest(
          'http://localhost:3000/api/export/create',
          {
            method: 'POST',
            body: JSON.stringify(validExportRequest),
          }
        );

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Internal server error');
      });
    });
  });

  describe('GET - Export History', () => {
    const mockExportHistory = [
      {
        id: 'export_123_abc',
        userId: 'user-123',
        format: 'pdf',
        template: 'executive',
        dateRange: { start: '2018-01-01', end: '2018-12-31' },
        status: 'completed',
        progress: 100,
        createdAt: '2023-09-25T12:00:00Z',
        completedAt: '2023-09-25T12:05:00Z',
        downloadUrl: 'https://exports.cu-bems.com/downloads/report.pdf',
      },
      {
        id: 'export_124_def',
        userId: 'user-123',
        format: 'csv',
        template: 'technical',
        dateRange: { start: '2018-06-01', end: '2018-06-30' },
        status: 'processing',
        progress: 75,
        createdAt: '2023-09-25T11:00:00Z',
      },
    ];

    describe('Authentication', () => {
      it('should return history for Professional tier web session', async () => {
        mockGetServerSession.mockResolvedValue({
          user: {
            id: 'user-123',
            subscriptionTier: 'PROFESSIONAL',
          },
        });

        const mockExportManager = {
          getUserExportHistory: jest.fn().mockReturnValue(mockExportHistory),
        };
        (ExportManager.getInstance as jest.Mock).mockReturnValue(
          mockExportManager
        );

        const request = new NextRequest(
          'http://localhost:3000/api/export/create'
        );

        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockExportHistory);
        expect(mockExportManager.getUserExportHistory).toHaveBeenCalledWith(
          'user-123'
        );
      });

      it('should reject FREE tier web session', async () => {
        mockGetServerSession.mockResolvedValue({
          user: {
            id: 'user-123',
            subscriptionTier: 'FREE',
          },
        });

        const request = new NextRequest(
          'http://localhost:3000/api/export/create'
        );

        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(403);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Professional subscription required');
      });

      it('should return history for Professional tier API key', async () => {
        mockGetServerSession.mockResolvedValue(null);
        mockValidateAPIKey.mockResolvedValue({
          valid: true,
          tier: 'PROFESSIONAL',
          userId: 'user-456',
        });

        const mockExportManager = {
          getUserExportHistory: jest.fn().mockReturnValue([]),
        };
        (ExportManager.getInstance as jest.Mock).mockReturnValue(
          mockExportManager
        );

        const request = new NextRequest(
          'http://localhost:3000/api/export/create',
          {
            headers: {
              Authorization: 'Bearer professional-api-key',
            },
          }
        );

        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(mockExportManager.getUserExportHistory).toHaveBeenCalledWith(
          'user-456'
        );
      });
    });

    it('should handle export history errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-123',
          subscriptionTier: 'PROFESSIONAL',
        },
      });

      const mockExportManager = {
        getUserExportHistory: jest.fn().mockImplementation(() => {
          throw new Error('Database error');
        }),
      };
      (ExportManager.getInstance as jest.Mock).mockReturnValue(
        mockExportManager
      );

      const request = new NextRequest(
        'http://localhost:3000/api/export/create'
      );

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });
});
