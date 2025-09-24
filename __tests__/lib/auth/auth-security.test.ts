/**
 * Unit Tests for Authentication Security Controls
 * Tests Story 1.1: NextAuth.js Authentication Setup security features
 */

import { validateOAuthRedirect } from '../../../lib/auth/oauth-security'
import { sanitizeEmail, validatePassword, sanitizeAuthRequest } from '../../../lib/auth/input-sanitization'
import { generateCSPNonce } from '../../../middleware/security-headers'

describe('Authentication Security Controls', () => {
  describe('OAuth Redirect Validation', () => {
    const baseUrl = 'https://cu-bems-analytics.com'

    it('should allow whitelisted redirect URLs', () => {
      const validUrls = [
        'https://cu-bems-analytics.com/api/auth/callback/google',
        'https://cu-bems-analytics.com/dashboard',
        `${baseUrl}/dashboard`
      ]

      validUrls.forEach(url => {
        expect(validateOAuthRedirect(url, baseUrl)).toBe(true)
      })
    })

    it('should block suspicious redirect URLs', () => {
      const maliciousUrls = [
        'https://attacker.com/steal-tokens',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'https://evil.com/api/auth/callback/google'
      ]

      maliciousUrls.forEach(url => {
        expect(validateOAuthRedirect(url, baseUrl)).toBe(false)
      })
    })

    it('should handle relative URLs safely', () => {
      expect(validateOAuthRedirect('/dashboard', baseUrl)).toBe(true)
      expect(validateOAuthRedirect('/auth/signin', baseUrl)).toBe(true)
    })
  })

  describe('Input Sanitization', () => {
    describe('Email Sanitization', () => {
      it('should sanitize valid emails correctly', () => {
        expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com')
        expect(sanitizeEmail('user.name+tag@domain.co.uk')).toBe('user.name+tag@domain.co.uk')
      })

      it('should reject invalid emails', () => {
        const invalidEmails = [
          '',
          'invalid',
          '@domain.com',
          'user@',
          'user..double@domain.com',
          '.user@domain.com',
          'user@domain.com.',
          'a'.repeat(255) + '@domain.com' // Too long
        ]

        invalidEmails.forEach(email => {
          expect(sanitizeEmail(email)).toBeNull()
        })
      })

      it('should prevent XSS in email input', () => {
        const xssEmails = [
          '<script>alert(1)</script>@domain.com',
          'user@domain.com<script>',
          'javascript:alert(1)@domain.com'
        ]

        xssEmails.forEach(email => {
          expect(sanitizeEmail(email)).toBeNull()
        })
      })
    })

    describe('Password Validation', () => {
      it('should accept strong passwords', () => {
        const strongPasswords = [
          'MyStr0ng!Pass',
          'C0mplex#Password2023',
          'S3cure&L0ng!Pass'
        ]

        strongPasswords.forEach(password => {
          const result = validatePassword(password)
          expect(result.valid).toBe(true)
          expect(result.errors).toHaveLength(0)
        })
      })

      it('should reject weak passwords', () => {
        const weakPasswords = [
          'short', // Too short
          'lowercase', // No uppercase
          'UPPERCASE', // No lowercase
          'NoNumbers!', // No numbers
          'NoSpecial123', // No special chars
          'password123', // Common password
        ]

        weakPasswords.forEach(password => {
          const result = validatePassword(password)
          expect(result.valid).toBe(false)
          expect(result.errors.length).toBeGreaterThan(0)
        })
      })

      it('should detect common weak passwords', () => {
        const result = validatePassword('password123')
        expect(result.valid).toBe(false)
        expect(result.errors.some(error => error.includes('too common'))).toBe(true)
      })
    })

    describe('Complete Auth Request Sanitization', () => {
      it('should sanitize valid authentication requests', () => {
        const result = sanitizeAuthRequest({
          email: '  USER@EXAMPLE.COM  ',
          password: 'ValidPass123!',
          name: '<script>alert(1)</script>John Doe',
          callbackUrl: '/dashboard'
        })

        expect(result.valid).toBe(true)
        expect(result.sanitized.email).toBe('user@example.com')
        expect(result.sanitized.password).toBe('ValidPass123!')
        expect(result.sanitized.name).toBe('John Doe') // XSS removed
        expect(result.errors).toHaveLength(0)
      })

      it('should reject invalid authentication requests', () => {
        const result = sanitizeAuthRequest({
          email: 'invalid-email',
          password: 'weak',
          name: '',
          callbackUrl: 'javascript:alert(1)'
        })

        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('CSP Nonce Generation', () => {
    it('should generate unique nonces', () => {
      const nonce1 = generateCSPNonce()
      const nonce2 = generateCSPNonce()

      expect(nonce1).not.toBe(nonce2)
      expect(nonce1.length).toBeGreaterThan(10)
      expect(nonce2.length).toBeGreaterThan(10)
    })

    it('should generate base64 encoded nonces', () => {
      const nonce = generateCSPNonce()

      // Should be valid base64
      expect(() => {
        Buffer.from(nonce, 'base64')
      }).not.toThrow()
    })
  })
})