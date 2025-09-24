#!/usr/bin/env node

/**
 * Production Environment Validation Script
 * Validates that all required environment variables are set for production deployment
 */

const fs = require('fs')
const path = require('path')

// Required environment variables for production
const REQUIRED_ENV_VARS = {
  // Supabase
  'NEXT_PUBLIC_SUPABASE_URL': 'Supabase project URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'Supabase anonymous key',
  'SUPABASE_SERVICE_ROLE_KEY': 'Supabase service role key',

  // NextAuth
  'NEXTAUTH_URL': 'Production domain URL',
  'NEXTAUTH_SECRET': 'NextAuth secret key (min 32 chars)',

  // Google OAuth
  'GOOGLE_CLIENT_ID': 'Google OAuth client ID',
  'GOOGLE_CLIENT_SECRET': 'Google OAuth client secret',

  // Stripe
  'STRIPE_SECRET_KEY': 'Stripe secret key (should start with sk_live_)',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': 'Stripe publishable key (should start with pk_live_)',
  'STRIPE_WEBHOOK_SECRET': 'Stripe webhook secret',

  // Application
  'NODE_ENV': 'Should be "production"',
  'API_BASE_URL': 'Production API base URL',
}

// Optional but recommended environment variables
const RECOMMENDED_ENV_VARS = {
  'DATABASE_URL': 'Production database connection string',
  'REDIS_URL': 'Redis cache URL for sessions and rate limiting',
  'SENTRY_DSN': 'Error monitoring DSN',
  'R2_ACCESS_KEY_ID': 'Cloudflare R2 access key for file storage',
  'R2_SECRET_ACCESS_KEY': 'Cloudflare R2 secret key',
  'ENCRYPTION_KEY': 'Application encryption key',
  'JWT_SECRET': 'JWT signing secret',
}

// Security validations
const SECURITY_CHECKS = {
  'NEXTAUTH_SECRET': (value) => value && value.length >= 32,
  'STRIPE_SECRET_KEY': (value) => value && value.startsWith('sk_live_'),
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': (value) => value && value.startsWith('pk_live_'),
  'NODE_ENV': (value) => value === 'production',
  'NEXTAUTH_URL': (value) => value && value.startsWith('https://'),
  'API_BASE_URL': (value) => value && value.startsWith('https://'),
}

function validateEnvironment() {
  console.log('🔍 Validating Production Environment Configuration...\n')

  let hasErrors = false
  let hasWarnings = false

  // Check required variables
  console.log('✅ Required Environment Variables:')
  for (const [key, description] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[key]

    if (!value || value.includes('your_') || value.includes('_here')) {
      console.log(`❌ ${key}: MISSING or contains placeholder value`)
      console.log(`   Description: ${description}`)
      hasErrors = true
    } else {
      // Run security check if available
      const securityCheck = SECURITY_CHECKS[key]
      if (securityCheck && !securityCheck(value)) {
        console.log(`⚠️  ${key}: PRESENT but failed security validation`)
        console.log(`   Description: ${description}`)
        hasErrors = true
      } else {
        console.log(`✅ ${key}: OK`)
      }
    }
  }

  console.log('\n📋 Recommended Environment Variables:')
  for (const [key, description] of Object.entries(RECOMMENDED_ENV_VARS)) {
    const value = process.env[key]

    if (!value || value.includes('your_') || value.includes('_here')) {
      console.log(`⚠️  ${key}: MISSING or contains placeholder value`)
      console.log(`   Description: ${description}`)
      hasWarnings = true
    } else {
      console.log(`✅ ${key}: OK`)
    }
  }

  // Additional security checks
  console.log('\n🔒 Security Validations:')

  // Check for development indicators
  const devIndicators = ['localhost', '127.0.0.1', 'test', 'dev', 'example.com']
  let hasDevIndicators = false

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('NEXT_PUBLIC_') || key.includes('URL')) {
      for (const indicator of devIndicators) {
        if (value && value.toLowerCase().includes(indicator)) {
          console.log(`⚠️  ${key} contains development indicator: ${indicator}`)
          hasDevIndicators = true
          hasWarnings = true
        }
      }
    }
  }

  if (!hasDevIndicators) {
    console.log('✅ No development indicators found in URLs')
  }

  // Summary
  console.log('\n📊 Validation Summary:')
  if (hasErrors) {
    console.log('❌ VALIDATION FAILED: Critical environment variables are missing or invalid')
    console.log('   🚫 DO NOT DEPLOY TO PRODUCTION')
    console.log('   🔧 Please fix the errors above before deployment')
    process.exit(1)
  } else if (hasWarnings) {
    console.log('⚠️  VALIDATION PASSED WITH WARNINGS')
    console.log('   ✅ Safe to deploy, but consider addressing warnings')
    console.log('   🚀 Ready for production deployment')
  } else {
    console.log('✅ VALIDATION PASSED')
    console.log('   🚀 All environment variables properly configured')
    console.log('   🎉 Ready for production deployment')
  }

  return !hasErrors
}

function generateEnvTemplate() {
  console.log('\n📝 Generating production environment template...')

  const template = Object.entries({...REQUIRED_ENV_VARS, ...RECOMMENDED_ENV_VARS})
    .map(([key, description]) => `# ${description}\n${key}=REPLACE_WITH_ACTUAL_VALUE`)
    .join('\n\n')

  const templatePath = path.join(process.cwd(), '.env.production.template')
  fs.writeFileSync(templatePath, template)
  console.log(`📄 Template saved to: ${templatePath}`)
}

// Main execution
if (require.main === module) {
  const command = process.argv[2]

  if (command === 'template') {
    generateEnvTemplate()
  } else {
    validateEnvironment()
  }
}

module.exports = { validateEnvironment, generateEnvTemplate }