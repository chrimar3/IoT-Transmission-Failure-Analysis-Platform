import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/database/connection'
import { validateSubscription } from '@/lib/middleware/subscription'
import { CreateReportTemplateRequest, _UpdateReportTemplateRequest } from '@/types/reports'
import { z } from 'zod'

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(['executive', 'operational', 'compliance', 'custom']),
  template_data: z.object({}).optional(),
  is_public: z.boolean().optional(),
  tags: z.array(z.string()).optional()
})

const _updateTemplateSchema = createTemplateSchema.partial()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate Professional tier subscription
    const hasAccess = await validateSubscription(session.user.id, 'Professional')
    if (!hasAccess) {
      return NextResponse.json({
        error: 'Professional tier subscription required for report templates'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const public_only = searchParams.get('public') === 'true'

    const templates = await prisma.reportTemplate.findMany({
      where: {
        AND: [
          public_only ? { is_public: true } : {
            OR: [
              { user_id: session.user.id },
              { is_public: true },
              {
                shared_templates: {
                  some: { shared_with: session.user.id }
                }
              }
            ]
          },
          category ? { category } : {}
        ]
      },
      include: {
        shared_templates: {
          where: { shared_with: session.user.id },
          select: { permission_level: true }
        }
      },
      orderBy: { updated_at: 'desc' }
    })

    return NextResponse.json({
      templates: templates.map(template => ({
        ...template,
        permission_level: template.user_id === session.user.id
          ? 'admin'
          : template.shared_templates[0]?.permission_level || 'view'
      }))
    })

  } catch (error) {
    console.error('Error fetching report templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate Professional tier subscription
    const hasAccess = await validateSubscription(session.user.id, 'Professional')
    if (!hasAccess) {
      return NextResponse.json({
        error: 'Professional tier subscription required for report creation'
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createTemplateSchema.parse(body) as CreateReportTemplateRequest

    // Check template limit for user
    const templateCount = await prisma.reportTemplate.count({
      where: { user_id: session.user.id }
    })

    if (templateCount >= 50) { // Professional tier limit
      return NextResponse.json({
        error: 'Template limit reached. Please delete unused templates or contact support.'
      }, { status: 429 })
    }

    const template = await prisma.reportTemplate.create({
      data: {
        user_id: session.user.id,
        name: validatedData.name,
        description: validatedData.description,
        category: validatedData.category,
        template_data: validatedData.template_data || {},
        is_public: validatedData.is_public || false,
        tags: validatedData.tags || [],
        version: '1.0'
      }
    })

    return NextResponse.json({ template }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating report template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}