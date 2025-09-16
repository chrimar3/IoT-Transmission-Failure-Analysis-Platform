const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: '../',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle module aliases to match new structure
    '^@/(.*)$': '<rootDir>/$1',
  },
  testEnvironment: 'jest-environment-jsdom', // Use jsdom for React components
  testMatch: [
    '<rootDir>/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '<rootDir>/app/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '<rootDir>/src/**/__tests__/**/*.(test|spec).(ts|tsx|js)'
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'src/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/layout.tsx',
    '!**/globals.css',
    '!**/__tests__/**',
    '!**/*.test.*',
    '!**/*.spec.*',
    '!__tests__/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testTimeout: 30000,
  maxWorkers: 4,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)