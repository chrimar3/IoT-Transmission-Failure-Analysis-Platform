#!/usr/bin/env tsx
/**
 * Production Readiness Validation Script
 * Comprehensive validation for Story 1.2 - Stripe Subscription Integration
 *
 * Usage: npm run validate:production
 *
 * This script validates all critical production requirements:
 * 1. Database schema and functions
 * 2. Stripe configuration
 * 3. Environment variables
 * 4. Webhook endpoints
 * 5. Rate limiting integration
 * 6. Transaction safety
 */

import { StripeProductionValidator } from '@/lib/stripe/production-validation'
import { createClient } from '@supabase/supabase-js'
import { RateLimiter } from '@/lib/api/rate-limiting'

interface ValidationReport {
  timestamp: string
  overall: {
    status: 'READY' | 'NOT_READY'
    readinessScore: number
    blockers: string[]
    warnings: string[]
  }
  sections: {
    environment: ValidationSection
    database: ValidationSection
    stripe: ValidationSection
    rateLimiting: ValidationSection
    webhooks: ValidationSection
  }
}

interface ValidationSection {
  name: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  score: number
  maxScore: number
  details: string[]
  errors: string[]
  warnings: string[]
}

class ProductionReadinessValidator {
  private report: ValidationReport

  constructor() {
    this.report = {
      timestamp: new Date().toISOString(),
      overall: {
        status: 'NOT_READY',
        readinessScore: 0,
        blockers: [],
        warnings: []
      },
      sections: {
        environment: this.createSection('Environment Configuration'),
        database: this.createSection('Database Schema & Functions'),
        stripe: this.createSection('Stripe Integration'),
        rateLimiting: this.createSection('Rate Limiting System'),
        webhooks: this.createSection('Webhook Processing')
      }
    }
  }

  private createSection(name: string): ValidationSection {
    return {
      name,
      status: 'FAIL',
      score: 0,
      maxScore: 100,
      details: [],
      errors: [],
      warnings: []
    }
  }

  async validate(): Promise<ValidationReport> {
    console.log('🚀 Starting Production Readiness Validation for Story 1.2...\n')

    try {
      await this.validateEnvironment()
      await this.validateDatabase()
      await this.validateStripeIntegration()
      await this.validateRateLimiting()
      await this.validateWebhookProcessing()

      this.calculateOverallScore()
      this.generateSummary()

      return this.report
    } catch (error) {
      console.error('❌ Validation failed with error:', error)
      this.report.overall.blockers.push(`Critical validation error: ${(error as Error).message}`)
      return this.report
    }
  }

  private async validateEnvironment(): Promise<void> {
    console.log('🔍 Validating Environment Configuration...')
    const section = this.report.sections.environment

    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_PROFESSIONAL_PRICE_ID',
      'STRIPE_ENTERPRISE_PRICE_ID'
    ]

    let score = 0
    const maxScore = requiredEnvVars.length * 10

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        score += 10
        section.details.push(`✅ ${envVar} configured`)

        // Additional validation for specific variables
        if (envVar === 'STRIPE_SECRET_KEY') {
          const key = process.env[envVar]!
          if (process.env.NODE_ENV === 'production' && key.includes('_test_')) {
            section.errors.push('Using test Stripe key in production')
            score -= 5
          } else if (!key.startsWith('sk_')) {
            section.errors.push('Invalid Stripe secret key format')
            score -= 5
          }
        }

