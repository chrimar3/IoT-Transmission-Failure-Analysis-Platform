#!/usr/bin/env node

/**
 * Domain Setup and DNS Configuration Script
 * Automates domain setup for CU-BEMS IoT Platform
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG_PATH = path.join(__dirname, '../../config/domain/dns-config.json');

class DomainSetup {
  constructor() {
    this.config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    this.environment = process.env.NODE_ENV || 'development';
  }

  async setupVercelDomain() {
    console.log('🌐 Setting up Vercel domain configuration...');

    try {
      // Add domain to Vercel project
      if (this.environment === 'production') {
        const domain = this.config.production.domain;
        console.log(`Adding domain: ${domain}`);

        // Note: These commands require Vercel CLI to be installed and authenticated
        execSync(`vercel domains add ${domain}`, { stdio: 'inherit' });

        // Add subdomains
        Object.values(this.config.production.subdomains).forEach(subdomain => {
          console.log(`Adding subdomain: ${subdomain}`);
          execSync(`vercel domains add ${subdomain}`, { stdio: 'inherit' });
        });
      }

      console.log('✅ Vercel domain configuration completed');
    } catch (error) {
      console.error('❌ Vercel domain setup failed:', error.message);
      throw error;
    }
  }

  async setupSSL() {
    console.log('🔒 Setting up SSL certificates...');

    try {
      const envConfig = this.config[this.environment];

      if (envConfig.ssl && envConfig.ssl.provider === 'lets-encrypt') {
        console.log('Configuring Let\'s Encrypt SSL...');

        // Update environment variables for SSL
        const sslEnvVars = {
          FORCE_HTTPS: 'true',
          HSTS_MAX_AGE: envConfig.ssl.hsts['max-age'].toString(),
          HSTS_INCLUDE_SUBDOMAINS: envConfig.ssl.hsts['include-subdomains'].toString(),
          HSTS_PRELOAD: envConfig.ssl.hsts.preload.toString()
        };

        this.updateEnvironmentVariables(sslEnvVars);
      }

      console.log('✅ SSL configuration completed');
    } catch (error) {
      console.error('❌ SSL setup failed:', error.message);
      throw error;
    }
  }

  async verifyDNS() {
    console.log('🔍 Verifying DNS configuration...');

    try {
      const domain = this.config[this.environment].domain;

      if (this.environment === 'production') {
        // Verify DNS records
        const records = this.config.production.records;

        for (const record of records) {
          console.log(`Verifying ${record.type} record for ${record.name === '@' ? domain : record.name + '.' + domain}`);

          try {
            const lookupCommand = record.type === 'A'
              ? `nslookup ${domain}`
              : `nslookup ${record.name}.${domain}`;

            execSync(lookupCommand, { stdio: 'pipe' });
            console.log(`  ✅ ${record.type} record verified`);
          } catch (err) {
            console.log(`  ⚠️  ${record.type} record not yet propagated`);
          }
        }
      }

      console.log('✅ DNS verification completed');
    } catch (error) {
      console.error('❌ DNS verification failed:', error.message);
      throw error;
    }
  }

  updateEnvironmentVariables(vars) {
    const envFile = path.join(__dirname, '../../.env.production');
    let envContent = '';

    if (fs.existsSync(envFile)) {
      envContent = fs.readFileSync(envFile, 'utf8');
    }

    Object.entries(vars).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const newLine = `${key}=${value}`;

      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, newLine);
      } else {
        envContent += `\n${newLine}`;
      }
    });

    fs.writeFileSync(envFile, envContent.trim() + '\n');
    console.log(`Updated environment variables: ${Object.keys(vars).join(', ')}`);
  }

  async generateDNSInstructions() {
    console.log('📋 Generating DNS setup instructions...');

    const envConfig = this.config[this.environment];
    if (!envConfig.records) return;

    const instructions = {
      title: `DNS Configuration Instructions for ${envConfig.domain}`,
      timestamp: new Date().toISOString(),
      records: envConfig.records.map(record => ({
        type: record.type,
        name: record.name,
        value: record.value,
        ttl: record.ttl,
        comment: record.comment
      })),
      verification: {
        commands: [
          `nslookup ${envConfig.domain}`,
          `dig ${envConfig.domain} A`,
          `curl -I https://${envConfig.domain}`
        ]
      }
    };

    const instructionsPath = path.join(__dirname, '../../docs/deployment/dns-instructions.json');
    fs.writeFileSync(instructionsPath, JSON.stringify(instructions, null, 2));

    console.log(`✅ DNS instructions saved to: ${instructionsPath}`);
  }

  async run() {
    console.log(`🚀 Starting domain setup for ${this.environment} environment...`);

    try {
      await this.generateDNSInstructions();

      if (this.environment === 'production') {
        // Only run Vercel commands in production
        console.log('⚠️  Note: Vercel CLI commands require manual execution with authentication');
        console.log('   Run: vercel login && vercel link');
      }

      await this.setupSSL();
      await this.verifyDNS();

      console.log('🎉 Domain setup completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Configure your DNS provider with the records in dns-instructions.json');
      console.log('2. Wait for DNS propagation (up to 48 hours)');
      console.log('3. Deploy to Vercel with: vercel --prod');
      console.log('4. Verify SSL certificates are active');

    } catch (error) {
      console.error('💥 Domain setup failed:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new DomainSetup();
  setup.run();
}

module.exports = DomainSetup;