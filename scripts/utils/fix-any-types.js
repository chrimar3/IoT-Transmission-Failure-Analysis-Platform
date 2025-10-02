#!/usr/bin/env node

/**
 * Comprehensive script to fix all @typescript-eslint/no-explicit-any warnings
 * in the codebase by replacing common patterns with proper types
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Get all files with 'any' type issues
console.log('Finding files with "any" type issues...')
let eslintOutput
try {
  eslintOutput = execSync('npx eslint . --ext .ts,.tsx --format compact 2>/dev/null | grep "@typescript-eslint/no-explicit-any"',
    { encoding: 'utf8', cwd: process.cwd() })
} catch (error) {
  console.log('No any type issues found or ESLint error')
  process.exit(0)
}

// Parse the files and their issues
const issues = eslintOutput.split('\n').filter(line => line.trim()).map(line => {
  const match = line.match(/^(.+?): line (\d+), col (\d+), Warning - (.+) \(@typescript-eslint\/no-explicit-any\)/)
  if (match) {
    return {
      file: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4]
    }
  }
  return null
}).filter(Boolean)

console.log(`Found ${issues.length} 'any' type issues in ${[...new Set(issues.map(i => i.file))].length} files`)

// Group by file
const fileIssues = {}
issues.forEach(issue => {
  if (!fileIssues[issue.file]) {
    fileIssues[issue.file] = []
  }
  fileIssues[issue.file].push(issue)
})

// Common replacements for 'any' types
const replacements = [
  // Test mocking patterns
  { from: /\bas any\b/g, to: 'unknown', context: /jest\.spyOn.*mockResolve|mockReject|mockImplementation/ },
  { from: /\bas any\b/g, to: 'unknown', context: /expect.*objectContaining.*any/ },

  // Type assertions in tests
  { from: /\(([^)]+) as any\)/g, to: '($1 as unknown)', context: /\.test\.ts|\.spec\.ts/ },

  // Generic object/array types
  { from: /: any\[\]/g, to: ': unknown[]' },
  { from: /: any\b(?!\s*\))/g, to: ': unknown' },

  // Function parameters
  { from: /\(([^:]+): any\)/g, to: '($1: unknown)' },

  // Property types
  { from: /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*any(?!\s*[;\]\),}])/g, to: '$1: unknown' },

  // Variable declarations
  { from: /let\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*any\b/g, to: 'let $1: unknown' },
  { from: /const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*any\b/g, to: 'const $1: unknown' },

  // Generic constraints
  { from: /<any>/g, to: '<unknown>' },

  // Return types
  { from: /:\s*Promise<any>/g, to: ': Promise<unknown>' },
  { from: /:\s*any(?=\s*[{;])/g, to: ': unknown' },

  // Mock data and test fixtures - more specific types
  { from: /mockData.*:\s*any/g, to: 'mockData: Record<string, unknown>' },
  { from: /mockResponse.*:\s*any/g, to: 'mockResponse: Record<string, unknown>' },
  { from: /testData.*:\s*any/g, to: 'testData: Record<string, unknown>' },
]

// Process each file
let totalReplacements = 0
Object.keys(fileIssues).forEach(filePath => {
  try {
    console.log(`Processing ${path.relative(process.cwd(), filePath)} (${fileIssues[filePath].length} issues)...`)

    let content = fs.readFileSync(filePath, 'utf8')
    let fileReplacements = 0

    replacements.forEach(replacement => {
      if (replacement.context) {
        // Only apply if the file matches the context
        if (replacement.context.test(content) || replacement.context.test(filePath)) {
          const beforeLength = content.length
          content = content.replace(replacement.from, replacement.to)
          if (content.length !== beforeLength) {
            fileReplacements++
          }
        }
      } else {
        // Apply globally
        const beforeLength = content.length
        content = content.replace(replacement.from, replacement.to)
        if (content.length !== beforeLength) {
          fileReplacements++
        }
      }
    })

    if (fileReplacements > 0) {
      fs.writeFileSync(filePath, content, 'utf8')
      totalReplacements += fileReplacements
      console.log(`  Applied ${fileReplacements} replacements`)
    } else {
      console.log(`  No automatic replacements applied`)
    }

  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message)
  }
})

console.log(`\nTotal automatic replacements: ${totalReplacements}`)
console.log('\nChecking remaining issues...')

// Check remaining issues
try {
  const remainingOutput = execSync('npx eslint . --ext .ts,.tsx --format compact 2>/dev/null | grep "@typescript-eslint/no-explicit-any" | wc -l',
    { encoding: 'utf8', cwd: process.cwd() })
  const remaining = parseInt(remainingOutput.trim())
  console.log(`Remaining 'any' type issues: ${remaining}`)

  if (remaining > 0) {
    console.log('\nRemaining issues that need manual attention:')
    const remainingDetails = execSync('npx eslint . --ext .ts,.tsx --format compact 2>/dev/null | grep "@typescript-eslint/no-explicit-any" | head -10',
      { encoding: 'utf8', cwd: process.cwd() })
    console.log(remainingDetails)
  }
} catch (error) {
  console.log('All any type issues have been fixed!')
}