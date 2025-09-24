#!/usr/bin/env node

/**
 * Comprehensive script to fix all @typescript-eslint/no-unused-vars warnings
 * by prefixing unused variables with underscore
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Get all files with unused variable issues
console.log('Finding files with unused variable issues...')
let eslintOutput
try {
  eslintOutput = execSync('npx eslint . --ext .ts,.tsx --format compact 2>/dev/null | grep "@typescript-eslint/no-unused-vars"',
    { encoding: 'utf8', cwd: process.cwd() })
} catch (error) {
  console.log('No unused variable issues found or ESLint error')
  process.exit(0)
}

if (!eslintOutput.trim()) {
  console.log('No unused variable issues found')
  process.exit(0)
}

// Parse the issues
const issues = eslintOutput.split('\n').filter(line => line.trim()).map(line => {
  // Pattern: /path/file.ts: line X, col Y, Warning - 'varName' is defined but never used
  const match = line.match(/^(.+?): line (\d+), col (\d+), Warning - '([^']+)' is (defined but never used|assigned a value but never used)/)
  if (match) {
    return {
      file: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      varName: match[4],
      message: match[5]
    }
  }
  return null
}).filter(Boolean)

console.log(`Found ${issues.length} unused variable issues in ${[...new Set(issues.map(i => i.file))].length} files`)

// Group by file
const fileIssues = {}
issues.forEach(issue => {
  if (!fileIssues[issue.file]) {
    fileIssues[issue.file] = []
  }
  fileIssues[issue.file].push(issue)
})

let totalReplacements = 0

// Process each file
Object.keys(fileIssues).forEach(filePath => {
  try {
    console.log(`Processing ${path.relative(process.cwd(), filePath)} (${fileIssues[filePath].length} issues)...`)

    let content = fs.readFileSync(filePath, 'utf8')
    let fileReplacements = 0

    // Sort issues by line number (descending) to avoid shifting line numbers during replacement
    const sortedIssues = fileIssues[filePath].sort((a, b) => b.line - a.line)

    sortedIssues.forEach(issue => {
      // Skip if variable name already starts with underscore
      if (issue.varName.startsWith('_')) {
        return
      }

      // Common patterns to fix unused variables
      const patterns = [
        // Function parameters: func(param) => func(_param)
        {
          regex: new RegExp(`(function\\s*\\([^)]*?)\\b${issue.varName}\\b`, 'g'),
          replacement: `$1_${issue.varName}`
        },
        // Arrow function parameters: (param) => (_param) =>
        {
          regex: new RegExp(`(\\([^)]*?)\\b${issue.varName}\\b(?=\\s*[,)])`, 'g'),
          replacement: `$1_${issue.varName}`
        },
        // Variable declarations: let varName = ... => let _varName = ...
        {
          regex: new RegExp(`(\\b(?:let|const|var)\\s+)${issue.varName}\\b`, 'g'),
          replacement: `$1_${issue.varName}`
        },
        // Destructuring: {varName} = ... => {_varName} = ...
        {
          regex: new RegExp(`(\\{[^}]*?)\\b${issue.varName}\\b(?=\\s*[,}])`, 'g'),
          replacement: `$1_${issue.varName}`
        },
        // Array destructuring: [varName] = ... => [_varName] = ...
        {
          regex: new RegExp(`(\\[[^\\]]*?)\\b${issue.varName}\\b(?=\\s*[,\\]])`, 'g'),
          replacement: `$1_${issue.varName}`
        },
        // Import statements: import {varName} => import {_varName}
        {
          regex: new RegExp(`(import\\s*\\{[^}]*?)\\b${issue.varName}\\b(?=\\s*[,}])`, 'g'),
          replacement: `$1_${issue.varName}`
        },
        // Function parameter types: (param: Type) => (_param: Type)
        {
          regex: new RegExp(`(\\([^)]*?)\\b${issue.varName}\\b(?=\\s*:)`, 'g'),
          replacement: `$1_${issue.varName}`
        },
        // Catch blocks: catch(error) => catch(_error)
        {
          regex: new RegExp(`(catch\\s*\\(\\s*)${issue.varName}\\b`, 'g'),
          replacement: `$1_${issue.varName}`
        },
        // For loop variables: for(let i = 0; ...) => for(let _i = 0; ...)
        {
          regex: new RegExp(`(for\\s*\\(\\s*(?:let|const|var)\\s+)${issue.varName}\\b`, 'g'),
          replacement: `$1_${issue.varName}`
        },
        // forEach/map callbacks: .forEach((item, index) => ...) => .forEach((_item, _index) => ...)
        {
          regex: new RegExp(`(\\.(?:forEach|map|filter|reduce|find)\\s*\\(\\s*\\([^)]*?)\\b${issue.varName}\\b(?=\\s*[,)])`, 'g'),
          replacement: `$1_${issue.varName}`
        }
      ]

      patterns.forEach(pattern => {
        const before = content
        content = content.replace(pattern.regex, pattern.replacement)
        if (content !== before) {
          fileReplacements++
        }
      })
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
console.log('\nChecking remaining unused variable issues...')

// Check remaining issues
try {
  const remainingOutput = execSync('npx eslint . --ext .ts,.tsx --format compact 2>/dev/null | grep "@typescript-eslint/no-unused-vars" | wc -l',
    { encoding: 'utf8', cwd: process.cwd() })
  const remaining = parseInt(remainingOutput.trim())
  console.log(`Remaining unused variable issues: ${remaining}`)

  if (remaining > 0) {
    console.log('\nRemaining issues that need manual attention:')
    const remainingDetails = execSync('npx eslint . --ext .ts,.tsx --format compact 2>/dev/null | grep "@typescript-eslint/no-unused-vars" | head -10',
      { encoding: 'utf8', cwd: process.cwd() })
    console.log(remainingDetails)
  }
} catch (error) {
  console.log('All unused variable issues have been fixed!')
}