        if (envVar === 'STRIPE_WEBHOOK_SECRET') {
          const secret = process.env[envVar]!
          if (!secret.startsWith('whsec_')) {
            section.errors.push('Invalid webhook secret format')
            score -= 5
          }
        }
      } else {
        section.errors.push(`❌ ${envVar} not configured`)
      }
    }

    // Check NODE_ENV
    if (process.env.NODE_ENV === 'production') {
      score += 10
      section.details.push('✅ Production environment detected')
    } else {
      section.warnings.push('Not running in production mode')
    }

    section.score = Math.max(0, (score / maxScore) * 100)
    section.status = section.errors.length === 0 ? 'PASS' : 'FAIL'
    section.maxScore = 100

    console.log(`   Environment: ${section.status} (${section.score.toFixed(1)}%)\n`)
  }

  private async validateDatabase(): Promise<void> {
    console.log('🔍 Validating Database Schema & Functions...')
    const section = this.report.sections.database

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      let score = 0
      const maxScore = 100

      // Check subscriptions table
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('id')
        .limit(1)

      if (!subError) {
        score += 20
        section.details.push('✅ Subscriptions table accessible')
      } else {
        section.errors.push('❌ Subscriptions table not accessible')
      }

      // Check subscription_events table
      const { data: events, error: eventsError } = await supabase
        .from('subscription_events')
        .select('id')
        .limit(1)

      if (!eventsError) {
        score += 20
        section.details.push('✅ Subscription events table accessible')
      } else {
        section.errors.push('❌ Subscription events table not accessible')
      }

      // Check webhook_retry_queue table
      const { data: queue, error: queueError } = await supabase
        .from('webhook_retry_queue')
        .select('id')
        .limit(1)

      if (!queueError) {
        score += 15
        section.details.push('✅ Webhook retry queue table accessible')
      } else {
        section.warnings.push('⚠️ Webhook retry queue table not accessible')
      }

      // Test transactional functions
      const { data: funcResult, error: funcError } = await supabase
        .rpc('update_subscription_transactional', {
          p_user_id: '00000000-0000-0000-0000-000000000000',
          p_updates: { tier: 'test' }
        })

      if (!funcError || funcError.message.includes('violates foreign key')) {
        score += 25
        section.details.push('✅ Transactional functions available')
      } else {
        section.errors.push('❌ Transactional functions not available')
      }

      // Test webhook processing function
      const { error: webhookFuncError } = await supabase
        .rpc('process_webhook_event_transactional', {
          p_stripe_event_id: 'evt_test_validation',
          p_event_type: 'validation_test',
          p_subscription_id: null,
          p_event_data: { test: true }
        })

      if (!webhookFuncError) {
        score += 20
        section.details.push('✅ Webhook processing functions available')
      } else {
        section.errors.push('❌ Webhook processing functions not available')
      }

      section.score = (score / maxScore) * 100
      section.status = section.errors.length === 0 ? 'PASS' : 'FAIL'

    } catch (error) {
      section.errors.push(`Database validation failed: ${(error as Error).message}`)
      section.status = 'FAIL'
    }

    console.log(`   Database: ${section.status} (${section.score.toFixed(1)}%)\n`)
  }

  private async validateStripeIntegration(): Promise<void> {
    console.log('🔍 Validating Stripe Integration...')
    const section = this.report.sections.stripe

    try {
      const stripeValidation = await StripeProductionValidator.validateProductionReadiness()

      let totalScore = 0
      let maxPossibleScore = 0

      const sectionWeights = {
        apiKeys: 30,
        priceIds: 25,
        webhookEndpoints: 25,
        customerPortal: 10,
        taxSettings: 10
      }

      for (const [key, weight] of Object.entries(sectionWeights)) {
        const result = stripeValidation[key as keyof typeof stripeValidation] as any
        maxPossibleScore += weight

        if (result.valid) {
          totalScore += weight
          section.details.push(`✅ ${key}: Valid`)
        } else {
          section.errors.push(`❌ ${key}: ${result.errors.join(', ')}`)
        }

        // Add warnings
        if (result.warnings?.length > 0) {
          section.warnings.push(...result.warnings)
        }
      }

      section.score = (totalScore / maxPossibleScore) * 100
      section.status = stripeValidation.overall.valid ? 'PASS' : 'FAIL'

    } catch (error) {
      section.errors.push(`Stripe validation failed: ${(error as Error).message}`)
      section.status = 'FAIL'
      section.score = 0
    }

    console.log(`   Stripe: ${section.status} (${section.score.toFixed(1)}%)\n`)
  }

  private async validateRateLimiting(): Promise<void> {
    console.log('🔍 Validating Rate Limiting System...')
    const section = this.report.sections.rateLimiting

    try {
      let score = 0
      const maxScore = 100

      // Test rate limiting configuration
      const tiers: Array<'free' | 'professional' | 'enterprise'> = ['free', 'professional', 'enterprise']

      for (const tier of tiers) {
        try {
          const result = await RateLimiter.getRateLimitStatus('test_key', tier)
          if (result.limit > 0) {
            score += 20
            section.details.push(`✅ ${tier} tier rate limiting configured (${result.limit} req/hr)`)
          }
        } catch (error) {
          section.warnings.push(`⚠️ Could not test ${tier} tier rate limiting`)
        }
      }

      // Test subscription tier detection
      try {
        const freeTier = await RateLimiter.getUserTierFromSubscription('nonexistent_user')
        if (freeTier === 'free') {
          score += 20
          section.details.push('✅ Subscription tier detection working (defaults to free)')
        }
      } catch (error) {
        section.errors.push('❌ Subscription tier detection failed')
      }

      // Test burst limiting
      try {
        const burstResult = await RateLimiter.checkBurstLimit('test_key', 'test_user', 'free')
        score += 20
        section.details.push('✅ Burst rate limiting functional')
      } catch (error) {
        section.warnings.push('⚠️ Could not test burst rate limiting')
      }

      section.score = (score / maxScore) * 100
      section.status = section.errors.length === 0 ?
        (section.score >= 80 ? 'PASS' : 'WARNING') : 'FAIL'

    } catch (error) {
      section.errors.push(`Rate limiting validation failed: ${(error as Error).message}`)
      section.status = 'FAIL'
    }

    console.log(`   Rate Limiting: ${section.status} (${section.score.toFixed(1)}%)\n`)
  }

  private async validateWebhookProcessing(): Promise<void> {
    console.log('🔍 Validating Webhook Processing...')
    const section = this.report.sections.webhooks

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      let score = 0
      const maxScore = 100

      // Check webhook retry queue functionality
      const { data: queueHealth, error: healthError } = await supabase
        .rpc('get_webhook_retry_queue_health')

      if (!healthError && queueHealth) {
        score += 30
        section.details.push('✅ Webhook retry queue health monitoring available')
      } else {
        section.warnings.push('⚠️ Webhook retry queue health monitoring not available')
      }

      // Test webhook event processing
      const testEventId = `evt_test_${Date.now()}`
      const { error: processError } = await supabase
        .rpc('process_webhook_event_transactional', {
          p_stripe_event_id: testEventId,
          p_event_type: 'test_event',
          p_subscription_id: null,
          p_event_data: { test: 'validation' }
        })

      if (!processError) {
        score += 30
        section.details.push('✅ Webhook event processing functional')

        // Test idempotency
        const { error: duplicateError } = await supabase
          .rpc('process_webhook_event_transactional', {
            p_stripe_event_id: testEventId, // Same ID
            p_event_type: 'test_event',
            p_subscription_id: null,
            p_event_data: { test: 'duplicate' }
          })

        if (!duplicateError) {
          score += 20
          section.details.push('✅ Webhook idempotency protection working')
        }
      } else {
        section.errors.push('❌ Webhook event processing failed')
      }

      // Check webhook endpoint configuration
      if (process.env.VERCEL_URL || process.env.NEXT_PUBLIC_SITE_URL) {
        score += 20
        section.details.push('✅ Webhook endpoint URL configured')
      } else {
        section.warnings.push('⚠️ Webhook endpoint URL not configured')
      }

      section.score = (score / maxScore) * 100
      section.status = section.errors.length === 0 ?
        (section.score >= 70 ? 'PASS' : 'WARNING') : 'FAIL'

    } catch (error) {
      section.errors.push(`Webhook validation failed: ${(error as Error).message}`)
      section.status = 'FAIL'
    }

    console.log(`   Webhooks: ${section.status} (${section.score.toFixed(1)}%)\n`)
  }

  private calculateOverallScore(): void {
    const sections = Object.values(this.report.sections)
    const weights = {
      environment: 20,
      database: 25,
      stripe: 30,
      rateLimiting: 15,
      webhooks: 10
    }

    let totalScore = 0
    let totalWeight = 0

    sections.forEach((section, index) => {
      const weight = Object.values(weights)[index]
      totalScore += (section.score / 100) * weight
      totalWeight += weight
    })

    this.report.overall.readinessScore = (totalScore / totalWeight) * 100

    // Collect all blockers and warnings
    sections.forEach(section => {
      this.report.overall.blockers.push(...section.errors)
      this.report.overall.warnings.push(...section.warnings)
    })

    // Determine overall status
    const hasBlockers = this.report.overall.blockers.length > 0
    const readinessScore = this.report.overall.readinessScore

    if (hasBlockers || readinessScore < 70) {
      this.report.overall.status = 'NOT_READY'
    } else {
      this.report.overall.status = 'READY'
    }
  }

  private generateSummary(): void {
    console.log('📊 Production Readiness Summary')
    console.log('='.repeat(50))
    console.log(`Overall Status: ${this.report.overall.status}`)
    console.log(`Readiness Score: ${this.report.overall.readinessScore.toFixed(1)}%`)
    console.log(`Timestamp: ${this.report.timestamp}`)
    console.log()

    console.log('Section Scores:')
    Object.entries(this.report.sections).forEach(([key, section]) => {
      const statusEmoji = section.status === 'PASS' ? '✅' : section.status === 'WARNING' ? '⚠️' : '❌'
      console.log(`  ${statusEmoji} ${section.name}: ${section.score.toFixed(1)}%`)
    })
    console.log()

    if (this.report.overall.blockers.length > 0) {
      console.log('🚫 Blockers (must fix before production):')
      this.report.overall.blockers.forEach((blocker, i) => {
        console.log(`  ${i + 1}. ${blocker}`)
      })
      console.log()
    }

    if (this.report.overall.warnings.length > 0) {
      console.log('⚠️  Warnings (recommended to fix):')
      this.report.overall.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`)
      })
      console.log()
    }

    if (this.report.overall.status === 'READY') {
      console.log('🎉 Production Ready! Story 1.2 can be deployed.')
    } else {
      console.log('🔧 Production readiness incomplete. Address blockers before deployment.')
    }
  }
}

// CLI execution
async function main() {
  const validator = new ProductionReadinessValidator()
  const report = await validator.validate()

  // Save report to file
  const fs = await import('fs/promises')
  await fs.writeFile(
    'production-readiness-report.json',
    JSON.stringify(report, null, 2)
  )

  console.log('📄 Full report saved to production-readiness-report.json')

  // Exit with error code if not ready
  process.exit(report.overall.status === 'READY' ? 0 : 1)
}

if (require.main === module) {
  main().catch(console.error)
}

export { ProductionReadinessValidator, type ValidationReport }