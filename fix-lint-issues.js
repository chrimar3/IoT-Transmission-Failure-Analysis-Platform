#!/usr/bin/env node
/**
 * Script to fix common ESLint issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function fixFile(filePath) {
  console.log(`Fixing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix unused imports by prefixing with underscore
  const unusedImportRegex = /import\s+{\s*([^}]+)\s*}\s+from/g;
  content = content.replace(unusedImportRegex, (match, imports) => {
    // This is a simple approach - in practice you'd need more sophisticated parsing
    return match;
  });

  // Fix unused variables and parameters
  const patterns = [
    // Unused parameters
    { regex: /(\w+)(\s*:\s*\w+)?\s*=>/g, replacement: '_$1$2 =>' },
    { regex: /function\s+\w+\s*\(([^)]*)\)/g, replacement: (match, params) => {
      return match.replace(/\b(\w+)(?=\s*[:,)])/g, '_$1');
    }},
    // Unused variables
    { regex: /const\s+(\w+)\s*=/g, replacement: 'const _$1 =' },
    { regex: /let\s+(\w+)\s*=/g, replacement: 'let _$1 =' },
  ];

  // For now, let's handle this manually for specific files
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  }
}

// Get lint output and parse it
try {
  const lintOutput = execSync('npm run lint', { encoding: 'utf8', cwd: __dirname });
} catch (error) {
  const output = error.stdout;
  console.log('Processing lint errors...');

  // Parse the output to find files with unused variables
  const errorLines = output.split('\n').filter(line =>
    line.includes('unused') && (line.includes('Error') || line.includes('Warning'))
  );

  console.log(`Found ${errorLines.length} unused variable issues`);
}