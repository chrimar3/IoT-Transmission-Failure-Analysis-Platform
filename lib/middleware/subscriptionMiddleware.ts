/**
 * Subscription and Usage Tracking Middleware
 * Story 3.4: Data Export and Reporting
 *
 * Validates user subscription tiers and tracks export usage across the platform
 */

import { NextRequest, NextResponse } from 'next/server'
import type {
  SubscriptionTier,
  UsageResponse,
  ExportFormat,
  TierLimits,
  CreateExportRequest
} from '../../types/export'

export interface SubscriptionValidationResult {
  canProceed: boolean
  tier: SubscriptionTier
  usage: UsageResponse
  limits: TierLimits
  blockReason?: string
  upgradeRequired?: boolean
}

export class SubscriptionMiddleware {
  /**
   * Validate user's subscription and usage for export requests
   */
  static async validateExportAccess(
    _userId: string,
    exportRequest: CreateExportRequest
  ): Promise<SubscriptionValidationResult> {
    try {
      // Get user's current subscription tier
      const tier = await this.getUserTier(_userId)

      // Get current usage statistics
      const usage = await this.getUsageStats(_userId)

      // Get tier limits
      const limits = this.getTierLimits(tier)

      // Validate format access
      const formatAllowed = limits.formats_allowed.includes(exportRequest.format)
      if (!formatAllowed) {
        return {
          canProceed: false,
          tier,
          usage,
          limits,
          blockReason: `${exportRequest.format.toUpperCase()} export not available in ${tier} tier`,
          upgradeRequired: true
        }
      }

      // Validate monthly usage limits
      const withinLimits = limits.exports_per_month === -1 ||
                          usage.export_count < limits.exports_per_month
      if (!withinLimits) {
        return {
          canProceed: false,
          tier,
          usage,
          limits,
          blockReason: `Monthly export limit of ${limits.exports_per_month} reached`,
          upgradeRequired: tier === 'free'
        }
      }

      // Validate file size limits
      const estimatedSizeMB = await this.estimateExportSize(exportRequest)
      if (limits.max_file_size_mb !== -1 && estimatedSizeMB > limits.max_file_size_mb) {
        return {
          canProceed: false,
          tier,
          usage,
          limits,
          blockReason: `Export size (${estimatedSizeMB.toFixed(1)}MB) exceeds limit of ${limits.max_file_size_mb}MB`,
          upgradeRequired: true
        }
      }

      // Validate concurrent exports
      const activeExports = await this.getActiveExportCount(_userId)
      if (activeExports >= limits.concurrent_exports) {
        return {
          canProceed: false,
          tier,
          usage,
          limits,
          blockReason: `Maximum concurrent exports (${limits.concurrent_exports}) reached`,
          upgradeRequired: false
        }
      }

      // Validate feature access (email delivery, scheduled reports, etc.)
      if (exportRequest.delivery_method === 'email' &&
          !limits.features_enabled.includes('email_delivery')) {
        return {
          canProceed: false,
          tier,
          usage,
          limits,
          blockReason: 'Email delivery not available in current tier',
          upgradeRequired: true
        }
      }

      return {
        canProceed: true,
        tier,
        usage,
        limits
      }

    } catch (_error) {
      console.error('Subscription validation failed:', _error)
      throw new Error('Failed to validate subscription access')
    }
  }

  /**
   * Increment user's export usage counter
   */
  static async trackExportUsage(
    _userId: string,
    exportFormat: ExportFormat,
    fileSizeMB: number
  ): Promise<void> {
    try {
      const _currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

      // In real implementation, this would update PostgreSQL:
      /*
      await db.query(`
        INSERT INTO export_usage (
          user_id, month_year, export_count, total_size_mb,
          format_breakdown, tier, created_at
        ) VALUES (
          $1, $2, 1, $3,
          jsonb_build_object($4, 1),
          (SELECT tier FROM subscriptions WHERE user_id = $1),
          NOW()
        )
        ON CONFLICT (user_id, month_year)
        DO UPDATE SET
          export_count = export_usage.export_count + 1,
          total_size_mb = export_usage.total_size_mb + $3,
          format_breakdown = export_usage.format_breakdown ||
                           jsonb_build_object($4, COALESCE((export_usage.format_breakdown->$4)::int, 0) + 1),
          updated_at = NOW()
      `, [_userId, _currentMonth, fileSizeMB, exportFormat])
      */

      // Mock implementation
      console.log(`Tracked export usage: User ${_userId}, Format ${exportFormat}, Size ${fileSizeMB}MB`)

    } catch (_error) {
      console.error('Failed to track export usage:', _error)
      // Don't throw - usage tracking failure shouldn't block exports
    }
  }

