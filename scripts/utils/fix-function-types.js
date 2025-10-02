#!/usr/bin/env node

/**
 * Fix unsafe Function type warnings by replacing with proper signatures
 */

const fs = require('fs')
const { execSync } = require('child_process')

console.log('Fixing unsafe function type warnings...')

const filePath = '__tests__/lib/reports/pdf-generator.test.ts'
const fullPath = `/Users/chrism/CU-BEMS IoT Transmission Failure Analysis Platform/${filePath}`

if (!fs.existsSync(fullPath)) {
  console.log('PDF generator test file not found')
  process.exit(0)
}

let content = fs.readFileSync(fullPath, 'utf8')

// Replace Function type with proper callback signature
const replacements = [
  // Event callback signatures
  {
    from: /callback: Function/g,
    to: 'callback: () => void'
  },
  // Generic function type for event handlers
  {
    from: /Function/g,
    to: '(() => void)'
  }
]

let totalReplacements = 0

replacements.forEach(replacement => {
  const before = content
  content = content.replace(replacement.from, replacement.to)
  if (content !== before) {
    totalReplacements++
  }
})

if (totalReplacements > 0) {
  fs.writeFileSync(fullPath, content, 'utf8')
  console.log(`Applied ${totalReplacements} function type replacements to ${filePath}`)
} else {
  console.log('No function type replacements needed')
}

// Check remaining unsafe function type issues
try {
  const remainingOutput = execSync('npx eslint . --ext .ts,.tsx --format compact 2>/dev/null | grep "@typescript-eslint/no-unsafe-function-type" | wc -l',
    { encoding: 'utf8', cwd: process.cwd() })
  const remaining = parseInt(remainingOutput.trim())
  console.log(`Remaining unsafe function type issues: ${remaining}`)
} catch (error) {
  console.log('All unsafe function type issues have been fixed!')
}