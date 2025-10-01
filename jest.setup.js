// Jest setup for both jsdom and node environments
const { TextEncoder, TextDecoder } = require('util')

// Import testing library setup
require('@testing-library/jest-dom')

// Mock @faker-js/faker to handle ES module issues
jest.mock('@faker-js/faker', () => ({
  faker: {
    datatype: {
      number: jest.fn(() => Math.floor(Math.random() * 1000)),
      boolean: jest.fn(() => Math.random() > 0.5),
      uuid: jest.fn(() => 'test-uuid-123'),
    },
    date: {
      recent: jest.fn(() => new Date()),
      between: jest.fn(() => new Date()),
    },
    lorem: {
      sentence: jest.fn(() => 'Test sentence'),
      word: jest.fn(() => 'test'),
    },
    internet: {
      email: jest.fn(() => 'test@example.com'),
      url: jest.fn(() => 'https://example.com'),
    },
  },
}))

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.STRIPE_SECRET_KEY = 'sk_test_1234567890abcdef'

// Polyfills for all environments
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Add Web API polyfills for jsdom environment
if (typeof global.Request === 'undefined') {
  // Simple Request polyfill for testing
  global.Request = class MockRequest {
    constructor(url, options = {}) {
      Object.defineProperty(this, 'url', { value: url, writable: false })
      this.method = options.method || 'GET'
      this.headers = new Headers(options.headers || {})
      this._body = options.body
    }
    
    async json() { return JSON.parse(this._body || '{}') }
    async text() { return this._body || '' }
  }
  
  global.Response = class MockResponse {
    constructor(body, options = {}) {
      this.body = body
      this.status = options.status || 200
      this.headers = new Headers(options.headers || {})
    }
    
    static json(data, options = {}) {
      return new MockResponse(JSON.stringify(data), options)
    }
    
    async json() { return JSON.parse(this.body || '{}') }
    async text() { return this.body || '' }
  }
  
  global.Headers = class MockHeaders {
    constructor(init) {
      this._headers = new Map()
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value))
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => this.set(key, value))
        }
      }
    }
    get(key) { return this._headers.get(key.toLowerCase()) }
    set(key, value) { this._headers.set(key.toLowerCase(), value); return this }
    has(key) { return this._headers.has(key.toLowerCase()) }
    delete(key) { return this._headers.delete(key.toLowerCase()) }
    entries() { return this._headers.entries() }
    keys() { return this._headers.keys() }  
    values() { return this._headers.values() }
    forEach(callback) { this._headers.forEach(callback) }
    [Symbol.iterator]() { return this._headers[Symbol.iterator]() }
  }
}

// Mock fetch for both API and performance tests - compatible with Supabase
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    headers: new Map([['content-type', 'application/json']]),
    json: () => Promise.resolve([
      { sensor_id: 'SENSOR_001', health_status: 'healthy', power_consumption: 2.5 },
      { sensor_id: 'SENSOR_002', health_status: 'healthy', power_consumption: 1.8 },
      { sensor_id: 'SENSOR_003', health_status: 'healthy', power_consumption: 3.2 }
    ]),
    text: () => Promise.resolve(JSON.stringify([
      { sensor_id: 'SENSOR_001', health_status: 'healthy', power_consumption: 2.5 },
      { sensor_id: 'SENSOR_002', health_status: 'healthy', power_consumption: 1.8 },
      { sensor_id: 'SENSOR_003', health_status: 'healthy', power_consumption: 3.2 }
    ])),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    body: null,
    bodyUsed: false,
    clone: jest.fn()
  })
)

// Mock Next.js server components for API routes
if (typeof window === 'undefined') {
  // Mock NextRequest specifically for Next.js API testing
  jest.mock('next/server', () => ({
    NextRequest: jest.fn().mockImplementation((url, options = {}) => {
      const request = {
        url,
        method: options.method || 'GET',
        headers: new Map(Object.entries(options.headers || {})),
        nextUrl: new URL(url),
        _body: options.body,
        json: jest.fn().mockImplementation(async () => {
          if (request._body) {
            return typeof request._body === 'string' ? JSON.parse(request._body) : request._body
          }
          return {}
        }),
        text: jest.fn().mockImplementation(async () => {
          if (request._body) {
            return typeof request._body === 'string' ? request._body : JSON.stringify(request._body)
          }
          return ''
        }),
        formData: jest.fn().mockResolvedValue(new FormData()),
      }
      return request
    }),
    NextResponse: {
      json: jest.fn().mockImplementation((data, options = {}) => ({
        status: options.status || 200,
        headers: new Map(),
        json: jest.fn().mockResolvedValue(data)
      }))
    }
  }))

  // Basic Request/Response polyfills for Node.js environment
  const MockRequest = class {
    constructor(url, options = {}) {
      Object.defineProperty(this, 'url', { value: url, writable: false })
      this.method = options.method || 'GET'
      this.headers = new Map(Object.entries(options.headers || {}))
      this._body = options.body
    }
    
    async json() {
      return JSON.parse(this._body || '{}')
    }
  }

  const MockResponse = class {
    constructor() {
      this.status = 200
      this.headers = new Map()
      this._body = null
    }

    static json(data, options = {}) {
      const response = new MockResponse()
      response.status = options.status || 200
      response._body = JSON.stringify(data)
      return response
    }

    async json() {
      return JSON.parse(this._body || '{}')
    }
  }

  if (!global.Request) global.Request = MockRequest
  if (!global.Response) global.Response = MockResponse
}

// Mock ResizeObserver for component tests
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Global console setup - reduce verbosity for tests
global.console = {
  ...console,
  debug: jest.fn(),
  // Keep important logging
  log: console.log,
  warn: console.warn,
  error: console.error,
}