  /**
   * Get user's current subscription tier
   */
  private static async getUserTier(_userId: string): Promise<SubscriptionTier> {
    // In real implementation, this would query the subscriptions table:
    /*
    const result = await db.query(`
      SELECT tier, status, features_enabled, expires_at
      FROM subscriptions
      WHERE user_id = $1 AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `, [_userId])

    if (result.rows.length === 0) {
      return 'free' // Default to free tier
    }

    const subscription = result.rows[0]

    // Check if subscription has expired
    if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
      return 'free'
    }

    return subscription.tier
    */

    // Mock implementation - would be based on actual user data
    if (userId === 'premium-user') return 'premium'
    if (userId === 'enterprise-user') return 'enterprise'
    return 'professional' // Default for demo
  }

  /**
   * Get current month's usage statistics
   */
  private static async getUsageStats(_userId: string): Promise<UsageResponse> {
    const _currentMonth = new Date().toISOString().slice(0, 7)

    // In real implementation, this would query the export_usage table:
    /*
    const result = await db.query(`
      SELECT
        export_count,
        total_size_mb,
        format_breakdown,
        tier
      FROM export_usage
      WHERE user_id = $1 AND month_year = $2
    `, [_userId, _currentMonth])

    const usage = result.rows[0] || {
      export_count: 0,
      total_size_mb: 0,
      format_breakdown: {},
      tier: await this.getUserTier(_userId)
    }
    */

    // Mock implementation
    const tier = await this.getUserTier(_userId)
    const limits = this.getTierLimits(tier)

    const mockUsage = {
      export_count: Math.floor(Math.random() * 5), // Random for demo
      total_size_mb: Math.floor(Math.random() * 500),
      format_breakdown: {
        csv: 2,
        excel: 1,
        pdf: 1
      }
    }

    return {
      export_count: mockUsage.export_count,
      limit: limits.exports_per_month,
      tier,
      percentage_used: limits.exports_per_month === -1 ? 0 :
                      (mockUsage.export_count / limits.exports_per_month) * 100,
      resets_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
      features_available: limits.features_enabled,
      can_export: mockUsage.export_count < limits.exports_per_month || limits.exports_per_month === -1,
      upgrade_required: false
    }
  }

  /**
   * Get active (processing/pending) export count for user
   */
  private static async getActiveExportCount(_userId: string): Promise<number> {
    // In real implementation:
    /*
    const result = await db.query(`
      SELECT COUNT(*) as active_count
      FROM export_jobs
      WHERE user_id = $1 AND status IN ('pending', 'processing')
    `, [_userId])

    return parseInt(result.rows[0].active_count)
    */

    // Mock implementation
    return Math.floor(Math.random() * 2) // 0-1 active exports for demo
  }

  /**
   * Estimate export file size based on request parameters
   */
  private static async estimateExportSize(request: CreateExportRequest): Promise<number> {
    const { filters, format } = request

    // Calculate estimated record count
    let recordCount = 0
    if (filters?.date_range) {
      const startDate = new Date(filters.date_range.start_date)
      const endDate = new Date(filters.date_range.end_date)
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const sensorCount = filters.sensor_ids?.length || 1

      // Assume hourly data points
      recordCount = daysDiff * sensorCount * 24
    }

    // Estimate bytes per record based on format
    const bytesPerRecord = {
      csv: 150,
      excel: 200,
      pdf: 50 // PDF is more compressed for data
    }

    const totalBytes = recordCount * (bytesPerRecord[format] || 150)
    return totalBytes / (1024 * 1024) // Convert to MB
  }

  /**
   * Get tier-specific limits and features
   */
  private static getTierLimits(tier: SubscriptionTier): TierLimits {
    const limits = {
      free: {
        exports_per_month: 5,
        max_file_size_mb: 50,
        concurrent_exports: 1,
        formats_allowed: ['csv' as ExportFormat],
        features_enabled: ['basic_export'],
        retention_days: 7
      },
      professional: {
        exports_per_month: 100,
        max_file_size_mb: 500,
        concurrent_exports: 3,
        formats_allowed: ['csv', 'excel', 'pdf'] as ExportFormat[],
        features_enabled: ['basic_export', 'excel_export', 'pdf_export', 'email_delivery'],
        retention_days: 30
      },
      premium: {
        exports_per_month: 500,
        max_file_size_mb: 2000,
        concurrent_exports: 5,
        formats_allowed: ['csv', 'excel', 'pdf'] as ExportFormat[],
        features_enabled: [
          'basic_export', 'excel_export', 'pdf_export', 'email_delivery',
          'scheduled_reports', 'custom_templates', 'api_access'
        ],
        retention_days: 90
      },
      enterprise: {
        exports_per_month: -1, // Unlimited
        max_file_size_mb: -1, // Unlimited
        concurrent_exports: 10,
        formats_allowed: ['csv', 'excel', 'pdf'] as ExportFormat[],
        features_enabled: [
          'basic_export', 'excel_export', 'pdf_export', 'email_delivery',
          'scheduled_reports', 'custom_templates', 'api_access',
          'white_label', 'priority_support', 'sla_guarantee'
        ],
        retention_days: 365
      }
    }

    return limits[tier] || limits.free
  }

