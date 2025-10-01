/**
 * Database connection utilities
 * Provides connection management for the IoT platform
 */

import { createServerClient } from '../supabase-server'

// Export Supabase client as the primary database connection
export const db = createServerClient()

// Export compatibility functions
export const getConnection = () => db
export const query = (sql: string, _params?: unknown[]) => {
  // This would be implemented with actual SQL query functionality
  console.warn('SQL query not implemented in MVP:', sql)
  return Promise.resolve([])
}

// Export prisma for compatibility (commented out - using Supabase)
// export { prisma } from './prisma'

export default db