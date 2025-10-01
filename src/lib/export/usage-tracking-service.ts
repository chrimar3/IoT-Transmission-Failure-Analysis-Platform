/**
 * Export Usage Tracking Service
 * Enforces subscription tier limits and tracks export usage
 */

import { createServiceClient } from '@/src/lib/supabase'
import type { ExportFormat, ExportFeature, UsageLimits } from '@/types/export'

export interface UsageCheckResult {
  canExport: boolean
  currentCount: number
  limit: number
  percentageUsed: number
  resetsAt: string
  message?: string
}

export interface ExportStats {
  monthYear: string
  exportCount: number
  totalFileSizeMb: number
  tier: string
}

export class ExportUsageTrackingService {
  private static instance: ExportUsageTrackingService

  static getInstance(): ExportUsageTrackingService {
    if (!ExportUsageTrackingService.instance) {
      ExportUsageTrackingService.instance = new ExportUsageTrackingService()
    }
    return ExportUsageTrackingService.instance
  }

  /**
   * Check if user can create an export
   */
  async canUserExport(userId: string, tier: string): Promise<UsageCheckResult> {
    try {
      const supabase = createServiceClient()

      // Call database function to check usage
      const { data, error } = await supabase
        .rpc('can_user_export', {
          p_user_id: userId,
          p_tier: tier
        })

      if (error) {
        console.error('Error checking export usage:', error)
        // Default to denying export on error
        return {
          canExport: false,
          currentCount: 0,
          limit: 0,
          percentageUsed: 0,
          resetsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          message: 'Unable to verify export quota'
        }
      }

      // Database function returns array with single row
      const result = Array.isArray(data) ? data[0] : data

      return {
        canExport: result.can_export,
        currentCount: result.current_count,
        limit: result.limit_count,
        percentageUsed: parseFloat(result.percentage_used),
        resetsAt: result.resets_at,
        message: result.can_export
          ? `${result.current_count} of ${result.limit_count === -1 ? 'unlimited' : result.limit_count} exports used this month`
          : `Export limit reached (${result.current_count}/${result.limit_count}). Resets on ${new Date(result.resets_at).toLocaleDateString()}`
      }
    } catch (error) {
      console.error('Can user export error:', error)
      return {
        canExport: false,
        currentCount: 0,
        limit: 0,
        percentageUsed: 0,
        resetsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        message: 'Error checking export quota'
      }
    }
  }