  /**
   * Create middleware function for Next.js routes
   */
  static createMiddleware() {
    return async (request: NextRequest) => {
      // Extract user ID from authentication
      const _userId = await this.extractUserId(request)
      if (!_userId) {
        return NextResponse.json(
          { success: false, _error: 'Authentication required' },
          { status: 401 }
        )
      }

      // For export creation endpoints, validate subscription
      if (request.url.includes('/api/export/create')) {
        try {
          const body = await request.json()
          const validation = await this.validateExportAccess(_userId, body)

          if (!validation.canProceed) {
            return NextResponse.json({
              success: false,
              _error: validation.blockReason,
              upgrade_required: validation.upgradeRequired,
              current_tier: validation.tier,
              usage: validation.usage
            }, { status: validation.upgradeRequired ? 402 : 429 }) // 402 Payment Required or 429 Too Many Requests
          }

          // Add validation result to request headers for downstream use
          const response = NextResponse.next()
          response.headers.set('X-Subscription-Tier', validation.tier)
          response.headers.set('X-Usage-Remaining',
            (validation.limits.exports_per_month - validation.usage.export_count).toString())

          return response

        } catch (_error) {
          return NextResponse.json(
            { success: false, _error: 'Subscription validation failed' },
            { status: 500 }
          )
        }
      }

      return NextResponse.next()
    }
  }

  /**
   * Extract user ID from request authentication
   */
  private static async extractUserId(request: NextRequest): Promise<string | null> {
    // In real implementation, this would integrate with NextAuth.js:
    /*
    const session = await getServerSession(authOptions)
    return session?.user?.id || null
    */

    // Mock implementation
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      return 'mock-user-id'
    }

    return null
  }
}

/**
 * Usage tracking utilities
 */
export class UsageTracker {
  /**
   * Get comprehensive usage analytics for admin dashboard
   */
  static async getSystemUsageAnalytics(timeframe: 'daily' | 'weekly' | 'monthly' = 'monthly') {
    // In real implementation, this would aggregate usage data:
    /*
    const result = await db.query(`
      SELECT
        tier,
        COUNT(DISTINCT user_id) as user_count,
        SUM(export_count) as total_exports,
        SUM(total_size_mb) as total_size_mb,
        AVG(export_count) as avg_exports_per_user,
        format_breakdown
      FROM export_usage
      WHERE month_year >= $1
      GROUP BY tier, format_breakdown
      ORDER BY tier
    `, [getTimeframeStart(timeframe)])
    */

    // Mock analytics data
    return {
      timeframe,
      total_users: 1247,
      total_exports: 5832,
      total_size_gb: 23.4,
      tier_breakdown: {
        free: { users: 892, exports: 2341, avg_size_mb: 15.2 },
        professional: { users: 298, exports: 2847, avg_size_mb: 45.8 },
        premium: { users: 43, exports: 534, avg_size_mb: 128.5 },
        enterprise: { users: 14, exports: 110, avg_size_mb: 256.7 }
      },
      format_breakdown: {
        csv: 3421,
        excel: 1789,
        pdf: 622
      },
      peak_usage_hours: [9, 10, 11, 14, 15, 16], // Hours of highest usage
      growth_rate: 12.3 // Percentage growth from previous period
    }
  }

  /**
   * Get user-specific usage insights
   */
  static async getUserUsageInsights(_userId: string) {
    // Mock user insights
    return {
      current_month: {
        exports: 8,
        size_mb: 156.3,
        most_used_format: 'excel',
        avg_processing_time: 45 // seconds
      },
      last_30_days: {
        exports: 23,
        size_mb: 445.7,
        peak_day: '2024-03-15',
        efficiency_score: 87 // Based on file size vs. data selected
      },
      recommendations: [
        'Consider using CSV format for faster processing of large datasets',
        'Schedule regular exports to spread usage across off-peak hours',
        'Use date range filters to reduce file sizes and improve processing speed'
      ]
    }
  }
}