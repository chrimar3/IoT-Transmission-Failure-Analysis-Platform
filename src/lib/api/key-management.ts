/**
 * API Key Management Service
 * Handles secure API key generation, validation, and management for Professional tier
 */

import { createClient } from '@supabase/supabase-js'
import { randomBytes, createHash, createHmac } from 'crypto'
import type {
  ApiKey,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  ApiKeyScope,
  RateLimitTier
} from '@/types/api'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class ApiKeyManager {
  private static readonly KEY_PREFIX = 'cb_'
  private static readonly KEY_LENGTH = 32
  private static readonly HASH_ALGORITHM = 'sha256'

  /**
   * Generate a new API key for a user
   */
  static async createApiKey(
    userId: string,
    request: CreateApiKeyRequest
  ): Promise<CreateApiKeyResponse> {
    try {
      // Validate user has Professional subscription
      const hasAccess = await this.validateProfessionalAccess(userId)
      if (!hasAccess) {
        throw new Error('API key creation requires Professional subscription')
      }

      // Check if user has reached API key limit
      const keyCount = await this.getUserApiKeyCount(userId)
      const maxKeys = await this.getMaxApiKeysForUser(userId)

      if (keyCount >= maxKeys) {
        throw new Error(`Maximum API keys limit reached (${maxKeys})`)
      }

      // Generate secure API key
      const apiKey = this.generateSecureKey()
      const keyHash = this.hashApiKey(apiKey)
      const keyPrefix = apiKey.substring(0, 16)

      // Get user's rate limit tier
      const rateLimitTier = await this.getUserRateLimitTier(userId)

      // Validate scopes
      const validatedScopes = this.validateScopes(request.scopes, rateLimitTier)

      // Calculate expiration date
      const expiresAt = request.expires_at ? new Date(request.expires_at) : null
      if (expiresAt && expiresAt <= new Date()) {
        throw new Error('Expiration date must be in the future')
      }

      // Insert API key into database
      const { data: newApiKey, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: userId,
          name: request.name,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          scopes: validatedScopes,
          rate_limit_tier: rateLimitTier,
          expires_at: expiresAt?.toISOString(),
          is_active: true,
          usage_stats: {
            total_requests: 0,
            requests_this_month: 0
          }
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create API key:', error)
        throw new Error('Failed to create API key')
      }

      // Log API key creation event
      await this.logApiKeyEvent(userId, 'api_key_created', {
        api_key_id: newApiKey.id,
        name: request.name,
        scopes: validatedScopes
      })

      return {
        api_key: newApiKey as ApiKey,
        key: apiKey,
        warning: 'Store this API key securely. It will not be shown again.'
      }

    } catch (error) {
      console.error('API key creation error:', error)
      throw error
    }
  }

  /**
   * Validate an API key and return key info
   */
  static async validateApiKey(apiKey: string): Promise<ApiKey | null> {
    try {
      const keyHash = this.hashApiKey(apiKey)

      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key_hash', keyHash)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return null
      }

      // Check if key is expired
      if (data.expires_at && new Date(data.expires_at) <= new Date()) {
        await this.deactivateApiKey(data.id)
        return null
      }

      // Update last used timestamp
      await this.updateLastUsed(data.id)

      return data as ApiKey

    } catch (error) {
      console.error('API key validation error:', error)
      return null
    }
  }

  /**
   * Get all API keys for a user
   */
  static async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch API keys:', error)
        throw new Error('Failed to fetch API keys')
      }

      return data as ApiKey[]

    } catch (error) {
      console.error('Get user API keys error:', error)
      throw error
    }
  }

  /**
   * Update an API key
   */
  static async updateApiKey(
    userId: string,
    keyId: string,
    updates: Partial<Pick<ApiKey, 'name' | 'scopes' | 'is_active' | 'expires_at'>>
  ): Promise<ApiKey> {
    try {
      // Validate user owns the key
      const existingKey = await this.getApiKeyById(keyId)
      if (!existingKey || existingKey.user_id !== userId) {
        throw new Error('API key not found or access denied')
      }

      // Validate scopes if being updated
      if (updates.scopes) {
        const rateLimitTier = await this.getUserRateLimitTier(userId)
        updates.scopes = this.validateScopes(updates.scopes, rateLimitTier)
      }

      // Validate expiration date
      if (updates.expires_at && new Date(updates.expires_at) <= new Date()) {
        throw new Error('Expiration date must be in the future')
      }

      const { data, error } = await supabase
        .from('api_keys')
        .update(updates)
        .eq('id', keyId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('Failed to update API key:', error)
        throw new Error('Failed to update API key')
      }

      // Log update event
      await this.logApiKeyEvent(userId, 'api_key_updated', {
        api_key_id: keyId,
        updates
      })

      return data as ApiKey

    } catch (error) {
      console.error('API key update error:', error)
      throw error
    }
  }

  /**
   * Delete an API key
   */
  static async deleteApiKey(userId: string, keyId: string): Promise<void> {
    try {
      // Validate user owns the key
      const existingKey = await this.getApiKeyById(keyId)
      if (!existingKey || existingKey.user_id !== userId) {
        throw new Error('API key not found or access denied')
      }

      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId)
        .eq('user_id', userId)

      if (error) {
        console.error('Failed to delete API key:', error)
        throw new Error('Failed to delete API key')
      }

      // Log deletion event
      await this.logApiKeyEvent(userId, 'api_key_deleted', {
        api_key_id: keyId,
        name: existingKey.name
      })

    } catch (error) {
      console.error('API key deletion error:', error)
      throw error
    }
  }

  /**
   * Rotate an API key (generate new key, keep same metadata)
   */
  static async rotateApiKey(userId: string, keyId: string): Promise<CreateApiKeyResponse> {
    try {
      // Get existing key
      const existingKey = await this.getApiKeyById(keyId)
      if (!existingKey || existingKey.user_id !== userId) {
        throw new Error('API key not found or access denied')
      }

      // Generate new API key
      const newApiKey = this.generateSecureKey()
      const keyHash = this.hashApiKey(newApiKey)
      const keyPrefix = newApiKey.substring(0, 16)

      // Update the existing record with new key data
      const { data, error } = await supabase
        .from('api_keys')
        .update({
          key_hash: keyHash,
          key_prefix: keyPrefix,
          last_used_at: null, // Reset usage timestamp
          usage_stats: {
            ...existingKey.usage_stats,
            last_request_at: undefined // Clear last request
          }
        })
        .eq('id', keyId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('Failed to rotate API key:', error)
        throw new Error('Failed to rotate API key')
      }

      // Log rotation event
      await this.logApiKeyEvent(userId, 'api_key_rotated', {
        api_key_id: keyId,
        name: existingKey.name
      })

      return {
        api_key: data as ApiKey,
        key: newApiKey,
        warning: 'API key rotated successfully. Update all integrations with the new key.'
      }

    } catch (error) {
      console.error('API key rotation error:', error)
      throw error
    }
  }

  /**
   * Generate a cryptographically secure API key
   */
  private static generateSecureKey(): string {
    const randomBytes32 = randomBytes(24) // 24 bytes = 32 base64 chars (after padding removal)
    const base64 = randomBytes32.toString('base64')
      .replace(/[+/=]/g, '') // Remove problematic characters
      .substring(0, this.KEY_LENGTH)

    return this.KEY_PREFIX + base64
  }

  /**
   * Hash an API key for secure storage
   */
  private static hashApiKey(apiKey: string): string {
    return createHash(this.HASH_ALGORITHM)
      .update(apiKey)
      .digest('hex')
  }

  /**
   * Validate that user has Professional subscription access
   */
  private static async validateProfessionalAccess(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('tier, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (error || !data) {
        return false
      }

      return data.tier === 'professional'

    } catch (error) {
      console.error('Professional access validation error:', error)
      return false
    }
  }

  /**
   * Get user's current API key count
   */
  private static async getUserApiKeyCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      console.error('Failed to count API keys:', error)
      return 0
    }

    return count || 0
  }

  /**
   * Get maximum API keys allowed for user
   */
  private static async getMaxApiKeysForUser(userId: string): Promise<number> {
    const tier = await this.getUserRateLimitTier(userId)

    switch (tier) {
      case 'professional': return 10
      case 'enterprise': return 50
      default: return 0 // Free tier gets no API keys
    }
  }

  /**
   * Get user's rate limit tier
   */
  private static async getUserRateLimitTier(userId: string): Promise<RateLimitTier> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('tier')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (error || !data) {
        return 'free'
      }

      // Map subscription tier to rate limit tier
      switch (data.tier) {
        case 'professional': return 'professional'
        default: return 'free'
      }

    } catch (error) {
      console.error('Rate limit tier lookup error:', error)
      return 'free'
    }
  }

  /**
   * Validate API key scopes based on user tier
   */
  private static validateScopes(scopes: ApiKeyScope[], tier: RateLimitTier): ApiKeyScope[] {
    const allowedScopes: Record<RateLimitTier, ApiKeyScope[]> = {
      free: ['read:data'],
      professional: ['read:data', 'read:analytics', 'read:exports', 'write:webhooks'],
      enterprise: ['read:data', 'read:analytics', 'read:exports', 'write:webhooks']
    }

    const tierScopes = allowedScopes[tier]
    return scopes.filter(scope => tierScopes.includes(scope))
  }

  /**
   * Get API key by ID
   */
  private static async getApiKeyById(keyId: string): Promise<ApiKey | null> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('id', keyId)
        .single()

      if (error || !data) {
        return null
      }

      return data as ApiKey

    } catch (error) {
      console.error('Get API key by ID error:', error)
      return null
    }
  }

  /**
   * Update last used timestamp for API key
   */
  private static async updateLastUsed(keyId: string): Promise<void> {
    try {
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyId)

    } catch (error) {
      console.error('Update last used error:', error)
    }
  }

  /**
   * Deactivate an expired API key
   */
  private static async deactivateApiKey(keyId: string): Promise<void> {
    try {
      await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId)

    } catch (error) {
      console.error('Deactivate API key error:', error)
    }
  }

  /**
   * Log API key management events for audit trail
   */
  private static async logApiKeyEvent(
    userId: string,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<void> {
    try {
      await supabase
        .from('user_activity')
        .insert({
          user_id: userId,
          action_type: eventType,
          resource_accessed: 'api_key_management',
          timestamp: new Date().toISOString(),
          // Note: IP address and user agent would be passed from the API endpoint
        })

      console.log(`API key event logged: ${eventType}`, { userId, eventData })

    } catch (error) {
      console.error('Failed to log API key event:', error)
    }
  }
}

/**
 * Utility functions for API key validation in middleware
 */
export class ApiKeyValidator {
  /**
   * Extract API key from request headers
   */
  static extractApiKey(headers: Headers): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }

    // Check X-API-Key header
    const apiKeyHeader = headers.get('x-api-key')
    if (apiKeyHeader) {
      return apiKeyHeader
    }

    return null
  }

  /**
   * Check if API key has required scope
   */
  static hasScope(apiKey: ApiKey, requiredScope: ApiKeyScope): boolean {
    return apiKey.scopes.includes(requiredScope)
  }

  /**
   * Check if API key has any of the required scopes
   */
  static hasAnyScope(apiKey: ApiKey, requiredScopes: ApiKeyScope[]): boolean {
    return requiredScopes.some(scope => apiKey.scopes.includes(scope))
  }

  /**
   * Get rate limit for API key
   */
  static getRateLimit(tier: RateLimitTier): { requestsPerHour: number; burstAllowance: number } {
    const limits = {
      free: { requestsPerHour: 100, burstAllowance: 20 },
      professional: { requestsPerHour: 10000, burstAllowance: 500 },
      enterprise: { requestsPerHour: 50000, burstAllowance: 2000 }
    }

    return limits[tier]
  }
}