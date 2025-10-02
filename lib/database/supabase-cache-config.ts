/**
 * Supabase Cache Configuration
 * Limits Supabase usage to cache and metadata only
 * All sensor data and readings are stored in R2/local files
 */

export const SUPABASE_CACHE_CONFIG = {
  // Tables allowed for cache/metadata storage only
  allowedTables: {
    // Session cache - temporary validation sessions
    'validation_sessions': {
      type: 'cache',
      ttl: 86400, // 24 hours
      maxSize: 1000 // Max 1000 sessions
    },
    // API usage metadata - lightweight tracking
    'api_usage': {
      type: 'metadata',
      ttl: 2592000, // 30 days
      maxSize: 10000 // Max 10k records
    },
    // Export job metadata - track export status
    'export_jobs': {
      type: 'metadata',
      ttl: 604800, // 7 days
      maxSize: 1000 // Max 1000 jobs
    }
  },

  // Tables to be migrated away from Supabase
  deprecatedTables: [
    'sensor_readings', // Move to R2
    'calculation_audit', // Move to local files
    'data_quality_metrics', // Calculate on-demand
    'savings_scenarios', // Store in R2
    'validated_insights' // Store in R2
  ],

  // Size limits
  maxDatabaseSize: 500 * 1024 * 1024, // 500MB total
  maxRowSize: 10 * 1024, // 10KB per row

  // Cleanup policies
  cleanup: {
    enabled: true,
    runInterval: 3600000, // Run every hour
    deleteOlderThan: 86400000 // Delete cache older than 24 hours
  }
}

/**
 * Check if a table operation is allowed
 */
export function isTableAllowed(tableName: string): boolean {
  return tableName in SUPABASE_CACHE_CONFIG.allowedTables
}

/**
 * Get table configuration
 */
export function getTableConfig(tableName: string) {
  return SUPABASE_CACHE_CONFIG.allowedTables[tableName as keyof typeof SUPABASE_CACHE_CONFIG.allowedTables]
}