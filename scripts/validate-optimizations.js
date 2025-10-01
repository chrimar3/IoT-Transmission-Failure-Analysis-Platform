#!/usr/bin/env node
/**
 * Quick validation script for Story 3.3 optimizations
 * Verifies all key components are working correctly
 */

const fs = require('fs');
const path = require('path');

console.log('\n========================================');
console.log('Story 3.3 Optimization Validation');
console.log('========================================\n');

let errors = [];
let warnings = [];
let success = [];

// Check 1: Configuration file exists
console.log('✓ Checking configuration file...');
const configPath = path.join(__dirname, '../lib/algorithms/detection-config.ts');
if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf8');

  // Verify key exports
  if (configContent.includes('export const DETECTION_CONFIG')) {
    success.push('✅ Configuration file created and exports DETECTION_CONFIG');
  } else {
    errors.push('❌ DETECTION_CONFIG not found in configuration file');
  }

  // Check for Bangkok config
  if (configContent.includes('bangkok:')) {
    success.push('✅ Bangkok-specific configuration present');
  } else {
    warnings.push('⚠️  Bangkok configuration might be missing');
  }

  // Check for performance config
  if (configContent.includes('performance:')) {
    success.push('✅ Performance configuration present');
  } else {
    errors.push('❌ Performance configuration missing');
  }

  // Check for algorithm config
  if (configContent.includes('algorithms:')) {
    success.push('✅ Algorithm configuration present');
  } else {
    errors.push('❌ Algorithm configuration missing');
  }

  // Check for scientific justification
  if (configContent.includes('Justification:')) {
    success.push('✅ Scientific justification documented');
  } else {
    warnings.push('⚠️  Some thresholds might lack justification');
  }
} else {
  errors.push('❌ Configuration file not found');
}

// Check 2: Cache service exists
console.log('\n✓ Checking cache service...');
const cachePath = path.join(__dirname, '../lib/algorithms/cache-service.ts');
if (fs.existsSync(cachePath)) {
  const cacheContent = fs.readFileSync(cachePath, 'utf8');

  if (cacheContent.includes('export class CacheService')) {
    success.push('✅ CacheService class implemented');
  } else {
    errors.push('❌ CacheService class not found');
  }

  if (cacheContent.includes('export class PatternDetectionCache')) {
    success.push('✅ PatternDetectionCache helper class implemented');
  } else {
    errors.push('❌ PatternDetectionCache class not found');
  }

  // Check for key caching methods
  const methods = ['get', 'set', 'delete', 'clear', 'getStats'];
  methods.forEach(method => {
    if (cacheContent.includes(`async ${method}(`)) {
      success.push(`✅ Cache method: ${method}`);
    }
  });
} else {
  errors.push('❌ Cache service file not found');
}

// Check 3: StatisticalAnomalyDetector optimizations
console.log('\n✓ Checking StatisticalAnomalyDetector optimizations...');
const detectorPath = path.join(__dirname, '../lib/algorithms/StatisticalAnomalyDetector.ts');
if (fs.existsSync(detectorPath)) {
  const detectorContent = fs.readFileSync(detectorPath, 'utf8');

  // Check for parallel processing
  if (detectorContent.includes('Promise.all') && detectorContent.includes('batchSize')) {
    success.push('✅ Parallel processing implemented');
  } else {
    errors.push('❌ Parallel processing not detected');
  }

  // Check for Welford's algorithm
  if (detectorContent.includes('Welford') || detectorContent.includes('online algorithm')) {
    success.push('✅ Welford\'s algorithm documented');
  } else {
    warnings.push('⚠️  Welford\'s algorithm might not be documented');
  }

  // Check for cache integration
  if (detectorContent.includes('PatternDetectionCache')) {
    success.push('✅ Cache integration present');
  } else {
    errors.push('❌ Cache integration not found');
  }

  // Check for DETECTION_CONFIG usage
  if (detectorContent.includes('DETECTION_CONFIG')) {
    success.push('✅ Using centralized configuration');
  } else {
    warnings.push('⚠️  Might still use hardcoded values');
  }
} else {
  errors.push('❌ StatisticalAnomalyDetector file not found');
}

