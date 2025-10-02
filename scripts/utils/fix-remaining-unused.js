#!/usr/bin/env node

/**
 * Manual fixes for remaining 22 unused variable issues
 */

const fs = require('fs')

// Fix remaining unused variables manually
const manualFixes = [
  {
    file: '__tests__/utils/test-helpers.ts',
    line: 64,
    find: 'body) => {',
    replace: '_body) => {'
  },
  {
    file: 'lib/alerts/AlertRuleEngine.ts',
    line: 551,
    find: 'getContributingFactors(condition: AlertCondition,',
    replace: 'getContributingFactors(_condition: AlertCondition,'
  },
  {
    file: 'lib/alerts/NotificationDeliveryService.ts',
    line: 646,
    find: '    htmlBody,',
    replace: '    _htmlBody,'
  },
  {
    file: 'lib/alerts/NotificationDeliveryService.ts',
    line: 647,
    find: '    config',
    replace: '    _config'
  },
  {
    file: 'lib/alerts/NotificationDeliveryService.ts',
    line: 664,
    find: 'sendSMSNotification(alert: AlertInstance, config:',
    replace: 'sendSMSNotification(alert: AlertInstance, _config:'
  },
  {
    file: 'lib/alerts/NotificationDeliveryService.ts',
    line: 719,
    find: '    config',
    replace: '    _config'
  },
  {
    file: 'lib/alerts/NotificationDeliveryService.ts',
    line: 737,
    find: '    config',
    replace: '    _config'
  },
  {
    file: 'lib/alerts/NotificationDeliveryService.ts',
    line: 755,
    find: '    config',
    replace: '    _config'
  },
  {
    file: 'lib/alerts/NotificationDeliveryService.ts',
    line: 772,
    find: '    config',
    replace: '    _config'
  },
  {
    file: 'lib/export/csvExporter.ts',
    line: 179,
    find: 'updateProgress(jobId: string,',
    replace: 'updateProgress(_jobId: string,'
  }
]

let totalFixed = 0

manualFixes.forEach(fix => {
  const filePath = `/Users/chrism/CU-BEMS IoT Transmission Failure Analysis Platform/${fix.file}`
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8')
      if (content.includes(fix.find)) {
        content = content.replace(fix.find, fix.replace)
        fs.writeFileSync(filePath, content, 'utf8')
        totalFixed++
        console.log(`Fixed ${fix.file}`)
      }
    }
  } catch (error) {
    console.log(`Error fixing ${fix.file}: ${error.message}`)
  }
})

console.log(`Fixed ${totalFixed} remaining unused variable issues`)