/**
 * Alert Configuration API
 * Story 4.1: Custom Alert Configuration
 *
 * CRUD operations for alert configurations
 */

import { NextRequest, NextResponse } from 'next/server'
import { AlertRuleEngine } from '../../../../lib/alerts/AlertRuleEngine'
import type {
  AlertConfiguration,
  CreateAlertConfigRequest,
  // UpdateAlertConfigRequest,
  AlertConfigResponse,
  AlertConfigListResponse
} from '../../../../types/alerts'

interface AlertLimits {
  max_active_alerts: number
  max_custom_rules: number
  max_notification_channels: number
  max_recipients_per_alert: number
  max_escalation_levels: number
  advanced_metrics_enabled: boolean
  anomaly_detection_enabled: boolean
  api_integration_enabled: boolean
  custom_webhooks_enabled: boolean
  priority_support: boolean
}

const alertEngine = new AlertRuleEngine()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('page_size') || '10')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // Get user ID from authentication
    const userId = await getUserFromAuth(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's alert configurations
    const configurations = await getAlertConfigurations(userId, {
      page,
      pageSize,
      status,
      search
    })

    const response: AlertConfigListResponse = {
      success: true,
      data: {
        configurations: configurations.items,
        total_count: configurations.total,
        page,
        page_size: pageSize
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Failed to fetch alert configurations:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateAlertConfigRequest = await request.json()

    // Get user ID from authentication
    const userId = await getUserFromAuth(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate request with proper ID assignment
    const configWithIds = {
      ...body,
      user_id: userId,
      organization_id: await getOrganizationId(userId),
      rules: body.rules.map((rule, index) => ({
        ...rule,
        id: `rule_${Date.now()}_${index}`
      })),
      escalation_policy: body.escalation_policy ? {
        ...body.escalation_policy,
        id: `escalation_${Date.now()}`
      } : undefined
    }

    const validation = await alertEngine.validateConfiguration(configWithIds)

    if (!validation.is_valid) {
      const response: AlertConfigResponse = {
        success: false,
        error: 'Validation failed',
        validation
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Check subscription limits
    const canCreate = await checkSubscriptionLimits(userId, body)
    if (!canCreate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: canCreate.reason,
          upgrade_required: true
        },
        { status: 403 }
      )
    }

    // Create configuration
    const configuration = await createAlertConfiguration(userId, body)

    const response: AlertConfigResponse = {
      success: true,
      data: configuration,
      validation
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Failed to create alert configuration:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Get alert configurations for a user
 */
async function getAlertConfigurations(
  userId: string,
  options: {
    page: number
    pageSize: number
    status?: string | null
    search?: string | null
  }
): Promise<{ items: AlertConfiguration[], total: number }> {
  // In real implementation, this would query PostgreSQL database:
  /*
  let query = `
    SELECT * FROM alert_configurations
    WHERE user_id = $1
  `
  const params = [userId]
  let paramIndex = 2

  if (options.status) {
    query += ` AND status = $${paramIndex}`
    params.push(options.status)
    paramIndex++
  }

  if (options.search) {
    query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
    params.push(`%${options.search}%`)
    paramIndex++
  }

  query += ` ORDER BY created_at DESC`
  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
  params.push(options.pageSize, (options.page - 1) * options.pageSize)

  const result = await db.query(query, params)

  // Get total count
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)').split('ORDER BY')[0]
  const countResult = await db.query(countQuery, params.slice(0, -2))

  return {
    items: result.rows,
    total: parseInt(countResult.rows[0].count)
  }
  */

  // Mock implementation
  const mockConfigurations: AlertConfiguration[] = [
    {
      id: 'config_1',
      name: 'High Energy Consumption Alert',
      description: 'Alert when energy consumption exceeds normal levels',
      user_id: userId,
      organization_id: 'org_1',
      status: 'active',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString(),
      created_by: userId,
      rules: [
        {
          id: 'rule_1',
          name: 'Energy Threshold Rule',
          description: 'Trigger when consumption > 1000 kWh',
          enabled: true,
          priority: 'high',
          conditions: [
            {
              id: 'condition_1',
              metric: {
                type: 'energy_consumption',
                display_name: 'Total Energy Consumption',
                units: 'kWh'
              },
              operator: 'greater_than',
              threshold: { value: 1000 },
              time_aggregation: {
                function: 'sum',
                period: 60,
                minimum_data_points: 12
              },
              filters: []
            }
          ],
          logical_operator: 'AND',
          evaluation_window: 60,
          cooldown_period: 30,
          suppress_duplicates: true,
          tags: ['energy', 'consumption']
        }
      ],
      notification_settings: {
        channels: [
          {
            type: 'email',
            enabled: true,
            configuration: {
              email_addresses: ['admin@company.com']
            },
            priority_filter: ['critical', 'high', 'medium']
          }
        ],
        recipients: [],
        frequency_limits: {
          max_alerts_per_hour: 5,
          max_alerts_per_day: 20,
          cooldown_between_similar: 15,
          escalation_threshold: 3
        },
        quiet_hours: {
          enabled: false,
          start_time: '22:00',
          end_time: '06:00',
          timezone: 'UTC',
          exceptions: [],
          weekend_override: false
        },
        escalation_delays: [15, 30, 60]
      },
      metadata: {
        category: 'energy_efficiency',
        severity_auto_adjust: false,
        business_impact: {
          level: 'medium',
          operational_severity: 'efficiency_loss',
          compliance_risk: false,
          safety_risk: false
        },
        affected_systems: ['hvac'],
        affected_locations: ['Building A'],
        documentation_links: [],
        tags: ['energy', 'automated'],
        custom_fields: {}
      }
    }
  ]

  // Apply filters
  let filteredConfigs = mockConfigurations.filter(config => config.user_id === userId)

  if (options.status) {
    filteredConfigs = filteredConfigs.filter(config => config.status === options.status)
  }

  if (options.search) {
    const searchLower = options.search.toLowerCase()
    filteredConfigs = filteredConfigs.filter(config =>
      config.name.toLowerCase().includes(searchLower) ||
      config.description.toLowerCase().includes(searchLower)
    )
  }

  // Apply pagination
  const startIndex = (options.page - 1) * options.pageSize
  const endIndex = startIndex + options.pageSize
  const paginatedConfigs = filteredConfigs.slice(startIndex, endIndex)

  return {
    items: paginatedConfigs,
    total: filteredConfigs.length
  }
}

/**
 * Create new alert configuration
 */
async function createAlertConfiguration(
  userId: string,
  request: CreateAlertConfigRequest
): Promise<AlertConfiguration> {
  // In real implementation, this would insert into PostgreSQL:
  /*
  const result = await db.query(`
    INSERT INTO alert_configurations (
      id, name, description, user_id, organization_id,
      status, rules, notification_settings, escalation_policy,
      metadata, created_at, updated_at, created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), $11
    ) RETURNING *
  `, [
    generateId(),
    request.name,
    request.description,
    userId,
    await getOrganizationId(userId),
    'draft',
    JSON.stringify(request.rules),
    JSON.stringify(request.notification_settings),
    JSON.stringify(request.escalation_policy),
    JSON.stringify(request.metadata),
    userId
  ])

  return result.rows[0]
  */

  // Mock implementation
  const configuration: AlertConfiguration = {
    id: `config_${Date.now()}`,
    name: request.name,
    description: request.description,
    user_id: userId,
    organization_id: await getOrganizationId(userId),
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: userId,
    rules: request.rules.map((rule, index) => ({
      ...rule,
      id: `rule_${Date.now()}_${index}`
    })),
    notification_settings: request.notification_settings,
    escalation_policy: request.escalation_policy ? {
      ...request.escalation_policy,
      id: `escalation_${Date.now()}`
    } : undefined,
    metadata: request.metadata
  }

  return configuration
}

/**
 * Check subscription limits for alert creation
 */
async function checkSubscriptionLimits(
  userId: string,
  request: CreateAlertConfigRequest
): Promise<{ allowed: boolean, reason?: string }> {
  // Get user's subscription tier
  const subscription = await getUserSubscription(userId)

  // Get current alert count
  const currentConfigs = await getAlertConfigurations(userId, { page: 1, pageSize: 1000 })

  const tierLimits = getAlertLimits(subscription.tier)

  // Check limits
  if (currentConfigs.total >= tierLimits.max_active_alerts) {
    return {
      allowed: false,
      reason: `Alert limit reached. Current: ${currentConfigs.total}, Limit: ${tierLimits.max_active_alerts}`
    }
  }

  // Check rule complexity
  const totalRules = request.rules.length
  if (totalRules > tierLimits.max_custom_rules) {
    return {
      allowed: false,
      reason: `Too many rules. Maximum: ${tierLimits.max_custom_rules}, Requested: ${totalRules}`
    }
  }

  // Check advanced features
  const usesAnomalyDetection = request.rules.some(rule =>
    rule.conditions.some(condition => condition.anomaly_detection)
  )

  if (usesAnomalyDetection && !tierLimits.anomaly_detection_enabled) {
    return {
      allowed: false,
      reason: 'Anomaly detection requires Professional tier or higher'
    }
  }

  return { allowed: true }
}

/**
 * Get user's subscription information
 */
async function getUserSubscription(_userId: string): Promise<{ tier: string }> {
  // Mock implementation - would query actual subscription data
  return { tier: 'professional' }
}

/**
 * Get alert limits for subscription tier
 */
function getAlertLimits(tier: string): AlertLimits {
  const limits = {
    free: {
      max_active_alerts: 5,
      max_custom_rules: 3,
      max_notification_channels: 2,
      max_recipients_per_alert: 3,
      max_escalation_levels: 1,
      advanced_metrics_enabled: false,
      anomaly_detection_enabled: false,
      api_integration_enabled: false,
      custom_webhooks_enabled: false,
      priority_support: false
    },
    professional: {
      max_active_alerts: 50,
      max_custom_rules: 20,
      max_notification_channels: 10,
      max_recipients_per_alert: 15,
      max_escalation_levels: 5,
      advanced_metrics_enabled: true,
      anomaly_detection_enabled: true,
      api_integration_enabled: true,
      custom_webhooks_enabled: true,
      priority_support: true
    },
    enterprise: {
      max_active_alerts: -1, // unlimited
      max_custom_rules: -1,
      max_notification_channels: -1,
      max_recipients_per_alert: -1,
      max_escalation_levels: -1,
      advanced_metrics_enabled: true,
      anomaly_detection_enabled: true,
      api_integration_enabled: true,
      custom_webhooks_enabled: true,
      priority_support: true
    }
  }

  return limits[tier as keyof typeof limits] || limits.free
}

/**
 * Get user from authentication
 */
async function getUserFromAuth(request: NextRequest): Promise<string | null> {
  // In real implementation, this would integrate with NextAuth.js:
  // const session = await getServerSession(authOptions)
  // return session?.user?.id || null

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return 'mock-user-id'
  }

  return null
}

/**
 * Get organization ID for user
 */
async function getOrganizationId(_userId: string): Promise<string> {
  // Mock implementation - would query user's organization
  return 'org_mock'
}