module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/tests/jest-dom-setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^fs$': '<rootDir>/tests/__mocks__/fs.js',
    '^exceljs$': '<rootDir>/tests/__mocks__/exceljs.js',
    '^pdf-lib$': '<rootDir>/tests/__mocks__/pdf-lib.js',
  },
  testMatch: [
    '<rootDir>/tests/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}'
  ],
  collectCoverageFrom: [
    '<rootDir>/app/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/components/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/lib/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/hooks/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/__tests__/**',
    '!**/*.test.*',
    '!**/*.spec.*'
  ],
  testTimeout: 30000,
  maxWorkers: 4,
  transformIgnorePatterns: [
    'node_modules/(?!(@faker-js/faker|@faker-js|uuid|exceljs))'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
    '^.+\\.(js|jsx)$': ['babel-jest'],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  projects: [
    {
      displayName: 'api',
      testMatch: ['<rootDir>/tests/api/**/*.test.{js,jsx,ts,tsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/tests/jest-dom-setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@/lib/(.*)$': '<rootDir>/lib/$1',
        '^@/app/(.*)$': '<rootDir>/app/$1',
        '^@/components/(.*)$': '<rootDir>/components/$1',
        '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
        '^@/types/(.*)$': '<rootDir>/types/$1',
        '^fs$': '<rootDir>/tests/__mocks__/fs.js',
        '^exceljs$': '<rootDir>/tests/__mocks__/exceljs.js',
        '^pdf-lib$': '<rootDir>/tests/__mocks__/pdf-lib.js',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            module: 'commonjs',
          },
        }],
      },
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.{js,jsx,ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/tests/jest-dom-setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@/lib/(.*)$': '<rootDir>/lib/$1',
        '^@/app/(.*)$': '<rootDir>/app/$1',
        '^@/components/(.*)$': '<rootDir>/components/$1',
        '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
        '^@/types/(.*)$': '<rootDir>/types/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^fs$': '<rootDir>/tests/__mocks__/fs.js',
        '^exceljs$': '<rootDir>/tests/__mocks__/exceljs.js',
        '^pdf-lib$': '<rootDir>/tests/__mocks__/pdf-lib.js',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
          },
        }],
        '^.+\\.(js|jsx)$': ['babel-jest'],
      },
      transformIgnorePatterns: [
        'node_modules/(?!(@faker-js/faker|@faker-js|uuid|exceljs))'
      ],
    },
    {
      displayName: 'security',
      testMatch: ['<rootDir>/tests/security/**/*.test.{js,jsx,ts,tsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@/lib/(.*)$': '<rootDir>/lib/$1',
        '^@/app/(.*)$': '<rootDir>/app/$1',
        '^@/components/(.*)$': '<rootDir>/components/$1',
        '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
        '^@/types/(.*)$': '<rootDir>/types/$1',
        '^fs$': '<rootDir>/tests/__mocks__/fs.js',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            module: 'commonjs',
          },
        }],
      },
      transformIgnorePatterns: [
        'node_modules/(?!(@faker-js/faker|@faker-js|uuid|exceljs))'
      ],
    },
    {
      displayName: 'components',
      testMatch: ['<rootDir>/tests/**/!(api|integration|security)/*.test.{js,jsx,ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/tests/jest-dom-setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@/lib/(.*)$': '<rootDir>/lib/$1',
        '^@/app/(.*)$': '<rootDir>/app/$1',
        '^@/components/(.*)$': '<rootDir>/components/$1',
        '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
        '^@/types/(.*)$': '<rootDir>/types/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^fs$': '<rootDir>/tests/__mocks__/fs.js',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
          },
        }],
        '^.+\\.(js|jsx)$': ['babel-jest'],
      },
    }
  ]
}