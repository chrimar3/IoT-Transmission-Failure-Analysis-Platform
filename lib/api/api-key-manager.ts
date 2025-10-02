/**
 * API Key Management System
 * Handles creation, validation, and revocation of API keys for Professional users
 */

import { createServerClient } from '../supabase-server'
import { randomBytes, createHash } from 'crypto'

export interface ApiKey {
  id: string
  user_id: string
  name: string
  key_hash: string
  scopes: string[]
  created_at: string
  expires_at?: string
  last_used_at?: string
  is_active: boolean
}

export interface ApiKeyUsage {
  id: string
  api_key_id: string
  endpoint: string
  requests_count: number
  hour_window: string
  created_at: string
}

export interface RateLimitInfo {
  tier: 'free' | 'professional' | 'enterprise'
  hourly_limit: number
  current_usage: number
  reset_time: string
}

export class ApiKeyManager {
  private supabase = createServerClient()

  /**
   * Generate a new API key for a user
   */
  async createApiKey(
    userId: string,
    name: string,
    scopes: string[] = ['read'],
    expiresAt?: Date
  ): Promise<{ key_id: string; api_key: string; scopes: string[] }> {
    // Generate secure API key
    const keyBytes = randomBytes(32)
    const apiKey = `cubems_${keyBytes.toString('hex')}`
    const keyHash = this.hashApiKey(apiKey)

    // Store in database
    const { data, error } = await this.supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name,
        key_hash: keyHash,
        scopes,
        expires_at: expiresAt?.toISOString(),
        is_active: true
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`)
    }

    return {
      key_id: data.id,
      api_key: apiKey,
      scopes
    }
  }

  /**
   * Validate an API key and return associated user info
   */
  async validateApiKey(apiKey: string): Promise<{
    user_id: string
    scopes: string[]
    rate_limit: RateLimitInfo
  } | null> {
    const keyHash = this.hashApiKey(apiKey)

    const { data, error } = await this.supabase
      .from('api_keys')
      .select(`
        id,
        user_id,
        scopes,
        expires_at,
        is_active,
        profiles!inner(subscription_tier)
      `)
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return null
    }

    // Check if key is expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null
    }

    // Update last used timestamp
    await this.updateLastUsed(data.id)

    // Get rate limit info based on subscription tier
    const rateLimitInfo = this.getRateLimitInfo(data.profiles.subscription_tier)

    return {
      user_id: data.user_id,
      scopes: data.scopes,
      rate_limit: rateLimitInfo
    }
  }

  /**
   * Get user's API keys
   */
  async getUserApiKeys(userId: string): Promise<Omit<ApiKey, 'key_hash'>[]> {
    const { data, error } = await this.supabase
      .from('api_keys')
      .select('id, name, scopes, created_at, expires_at, last_used_at, is_active')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch API keys: ${error.message}`)
    }

    return data || []
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(keyId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to revoke API key: ${error.message}`)
    }
  }

  /**
   * Track API usage for rate limiting
   */
  async trackUsage(apiKeyId: string, endpoint: string): Promise<void> {
    const hourWindow = new Date()
    hourWindow.setMinutes(0, 0, 0) // Round to current hour

    try {
      // Upsert usage record for this hour
      const { error } = await this.supabase
        .from('api_key_usage')
        .upsert({
          api_key_id: apiKeyId,
          endpoint,
          requests_count: 1,
          hour_window: hourWindow.toISOString()
        }, {
          onConflict: 'api_key_id,endpoint,hour_window',
          ignoreDuplicates: false
        })

      if (error) {
        console.warn('Failed to track API usage:', error)
      }
    } catch (error) {
      console.warn('API usage tracking error:', error)
    }
  }

  /**
   * Get API usage statistics
   */
  async getUsageStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    total_requests: number
    requests_by_endpoint: Record<string, number>
    hourly_breakdown: Array<{ hour: string; requests: number }>
  }> {
    // Get user's API keys
    const { data: apiKeys } = await this.supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', userId)

    if (!apiKeys || apiKeys.length === 0) {
      return {
        total_requests: 0,
        requests_by_endpoint: {},
        hourly_breakdown: []
      }
    }

    const keyIds = apiKeys.map(k => k.id)

    // Get usage statistics
    const { data: usage, error } = await this.supabase
      .from('api_key_usage')
      .select('endpoint, requests_count, hour_window')
      .in('api_key_id', keyIds)
      .gte('hour_window', startDate.toISOString())
      .lte('hour_window', endDate.toISOString())

    if (error) {
      throw new Error(`Failed to fetch usage stats: ${error.message}`)
    }

    // Aggregate statistics
    const totalRequests = usage?.reduce((sum, record) => sum + record.requests_count, 0) || 0

    const requestsByEndpoint: Record<string, number> = {}
    const hourlyBreakdown: Record<string, number> = {}

    usage?.forEach(record => {
      // By endpoint
      requestsByEndpoint[record.endpoint] = (requestsByEndpoint[record.endpoint] || 0) + record.requests_count

      // By hour
      hourlyBreakdown[record.hour_window] = (hourlyBreakdown[record.hour_window] || 0) + record.requests_count
    })

    return {
      total_requests: totalRequests,
      requests_by_endpoint: requestsByEndpoint,
      hourly_breakdown: Object.entries(hourlyBreakdown).map(([hour, requests]) => ({
        hour,
        requests
      }))
    }
  }

  /**
   * Check rate limit for API key
   */
  async checkRateLimit(apiKeyId: string, rateLimitInfo: RateLimitInfo): Promise<{
    allowed: boolean
    current_usage: number
    reset_time: string
  }> {
    const currentHour = new Date()
    currentHour.setMinutes(0, 0, 0)
    const nextHour = new Date(currentHour.getTime() + 60 * 60 * 1000)

    // Get current hour usage
    const { data: usage } = await this.supabase
      .from('api_key_usage')
      .select('requests_count')
      .eq('api_key_id', apiKeyId)
      .eq('hour_window', currentHour.toISOString())

    const currentUsage = usage?.reduce((sum, record) => sum + record.requests_count, 0) || 0

    return {
      allowed: currentUsage < rateLimitInfo.hourly_limit,
      current_usage: currentUsage,
      reset_time: nextHour.toISOString()
    }
  }

  /**
   * Hash API key for secure storage
   */
  private hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex')
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(keyId: string): Promise<void> {
    try {
      await this.supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyId)
    } catch (error) {
      console.warn('Failed to update last used timestamp:', error)
    }
  }

  /**
   * Get rate limit info based on subscription tier
   */
  private getRateLimitInfo(subscriptionTier: string): RateLimitInfo {
    const nextHour = new Date()
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)

    switch (subscriptionTier) {
      case 'professional':
        return {
          tier: 'professional',
          hourly_limit: 10000,
          current_usage: 0, // Will be updated by caller
          reset_time: nextHour.toISOString()
        }
      case 'enterprise':
        return {
          tier: 'enterprise',
          hourly_limit: 50000,
          current_usage: 0,
          reset_time: nextHour.toISOString()
        }
      default:
        return {
          tier: 'free',
          hourly_limit: 100,
          current_usage: 0,
          reset_time: nextHour.toISOString()
        }
    }
  }
}

// Singleton instance
export const apiKeyManager = new ApiKeyManager()