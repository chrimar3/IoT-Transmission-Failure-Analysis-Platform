/**
 * API Key Management
 * Mock service for testing API key operations
 */

export interface ApiKey {
  id: string
  key: string
  user_id: string
  name: string
  permissions: string[]
  created_at: string
  last_used?: string
  is_active: boolean
}

export class ApiKeyManager {
  static async createApiKey(userId: string, name: string, permissions: string[]): Promise<ApiKey> {
    return {
      id: `key_${Date.now()}`,
      key: `pk_test_${Math.random().toString(36).substr(2, 32)}`,
      user_id: userId,
      name,
      permissions,
      created_at: new Date().toISOString(),
      is_active: true
    }
  }

  static async validateApiKey(key: string): Promise<ApiKey | null> {
    // Mock validation
    if (key.startsWith('pk_test_')) {
      return {
        id: 'key_123',
        key,
        user_id: 'user_123',
        name: 'Test API Key',
        permissions: ['read', 'write'],
        created_at: new Date().toISOString(),
        is_active: true
      }
    }
    return null
  }

  static async revokeApiKey(_keyId: string): Promise<boolean> {
    // Mock revocation
    return true
  }
}