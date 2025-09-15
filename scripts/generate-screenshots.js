#!/usr/bin/env node

/**
 * Screenshot Generation Script
 * Automatically generates screenshots for README documentation
 *
 * Prerequisites:
 * - Application running on localhost:3000
 * - Puppeteer installed: npm install puppeteer
 *
 * Usage:
 * node scripts/generate-screenshots.js
 */

const fs = require('fs');
const path = require('path');

async function generateScreenshots() {
    console.log('🚀 Starting screenshot generation...');

    // Check if puppeteer is available
    let puppeteer;
    try {
        puppeteer = require('puppeteer');
    } catch (error) {
        console.log('📦 Installing Puppeteer...');
        const { execSync } = require('child_process');
        try {
            execSync('npm install puppeteer', { stdio: 'inherit' });
            puppeteer = require('puppeteer');
            console.log('✅ Puppeteer installed successfully');
        } catch (installError) {
            console.error('❌ Failed to install Puppeteer:', installError.message);
            console.log('💡 Manual installation: npm install puppeteer');
            return;
        }
    }

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1920, height: 1080 });

    // Create screenshots directory
    const screenshotDir = path.join(__dirname, '..', 'docs', 'images', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const baseUrl = 'http://localhost:3000';

    const screenshots = [
        {
            url: `${baseUrl}`,
            filename: 'landing-page.png',
            description: 'Landing page overview'
        },
        {
            url: `${baseUrl}/dashboard`,
            filename: 'dashboard-overview.png',
            description: 'Main analytics dashboard'
        },
        {
            url: `${baseUrl}/api/insights`,
            filename: 'api-response.png',
            description: 'API insights response',
            isJson: true
        },
        {
            url: `${baseUrl}/api/health`,
            filename: 'health-endpoint.png',
            description: 'Health check endpoint',
            isJson: true
        }
    ];

    for (const screenshot of screenshots) {
        try {
            console.log(`📸 Capturing ${screenshot.description}...`);

            await page.goto(screenshot.url, { waitUntil: 'networkidle2' });

            // Special handling for JSON responses
            if (screenshot.isJson) {
                await page.addStyleTag({
                    content: `
                        body {
                            font-family: 'Courier New', monospace;
                            background: #1e1e1e;
                            color: #d4d4d4;
                            padding: 20px;
                            margin: 0;
                        }
                        pre {
                            background: #2d2d2d;
                            padding: 20px;
                            border-radius: 8px;
                            overflow-x: auto;
                        }
                    `
                });
            }

            // Wait a moment for any animations
            await new Promise(resolve => setTimeout(resolve, 1000));

            const screenshotPath = path.join(screenshotDir, screenshot.filename);
            await page.screenshot({
                path: screenshotPath,
                fullPage: screenshot.isJson ? false : true
            });

            console.log(`✅ Saved: ${screenshot.filename}`);
        } catch (error) {
            console.error(`❌ Failed to capture ${screenshot.description}:`, error.message);
            console.log(`💡 Make sure the application is running at ${baseUrl}`);
        }
    }

    // Generate mobile screenshots
    console.log('📱 Generating mobile screenshots...');
    await page.setViewport({ width: 375, height: 812 }); // iPhone 12 dimensions

    const mobileScreenshots = [
        {
            url: `${baseUrl}`,
            filename: 'mobile-landing.png',
            description: 'Mobile landing page'
        },
        {
            url: `${baseUrl}/dashboard`,
            filename: 'mobile-dashboard.png',
            description: 'Mobile dashboard view'
        }
    ];

    for (const screenshot of mobileScreenshots) {
        try {
            console.log(`📱 Capturing ${screenshot.description}...`);

            await page.goto(screenshot.url, { waitUntil: 'networkidle2' });
            await new Promise(resolve => setTimeout(resolve, 1000));

            const screenshotPath = path.join(screenshotDir, screenshot.filename);
            await page.screenshot({
                path: screenshotPath,
                fullPage: true
            });

            console.log(`✅ Saved: ${screenshot.filename}`);
        } catch (error) {
            console.error(`❌ Failed to capture ${screenshot.description}:`, error.message);
        }
    }

    await browser.close();

    // Update README with actual screenshot links
    console.log('📝 Updating README with screenshot links...');
    const readmePath = path.join(__dirname, '..', 'README.md');
    let readmeContent = fs.readFileSync(readmePath, 'utf8');

    // Replace placeholder comments with actual image links
    const updates = [
        {
            comment: '<!-- ![Dashboard Overview](docs/images/screenshots/dashboard-overview.png) -->',
            replacement: '![Dashboard Overview](docs/images/screenshots/dashboard-overview.png)'
        },
        {
            comment: '<!-- ![API Response](docs/images/screenshots/api-response.png) -->',
            replacement: '![API Response](docs/images/screenshots/api-response.png)'
        },
        {
            comment: '<!-- ![Mobile Dashboard](docs/images/screenshots/mobile-dashboard.png) -->',
            replacement: '![Mobile Dashboard](docs/images/screenshots/mobile-dashboard.png)'
        }
    ];

    updates.forEach(update => {
        readmeContent = readmeContent.replace(update.comment, update.replacement);
    });

    // Remove the "Coming Soon" placeholders
    readmeContent = readmeContent.replace(/\*\*Coming Soon\*\*: [^\n]+\n/g, '');

    fs.writeFileSync(readmePath, readmeContent);

    console.log('✅ README updated with screenshot links');
    console.log('🎉 Screenshot generation complete!');
    console.log(`📁 Screenshots saved to: ${screenshotDir}`);
    console.log('');
    console.log('🔗 Next steps:');
    console.log('1. Review generated screenshots');
    console.log('2. Optimize images if needed (TinyPNG, etc.)');
    console.log('3. Commit changes: git add . && git commit -m "Add screenshots"');
    console.log('4. Push to GitHub: git push');
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n⏹️  Screenshot generation cancelled');
    process.exit(0);
});

// Check if application is running
async function checkServerRunning() {
    try {
        const http = require('http');
        return new Promise((resolve) => {
            const req = http.get('http://localhost:3000', (res) => {
                resolve(true);
            });
            req.on('error', () => resolve(false));
            req.setTimeout(5000, () => {
                req.destroy();
                resolve(false);
            });
        });
    } catch (error) {
        return false;
    }
}

async function main() {
    console.log('🔍 Checking if application is running...');
    const isRunning = await checkServerRunning();

    if (!isRunning) {
        console.log('❌ Application is not running on http://localhost:3000');
        console.log('💡 Please start the application first:');
        console.log('   npm run dev');
        console.log('');
        console.log('   Then run this script again:');
        console.log('   node scripts/generate-screenshots.js');
        process.exit(1);
    }

    console.log('✅ Application is running');
    await generateScreenshots();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { generateScreenshots };