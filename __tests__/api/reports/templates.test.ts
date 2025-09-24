import { GET, POST } from '@/app/api/reports/templates/route'
import { getServerSession } from 'next-auth'
import { validateSubscription } from '@/lib/middleware/subscription'
import { prisma } from '@/lib/database/connection'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/middleware/subscription')
jest.mock('@/lib/database/connection')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockValidateSubscription = validateSubscription as jest.MockedFunction<typeof validateSubscription>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/reports/templates', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    }
  }

  const mockTemplate = {
    id: 'template-123',
    user_id: 'user-123',
    name: 'Test Template',
    category: 'executive',
    template_data: {},
    is_public: false,
    version: '1.0',
    tags: [],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    usage_count: 0,
    shared_templates: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession as unknown)
    mockValidateSubscription.mockResolvedValue(true)
  })

  describe('GET /api/reports/templates', () => {
    it('should return templates for authenticated Professional user', async () => {
      mockPrisma.reportTemplate.findMany.mockResolvedValue([mockTemplate] as unknown)

      const request = new NextRequest('http://localhost/api/reports/templates')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.templates).toHaveLength(1)
      expect(data.templates[0]).toMatchObject({
        id: 'template-123',
        name: 'Test Template',
        permission_level: 'admin'
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/reports/templates')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 for non-Professional user', async () => {
      mockValidateSubscription.mockResolvedValue(false)

      const request = new NextRequest('http://localhost/api/reports/templates')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Professional tier subscription required')
    })

    it('should filter templates by category', async () => {
      mockPrisma.reportTemplate.findMany.mockResolvedValue([mockTemplate] as unknown)

      const request = new NextRequest('http://localhost/api/reports/templates?category=executive')
      const response = await GET(request)

      expect(mockPrisma.reportTemplate.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          AND: [
            expect.any(Object),
            { category: 'executive' }
          ]
        }),
        include: expect.any(Object),
        orderBy: { updated_at: 'desc' }
      })
    })

    it('should return public templates only when requested', async () => {
      const request = new NextRequest('http://localhost/api/reports/templates?public=true')
      await GET(request)

      expect(mockPrisma.reportTemplate.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          AND: [
            { is_public: true },
            {}
          ]
        }),
        include: expect.any(Object),
        orderBy: { updated_at: 'desc' }
      })
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.reportTemplate.findMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/reports/templates')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/reports/templates', () => {
    const validTemplateData = {
      name: 'New Template',
      category: 'custom',
      description: 'Test description',
      template_data: {
        layout: {},
        components: [],
        styling: {},
        branding: {},
        data_configuration: {}
      },
      is_public: false,
      tags: ['test']
    }

    it('should create a new template for authenticated Professional user', async () => {
      mockPrisma.reportTemplate.count.mockResolvedValue(0)
      mockPrisma.reportTemplate.create.mockResolvedValue(mockTemplate as unknown)

      const request = new NextRequest('http://localhost/api/reports/templates', {
        method: 'POST',
        body: JSON.stringify(validTemplateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.template).toMatchObject({
        id: 'template-123',
        name: 'Test Template'
      })

      expect(mockPrisma.reportTemplate.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-123',
          name: 'New Template',
          description: 'Test description',
          category: 'custom',
          template_data: validTemplateData.template_data,
          is_public: false,
          tags: ['test'],
          version: '1.0'
        }
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/reports/templates', {
        method: 'POST',
        body: JSON.stringify(validTemplateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 for non-Professional user', async () => {
      mockValidateSubscription.mockResolvedValue(false)

      const request = new NextRequest('http://localhost/api/reports/templates', {
        method: 'POST',
        body: JSON.stringify(validTemplateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Professional tier subscription required')
    })

    it('should validate template data schema', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        category: 'invalid', // Invalid: not in enum
      }

      const request = new NextRequest('http://localhost/api/reports/templates', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should enforce template limit (50 per user)', async () => {
      mockPrisma.reportTemplate.count.mockResolvedValue(50)

      const request = new NextRequest('http://localhost/api/reports/templates', {
        method: 'POST',
        body: JSON.stringify(validTemplateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Template limit reached')
    })

    it('should handle database creation errors', async () => {
      mockPrisma.reportTemplate.count.mockResolvedValue(0)
      mockPrisma.reportTemplate.create.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/reports/templates', {
        method: 'POST',
        body: JSON.stringify(validTemplateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should set default values for optional fields', async () => {
      const minimalData = {
        name: 'Minimal Template',
        category: 'custom'
      }

      mockPrisma.reportTemplate.count.mockResolvedValue(0)
      mockPrisma.reportTemplate.create.mockResolvedValue(mockTemplate as unknown)

      const request = new NextRequest('http://localhost/api/reports/templates', {
        method: 'POST',
        body: JSON.stringify(minimalData),
        headers: { 'Content-Type': 'application/json' }
      })

      await POST(request)

      expect(mockPrisma.reportTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          template_data: {},
          is_public: false,
          tags: [],
          version: '1.0'
        })
      })
    })

    it('should handle JSON parsing errors', async () => {
      const request = new NextRequest('http://localhost/api/reports/templates', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('Subscription Validation', () => {
    it('should call validateSubscription with correct parameters', async () => {
      mockPrisma.reportTemplate.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/reports/templates')
      await GET(request)

      expect(mockValidateSubscription).toHaveBeenCalledWith('user-123', 'Professional')
    })

    it('should handle subscription validation errors', async () => {
      mockValidateSubscription.mockRejectedValue(new Error('Subscription error'))

      const request = new NextRequest('http://localhost/api/reports/templates')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('Authorization and Permissions', () => {
    it('should include shared templates with correct permission levels', async () => {
      const sharedTemplate = {
        ...mockTemplate,
        id: 'shared-template',
        user_id: 'other-user',
        shared_templates: [{
          permission_level: 'edit'
        }]
      }

      mockPrisma.reportTemplate.findMany.mockResolvedValue([sharedTemplate] as unknown)

      const request = new NextRequest('http://localhost/api/reports/templates')
      const response = await GET(request)
      const data = await response.json()

      expect(data.templates[0].permission_level).toBe('edit')
    })

    it('should set admin permission for own templates', async () => {
      mockPrisma.reportTemplate.findMany.mockResolvedValue([mockTemplate] as unknown)

      const request = new NextRequest('http://localhost/api/reports/templates')
      const response = await GET(request)
      const data = await response.json()

      expect(data.templates[0].permission_level).toBe('admin')
    })
  })
})