  /**
   * Record export job creation
   */
  async recordExportJob(
    jobId: string,
    userId: string,
    format: ExportFormat,
    parameters: Record<string, unknown>,
    tier: string
  ): Promise<boolean> {
    try {
      const supabase = createServiceClient()

      const { error } = await supabase
        .from('export_jobs')
        .insert({
          id: jobId,
          user_id: userId,
          job_type: 'manual',
          export_format: format,
          status: 'queued',
          parameters: {
            ...parameters,
            tier
          },
          progress_percent: 0,
          delivery_method: 'download'
        })

      if (error) {
        console.error('Error recording export job:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Record export job error:', error)
      return false
    }
  }

  /**
   * Update export job status
   */
  async updateExportJobStatus(
    jobId: string,
    status: 'queued' | 'processing' | 'completed' | 'failed',
    updates: {
      progressPercent?: number
      fileKey?: string
      fileSize?: number
      fileUrl?: string
      errorMessage?: string
      completedAt?: string
    } = {}
  ): Promise<boolean> {
    try {
      const supabase = createServiceClient()

      const updateData: Record<string, unknown> = {
        status,
        ...updates
      }

      // Convert camelCase to snake_case for database
      const dbUpdateData = {
        status: updateData.status,
        progress_percent: updateData.progressPercent,
        file_key: updateData.fileKey,
        file_size: updateData.fileSize,
        file_url: updateData.fileUrl,
        error_message: updateData.errorMessage,
        completed_at: updateData.completedAt || (status === 'completed' ? new Date().toISOString() : undefined)
      }

      // Remove undefined values
      Object.keys(dbUpdateData).forEach(key => {
        if (dbUpdateData[key] === undefined) {
          delete dbUpdateData[key]
        }
      })

      const { error } = await supabase
        .from('export_jobs')
        .update(dbUpdateData)
        .eq('id', jobId)

      if (error) {
        console.error('Error updating export job status:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Update export job status error:', error)
      return false
    }
  }

  /**
   * Log export action for audit trail
   */
  async logExportAction(
    userId: string,
    exportJobId: string,
    action: string,
    metadata: Record<string, unknown> = {}
  ): Promise<boolean> {
    try {
      const supabase = createServiceClient()

      const { error } = await supabase
        .from('export_audit_log')
        .insert({
          user_id: userId,
          export_job_id: exportJobId,
          action,
          metadata
        })

      if (error) {
        console.error('Error logging export action:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Log export action error:', error)
      return false
    }
  }

  /**
   * Get user's export statistics
   */
  async getUserExportStats(userId: string): Promise<ExportStats[]> {
    try {
      const supabase = createServiceClient()

      const { data, error } = await supabase
        .rpc('get_user_export_stats', {
          p_user_id: userId
        })

      if (error) {
        console.error('Error getting export stats:', error)
        return []
      }

      return (data || []).map((row: {
        month_year: string
        export_count: number
        total_file_size_mb: number
        tier: string
      }) => ({
        monthYear: row.month_year,
        exportCount: row.export_count,
        totalFileSizeMb: row.total_file_size_mb,
        tier: row.tier
      }))
    } catch (error) {
      console.error('Get user export stats error:', error)
      return []
    }
  }

  /**
   * Get tier limits for a subscription tier
   */
  async getTierLimits(tier: string): Promise<UsageLimits | null> {
    try {
      const supabase = createServiceClient()

      const { data, error } = await supabase
        .from('export_tier_limits')
        .select('*')
        .eq('tier', tier)
        .single()

      if (error) {
        console.error('Error getting tier limits:', error)
        return null
      }

      return {
        tier: data.tier,
        exports_per_month: data.exports_per_month,
        max_file_size_mb: data.max_file_size_mb,
        max_recipients_per_email: data.max_recipients_per_email,
        scheduled_reports_limit: data.scheduled_reports_limit,
        share_links_per_month: data.share_links_per_month,
        formats_allowed: data.formats_allowed as ExportFormat[],
        features_enabled: data.features_enabled as ExportFeature[]
      }
    } catch (error) {
      console.error('Get tier limits error:', error)
      return null
    }
  }

  /**
   * Validate export format is allowed for tier
   */
  async isFormatAllowed(tier: string, format: ExportFormat): Promise<boolean> {
    const limits = await this.getTierLimits(tier)
    if (!limits) return false

    return limits.formats_allowed.includes(format)
  }

  /**
   * Validate feature is enabled for tier
   */
  async isFeatureEnabled(tier: string, feature: ExportFeature): Promise<boolean> {
    const limits = await this.getTierLimits(tier)
    if (!limits) return false

    return limits.features_enabled.includes(feature)
  }

  /**
   * Get current month's usage for a user
   */
  async getCurrentMonthUsage(userId: string): Promise<{
    exportCount: number
    totalFileSizeMb: number
    tier: string
  } | null> {
    try {
      const supabase = createServiceClient()
      const currentMonth = new Date().toISOString().substring(0, 7) // YYYY-MM

      const { data, error } = await supabase
        .from('export_usage')
        .select('export_count, total_file_size, tier')
        .eq('user_id', userId)
        .eq('month_year', currentMonth)
        .single()

      if (error) {
        // No usage record yet this month
        return {
          exportCount: 0,
          totalFileSizeMb: 0,
          tier: 'PROFESSIONAL'
        }
      }

      return {
        exportCount: data.export_count,
        totalFileSizeMb: Math.round((data.total_file_size / 1024 / 1024) * 100) / 100,
        tier: data.tier
      }
    } catch (error) {
      console.error('Get current month usage error:', error)
      return null
    }
  }

  /**
   * Get export job by ID from database
   */
  async getExportJob(jobId: string): Promise<{
    id: string
    userId: string
    status: string
    fileKey?: string
    fileUrl?: string
    format: ExportFormat
    createdAt: string
    completedAt?: string
  } | null> {
    try {
      const supabase = createServiceClient()

      const { data, error } = await supabase
        .from('export_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (error) {
        console.error('Error getting export job:', error)
        return null
      }

      return {
        id: data.id,
        userId: data.user_id,
        status: data.status,
        fileKey: data.file_key,
        fileUrl: data.file_url,
        format: data.export_format as ExportFormat,
        createdAt: data.created_at,
        completedAt: data.completed_at
      }
    } catch (error) {
      console.error('Get export job error:', error)
      return null
    }
  }
}

// Export singleton instance
export const exportUsageTrackingService = ExportUsageTrackingService.getInstance()

// Helper function to get default tier limits
export function getDefaultTierLimits(tier: string): UsageLimits {
  const limits: Record<string, UsageLimits> = {
    FREE: {
      tier: 'FREE',
      exports_per_month: 5,
      max_file_size_mb: 5,
      max_recipients_per_email: 1,
      scheduled_reports_limit: 0,
      share_links_per_month: 0,
      formats_allowed: ['csv'],
      features_enabled: ['basic_export']
    },
    PROFESSIONAL: {
      tier: 'PROFESSIONAL',
      exports_per_month: 100,
      max_file_size_mb: 50,
      max_recipients_per_email: 10,
      scheduled_reports_limit: 10,
      share_links_per_month: 50,
      formats_allowed: ['csv', 'excel', 'pdf'],
      features_enabled: [
        'basic_export',
        'excel_export',
        'pdf_export',
        'email_delivery',
        'scheduled_reports',
        'custom_templates',
        'secure_sharing'
      ]
    },
    ENTERPRISE: {
      tier: 'ENTERPRISE',
      exports_per_month: -1, // Unlimited
      max_file_size_mb: 200,
      max_recipients_per_email: 50,
      scheduled_reports_limit: -1, // Unlimited
      share_links_per_month: -1, // Unlimited
      formats_allowed: ['csv', 'excel', 'pdf'],
      features_enabled: [
        'basic_export',
        'excel_export',
        'pdf_export',
        'email_delivery',
        'scheduled_reports',
        'custom_templates',
        'branding',
        'secure_sharing',
        'usage_analytics'
      ]
    }
  }

  return limits[tier] || limits.PROFESSIONAL
}