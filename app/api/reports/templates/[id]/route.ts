import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/database/connection'
import { validateSubscription } from '@/lib/middleware/subscription'
import { UpdateReportTemplateRequest } from '@/types/reports'
import { z } from 'zod'

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z.enum(['executive', 'operational', 'compliance', 'custom']).optional(),
  template_data: z.object({}).optional(),
  is_public: z.boolean().optional(),
  tags: z.array(z.string()).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const template = await prisma.reportTemplate.findFirst({
      where: {
        id: params.id,
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
      include: {
        shared_templates: {
          where: { shared_with: session.user.id },
          select: { permission_level: true }
        },
        comments: {
          include: {
            user: { select: { name: true, email: true } },
            replies: {
              include: {
                user: { select: { name: true, email: true } }
              }
            }
          },
          orderBy: { created_at: 'desc' }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const permission_level = template.user_id === session.user.id
      ? 'admin'
      : template.shared_templates[0]?.permission_level || 'view'

    return NextResponse.json({
      template: {
        ...template,
        permission_level
      }
    })

  } catch (error) {
    console.error('Error fetching report template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate Professional tier subscription
    const hasAccess = await validateSubscription(session.user.id, 'Professional')
    if (!hasAccess) {
      return NextResponse.json({
        error: 'Professional tier subscription required for report editing'
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateTemplateSchema.parse(body) as UpdateReportTemplateRequest

    // Check if user has edit permissions
    const template = await prisma.reportTemplate.findFirst({
      where: {
        id: params.id,
        OR: [
          { user_id: session.user.id },
          {
            shared_templates: {
              some: {
                shared_with: session.user.id,
                permission_level: { in: ['edit', 'admin'] }
              }
            }
          }
        ]
      }
    })

    if (!template) {
      return NextResponse.json({
        error: 'Template not found or insufficient permissions'
      }, { status: 404 })
    }

    // Increment version if template_data changed
    const incrementVersion = validatedData.template_data !== undefined
    const currentVersion = template.version
    const newVersion = incrementVersion
      ? `${parseInt(currentVersion.split('.')[0]) + 1}.0`
      : currentVersion

    const updatedTemplate = await prisma.reportTemplate.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        version: newVersion,
        updated_at: new Date()
      }
    })

    // Create revision record if template_data changed
    if (incrementVersion) {
      await prisma.reportRevision.create({
        data: {
          template_id: params.id,
          version: newVersion,
          created_by: session.user.id,
          change_summary: 'Template updated via API',
          changes: [],
          is_published: true
        }
      })
    }

    return NextResponse.json({ template: updatedTemplate })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error updating report template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate Professional tier subscription
    const hasAccess = await validateSubscription(session.user.id, 'Professional')
    if (!hasAccess) {
      return NextResponse.json({
        error: 'Professional tier subscription required for report deletion'
      }, { status: 403 })
    }

    // Check if user owns the template
    const template = await prisma.reportTemplate.findFirst({
      where: {
        id: params.id,
        user_id: session.user.id
      }
    })

    if (!template) {
      return NextResponse.json({
        error: 'Template not found or insufficient permissions'
      }, { status: 404 })
    }

    // Check if template is being used in active schedules
    const activeSchedules = await prisma.reportSchedule.count({
      where: {
        template_id: params.id,
        is_active: true
      }
    })

    if (activeSchedules > 0) {
      return NextResponse.json({
        error: 'Cannot delete template with active schedules. Please disable schedules first.'
      }, { status: 409 })
    }

    await prisma.reportTemplate.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Template deleted successfully' })

  } catch (error) {
    console.error('Error deleting report template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}