/**
 * Production Environment Validation for Stripe Integration
 * Addresses QA BLOCKING Production Readiness - Story 1.2
 * Ensures all production configurations are properly validated
 */

import { stripe, STRIPE_CONFIG } from './config'
import type _Stripe from 'stripe'

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  details?: Record<string, unknown>
}

interface ProductionValidationSuite {
  webhookEndpoints: ValidationResult
  apiKeys: ValidationResult
  priceIds: ValidationResult
  customerPortal: ValidationResult
  taxSettings: ValidationResult
  overall: ValidationResult
}

export class StripeProductionValidator {
  /**
   * Run complete production readiness validation suite
   */
  static async validateProductionReadiness(): Promise<ProductionValidationSuite> {
    console.log('🔍 Starting Stripe production readiness validation...')

    const results: ProductionValidationSuite = {
      webhookEndpoints: await this.validateWebhookEndpoints(),
      apiKeys: await this.validateApiKeys(),
      priceIds: await this.validatePriceIds(),
      customerPortal: await this.validateCustomerPortal(),
      taxSettings: await this.validateTaxSettings(),
      overall: { valid: false, errors: [], warnings: [] }
    }

    // Calculate overall validation result
    const allResults = [
      results.webhookEndpoints,
      results.apiKeys,
      results.priceIds,
      results.customerPortal,
      results.taxSettings
    ]

    results.overall = {
      valid: allResults.every(r => r.valid),
      errors: allResults.flatMap(r => r.errors),
      warnings: allResults.flatMap(r => r.warnings)
    }

    console.log(`✅ Production validation complete. Valid: ${results.overall.valid}`)

    return results
  }