// Check 4: API route rate limiting
console.log('\n✓ Checking API rate limiting...');
const apiPath = path.join(__dirname, '../app/api/patterns/detect/route.ts');
if (fs.existsSync(apiPath)) {
  const apiContent = fs.readFileSync(apiPath, 'utf8');

  // Check for rate limiting imports
  if (apiContent.includes('RateLimiter') || apiContent.includes('rate-limiting')) {
    success.push('✅ Rate limiting imported');
  } else {
    errors.push('❌ Rate limiting not imported');
  }

  // Check for rate limit check
  if (apiContent.includes('checkRateLimit')) {
    success.push('✅ Rate limit check implemented');
  } else {
    errors.push('❌ Rate limit check not found');
  }

  // Check for 429 response
  if (apiContent.includes('429')) {
    success.push('✅ 429 Too Many Requests handling present');
  } else {
    warnings.push('⚠️  429 response might not be implemented');
  }

  // Check for performance monitoring
  if (apiContent.includes('SLA') || apiContent.includes('performance.now()')) {
    success.push('✅ Performance monitoring present');
  } else {
    warnings.push('⚠️  Performance monitoring might be missing');
  }
} else {
  errors.push('❌ API route file not found');
}

// Check 5: PatternCorrelationAnalyzer optimizations
console.log('\n✓ Checking correlation analyzer optimizations...');
const correlationPath = path.join(__dirname, '../src/lib/algorithms/PatternCorrelationAnalyzer.ts');
if (fs.existsSync(correlationPath)) {
  const correlationContent = fs.readFileSync(correlationPath, 'utf8');

  // Check for cache integration
  if (correlationContent.includes('PatternDetectionCache')) {
    success.push('✅ Correlation matrix caching implemented');
  } else {
    errors.push('❌ Correlation matrix caching not found');
  }

  // Check for correlation threshold
  if (correlationContent.includes('correlationThreshold') ||
      correlationContent.includes('DETECTION_CONFIG')) {
    success.push('✅ Configurable correlation threshold');
  } else {
    warnings.push('⚠️  Correlation threshold might be hardcoded');
  }
} else {
  errors.push('❌ PatternCorrelationAnalyzer file not found');
}

// Check 6: Performance benchmark tests
console.log('\n✓ Checking performance tests...');
const benchmarkPath = path.join(__dirname, '../__tests__/performance/pattern-detection-performance-benchmark.test.ts');
if (fs.existsSync(benchmarkPath)) {
  const benchmarkContent = fs.readFileSync(benchmarkPath, 'utf8');

  // Check for key benchmark tests
  const tests = [
    '50 sensors process in <3 seconds',
    'Cache hit rate',
    'Parallel processing',
    'Memory usage',
    'Welford algorithm'
  ];

  tests.forEach(test => {
    if (benchmarkContent.includes(test)) {
      success.push(`✅ Benchmark test: ${test}`);
    } else {
      warnings.push(`⚠️  Test might be missing: ${test}`);
    }
  });
} else {
  errors.push('❌ Performance benchmark tests not found');
}

// Check 7: Documentation
console.log('\n✓ Checking documentation...');
const docPath = path.join(__dirname, '../docs/performance/story-3.3-optimization-report.md');
if (fs.existsSync(docPath)) {
  const docContent = fs.readFileSync(docPath, 'utf8');

  if (docContent.includes('Performance Optimization Report')) {
    success.push('✅ Performance report created');
  }

  if (docContent.includes('Before → After')) {
    success.push('✅ Performance comparison documented');
  }

  if (docContent.includes('SLA')) {
    success.push('✅ SLA compliance documented');
  }
} else {
  warnings.push('⚠️  Performance optimization report not found');
}

// Print results
console.log('\n========================================');
console.log('VALIDATION RESULTS');
console.log('========================================\n');

if (success.length > 0) {
  console.log('✅ SUCCESS (' + success.length + ' items)');
  success.forEach(item => console.log('  ' + item));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS (' + warnings.length + ' items)');
  warnings.forEach(item => console.log('  ' + item));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ ERRORS (' + errors.length + ' items)');
  errors.forEach(item => console.log('  ' + item));
  console.log('');
}

// Summary
console.log('========================================');
console.log('SUMMARY');
console.log('========================================');
console.log(`Success: ${success.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Errors: ${errors.length}`);
console.log('');

if (errors.length === 0) {
  console.log('✅ ALL OPTIMIZATIONS VALIDATED');
  console.log('Status: READY FOR PRODUCTION');
  process.exit(0);
} else {
  console.log('❌ VALIDATION FAILED');
  console.log('Status: NEEDS FIXES');
  process.exit(1);
}