  /**
   * Validate webhook endpoint configuration
   */
  private static async validateWebhookEndpoints(): Promise<ValidationResult> {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] }

    try {
      // Check if webhook secret is configured
      if (!STRIPE_CONFIG.WEBHOOK_SECRET) {
        result.errors.push('STRIPE_WEBHOOK_SECRET environment variable not configured')
        result.valid = false
      }

      // Validate webhook secret format
      if (STRIPE_CONFIG.WEBHOOK_SECRET && !STRIPE_CONFIG.WEBHOOK_SECRET.startsWith('whsec_')) {
        result.errors.push('STRIPE_WEBHOOK_SECRET does not appear to be a valid webhook secret (should start with "whsec_")')
        result.valid = false
      }

      // Check webhook endpoints in Stripe dashboard
      const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 100 })

      const requiredEvents = [
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
        'checkout.session.completed',
        'customer.subscription.trial_will_end'
      ]

      const activeEndpoints = webhookEndpoints.data.filter(endpoint => endpoint.status === 'enabled')

      if (activeEndpoints.length === 0) {
        result.errors.push('No active webhook endpoints found in Stripe dashboard')
        result.valid = false
      }

      // Check if required events are configured
      for (const endpoint of activeEndpoints) {
        const missingEvents = requiredEvents.filter(event => !endpoint.enabled_events.includes(event))
        if (missingEvents.length > 0) {
          result.warnings.push(`Webhook endpoint ${endpoint.url} is missing events: ${missingEvents.join(', ')}`)
        }
      }

      // Validate production webhook URLs
      const prodEndpoints = activeEndpoints.filter(endpoint =>
        endpoint.url.includes('https://') && !endpoint.url.includes('localhost')
      )

      if (process.env.NODE_ENV === 'production' && prodEndpoints.length === 0) {
        result.errors.push('No production HTTPS webhook endpoints found')
        result.valid = false
      }

      result.details = {
        totalEndpoints: webhookEndpoints.data.length,
        activeEndpoints: activeEndpoints.length,
        productionEndpoints: prodEndpoints.length,
        configuredEvents: activeEndpoints.flatMap(e => e.enabled_events)
      }

    } catch (error) {
      result.errors.push(`Failed to validate webhook endpoints: ${(error as Error).message}`)
      result.valid = false
    }

    return result
  }

  /**
   * Validate API keys and permissions
   */
  private static async validateApiKeys(): Promise<ValidationResult> {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] }

    try {
      // Check API key configuration
      if (!process.env.STRIPE_SECRET_KEY) {
        result.errors.push('STRIPE_SECRET_KEY environment variable not configured')
        result.valid = false
        return result
      }

      // Validate API key format
      const secretKey = process.env.STRIPE_SECRET_KEY
      if (!secretKey.startsWith('sk_')) {
        result.errors.push('STRIPE_SECRET_KEY does not appear to be a valid secret key (should start with "sk_")')
        result.valid = false
      }

      // Check if using test keys in production
      if (process.env.NODE_ENV === 'production' && secretKey.includes('_test_')) {
        result.errors.push('Using test API key in production environment')
        result.valid = false
      }

      // Test API key by making a simple request
      const balance = await stripe.balance.retrieve()

      // Check required permissions by testing key operations
      const permissions = await this.testApiKeyPermissions()

      result.details = {
        keyType: secretKey.includes('_test_') ? 'test' : 'live',
        availableBalance: balance.available,
        pendingBalance: balance.pending,
        permissions
      }

      if (!permissions.canCreateCustomers) {
        result.errors.push('API key does not have permission to create customers')
        result.valid = false
      }

      if (!permissions.canCreateCheckoutSessions) {
        result.errors.push('API key does not have permission to create checkout sessions')
        result.valid = false
      }

    } catch (error) {
      result.errors.push(`Failed to validate API keys: ${(error as Error).message}`)
      result.valid = false
    }

    return result
  }

  /**
   * Validate product and price configurations
   */
  private static async validatePriceIds(): Promise<ValidationResult> {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] }

    try {
      const requiredPrices = {
        professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
        enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID
      }

      const priceValidations = []

      for (const [tier, priceId] of Object.entries(requiredPrices)) {
        if (!priceId) {
          result.errors.push(`${tier.toUpperCase()} price ID not configured`)
          result.valid = false
          continue
        }

        try {
          const price = await stripe.prices.retrieve(priceId)
          const product = await stripe.products.retrieve(price.product as string)

          priceValidations.push({
            tier,
            priceId,
            active: price.active && product.active,
            amount: price.unit_amount,
            currency: price.currency,
            interval: price.recurring?.interval,
            productName: product.name
          })

          if (!price.active || !product.active) {
            result.errors.push(`${tier} price or product is not active in Stripe`)
            result.valid = false
          }

          // Validate pricing structure
          if (!price.recurring) {
            result.errors.push(`${tier} price is not set up for recurring billing`)
            result.valid = false
          }

        } catch (priceError) {
          result.errors.push(`Invalid ${tier} price ID: ${(priceError as Error).message}`)
          result.valid = false
        }
      }

      result.details = { priceValidations }

    } catch (error) {
      result.errors.push(`Failed to validate price IDs: ${(error as Error).message}`)
      result.valid = false
    }

    return result
  }

  /**
   * Validate customer portal configuration
   */
  private static async validateCustomerPortal(): Promise<ValidationResult> {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] }

    try {
      // Test customer portal configuration
      const configuration = await stripe.billingPortal.configurations.list({ limit: 1 })

      if (configuration.data.length === 0) {
        result.errors.push('No customer portal configuration found')
        result.valid = false
      } else {
        const config = configuration.data[0]

        // Check required features
        const requiredFeatures = [
          'customer_update',
          'subscription_cancel',
          'subscription_pause',
          'subscription_update',
          'payment_method_update'
        ]

        const missingFeatures = requiredFeatures.filter(feature => {
          const featureConfig = config.features[feature as keyof typeof config.features]
          return !featureConfig?.enabled
        })

        if (missingFeatures.length > 0) {
          result.warnings.push(`Customer portal missing features: ${missingFeatures.join(', ')}`)
        }

        result.details = {
          configurationId: config.id,
          isDefault: config.is_default,
          enabledFeatures: Object.entries(config.features)
            .filter(([_, featureConfig]) => featureConfig?.enabled)
            .map(([featureName]) => featureName)
        }
      }

    } catch (error) {
      result.errors.push(`Failed to validate customer portal: ${(error as Error).message}`)
      result.valid = false
    }

    return result
  }

  /**
   * Validate tax calculation settings
   */
  private static async validateTaxSettings(): Promise<ValidationResult> {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] }

    try {
      // Check if automatic tax is enabled
      const taxSettings = await stripe.tax.settings.retrieve()

      if (!taxSettings.status) {
        result.warnings.push('Automatic tax calculation is not enabled')
      }

      // Test tax calculation for common scenarios
      const testCalculation = await stripe.tax.calculations.create({
        currency: 'usd',
        line_items: [
          {
            amount: 2900, // $29.00
            reference: 'test-professional-plan'
          }
        ],
        customer_details: {
          address: {
            line1: '123 Test St',
            city: 'San Francisco',
            state: 'CA',
            postal_code: '94102',
            country: 'US'
          },
          address_source: 'billing'
        }
      })

      result.details = {
        taxEnabled: !!taxSettings.status,
        testCalculation: {
          totalTax: testCalculation.tax_amount_exclusive,
          taxBreakdown: testCalculation.tax_breakdown?.map((breakdown: Record<string, any>) => ({
            jurisdiction: breakdown.jurisdiction || 'Unknown',
            rate: breakdown.tax_rate_details?.percentage_decimal || 0,
            amount: breakdown.amount || breakdown.tax_amount || 0
          }))
        }
      }

    } catch (error) {
      // Tax settings are optional, so this is a warning not an error
      result.warnings.push(`Could not validate tax settings: ${(error as Error).message}`)
    }

    return result
  }

  /**
   * Test API key permissions
   */
  private static async testApiKeyPermissions(): Promise<{
    canCreateCustomers: boolean
    canCreateCheckoutSessions: boolean
    canCreateBillingPortalSessions: boolean
    canRetrieveSubscriptions: boolean
  }> {
    const permissions = {
      canCreateCustomers: false,
      canCreateCheckoutSessions: false,
      canCreateBillingPortalSessions: false,
      canRetrieveSubscriptions: false
    }

    try {
      // Test customer creation
      const testCustomer = await stripe.customers.create({
        email: 'production-test@example.com',
        metadata: { test: 'production-validation' }
      })
      await stripe.customers.del(testCustomer.id)
      permissions.canCreateCustomers = true
    } catch (error) {
      console.warn('Cannot create customers:', (error as Error).message)
    }

    try {
      // Test checkout session creation (won't complete, just test permission)
      await stripe.checkout.sessions.create({
        mode: 'setup',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      })
      permissions.canCreateCheckoutSessions = true
    } catch (error) {
      // Expected to fail without valid customer, but we can check if it's a permission error
      if (!(error as Error).message.includes('customer')) {
        console.warn('Cannot create checkout sessions:', (error as Error).message)
      } else {
        permissions.canCreateCheckoutSessions = true
      }
    }

    try {
      // Test billing portal (will fail without customer, but we check permission)
      await stripe.billingPortal.sessions.create({
        customer: 'cus_test_nonexistent',
        return_url: 'https://example.com'
      })
      permissions.canCreateBillingPortalSessions = true
    } catch (error) {
      // Expected to fail with invalid customer, but we check if it's permission-related
      if ((error as Error).message.includes('No such customer')) {
        permissions.canCreateBillingPortalSessions = true
      }
    }

    try {
      // Test subscription listing
      await stripe.subscriptions.list({ limit: 1 })
      permissions.canRetrieveSubscriptions = true
    } catch (error) {
      console.warn('Cannot retrieve subscriptions:', (error as Error).message)
    }

    return permissions
  }

  /**
   * Generate production readiness report
   */
  static generateProductionReport(validation: ProductionValidationSuite): string {
    const timestamp = new Date().toISOString()
    let report = `# Stripe Production Readiness Report\n`
    report += `Generated: ${timestamp}\n`
    report += `Overall Status: ${validation.overall.valid ? '✅ READY' : '❌ NOT READY'}\n\n`

    // Summary
    const sections = [
      { name: 'Webhook Endpoints', result: validation.webhookEndpoints },
      { name: 'API Keys', result: validation.apiKeys },
      { name: 'Price Configuration', result: validation.priceIds },
      { name: 'Customer Portal', result: validation.customerPortal },
      { name: 'Tax Settings', result: validation.taxSettings }
    ]

    report += `## Validation Summary\n\n`
    sections.forEach(section => {
      const status = section.result.valid ? '✅' : '❌'
      report += `- ${status} ${section.name}\n`
    })

    // Detailed results
    report += `\n## Detailed Results\n\n`

    sections.forEach(section => {
      report += `### ${section.name}\n`
      report += `Status: ${section.result.valid ? '✅ Valid' : '❌ Invalid'}\n`

      if (section.result.errors.length > 0) {
        report += `\n**Errors:**\n`
        section.result.errors.forEach(error => {
          report += `- ❌ ${error}\n`
        })
      }

      if (section.result.warnings.length > 0) {
        report += `\n**Warnings:**\n`
        section.result.warnings.forEach(warning => {
          report += `- ⚠️ ${warning}\n`
        })
      }

      if (section.result.details) {
        report += `\n**Details:**\n`
        report += `\`\`\`json\n${JSON.stringify(section.result.details, null, 2)}\n\`\`\`\n`
      }

      report += `\n`
    })

    // Action items
    if (!validation.overall.valid) {
      report += `## Required Actions Before Production Deployment\n\n`
      validation.overall.errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`
      })
    }

    if (validation.overall.warnings.length > 0) {
      report += `\n## Recommended Improvements\n\n`
      validation.overall.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`
      })
    }

    return report
  }
}