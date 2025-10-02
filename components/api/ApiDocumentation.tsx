/**
 * API Documentation Component
 * Interactive API documentation and developer portal
 */

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { _Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Copy, _ChevronDown, ChevronRight, Play, Book, Code, Zap } from 'lucide-react'

interface ApiDocumentationProps {
  className?: string
}

interface EndpointExample {
  method: string
  path: string
  description: string
  auth_required: boolean
  rate_limit_cost: number
  scopes: string[]
  parameters: Array<{
    name: string
    type: string
    required: boolean
    description: string
    example?: unknown
  }>
  response_example: unknown
  curl_example: string
}

export function ApiDocumentation({ className }: ApiDocumentationProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('timeseries')
  const [apiKey, setApiKey] = useState('')
  const [testParameters, setTestParameters] = useState<Record<string, string>>({})

  const endpoints: Record<string, EndpointExample> = {
    timeseries: {
      method: 'GET',
      path: '/api/v1/data/timeseries',
      description: 'Retrieve time-series sensor data with filtering and export options',
      auth_required: true,
      rate_limit_cost: 1,
      scopes: ['read:data'],
      parameters: [
        {
          name: 'start_date',
          type: 'string (ISO 8601)',
          required: false,
          description: 'Start date for data range',
          example: '2024-01-01T00:00:00Z'
        },
        {
          name: 'end_date',
          type: 'string (ISO 8601)',
          required: false,
          description: 'End date for data range',
          example: '2024-01-31T23:59:59Z'
        },
        {
          name: 'sensor_ids',
          type: 'string (comma-separated)',
          required: false,
          description: 'Specific sensor IDs to filter',
          example: 'SENSOR_001,SENSOR_002'
        },
        {
          name: 'floor_numbers',
          type: 'string (comma-separated)',
          required: false,
          description: 'Floor numbers to filter',
          example: '1,2,3'
        },
        {
          name: 'format',
          type: 'string',
          required: false,
          description: 'Export format (json, csv, excel)',
          example: 'json'
        },
        {
          name: 'limit',
          type: 'integer',
          required: false,
          description: 'Maximum number of records (1-10000)',
          example: 1000
        }
      ],
      response_example: {
        success: true,
        data: {
          timeseries: [
            {
              timestamp: '2024-01-01T00:00:00Z',
              sensor_id: 'SENSOR_001',
              floor_number: 1,
              equipment_type: 'HVAC',
              reading_value: 852.45,
              unit: 'kWh',
              status: 'normal'
            }
          ],
          pagination: {
            total_count: 50000,
            limit: 1000,
            offset: 0,
            has_more: true
          }
        },
        meta: {
          request_id: 'req_123456',
          timestamp: '2024-01-01T00:00:00Z',
          processing_time_ms: 245,
          rate_limit: {
            remaining: 9999,
            reset_at: '2024-01-01T01:00:00Z',
            limit: 10000
          }
        }
      },
      curl_example: `curl -X GET "https://api.cu-bems.com/api/v1/data/timeseries?start_date=2024-01-01T00:00:00Z&limit=100" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`
    },
    analytics: {
      method: 'GET',
      path: '/api/v1/data/analytics',
      description: 'Access advanced analytics with statistical validation and confidence intervals',
      auth_required: true,
      rate_limit_cost: 2,
      scopes: ['read:analytics'],
      parameters: [
        {
          name: 'period',
          type: 'string',
          required: false,
          description: 'Analytics period (hourly, daily, weekly, monthly)',
          example: 'daily'
        },
        {
          name: 'confidence_level',
          type: 'number',
          required: false,
          description: 'Statistical confidence level (0.8-0.99)',
          example: 0.95
        },
        {
          name: 'include_statistical_tests',
          type: 'boolean',
          required: false,
          description: 'Include statistical significance tests',
          example: true
        }
      ],
      response_example: {
        success: true,
        data: {
          analytics: [
            {
              period: '2024-01-01',
              floor_number: 1,
              equipment_type: 'HVAC',
              metrics: {
                average_consumption: 852.45,
                peak_consumption: 1205.67,
                efficiency_score: 87.3,
                anomaly_count: 2,
                uptime_percentage: 98.5
              },
              confidence_intervals: {
                consumption_ci_lower: 825.12,
                consumption_ci_upper: 879.78,
                confidence_level: 0.95
              },
              statistical_significance: {
                p_value: 0.023,
                test_statistic: 2.45,
                is_significant: true
              }
            }
          ]
        }
      },
      curl_example: `curl -X GET "https://api.cu-bems.com/api/v1/data/analytics?period=daily&confidence_level=0.95" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`
    },
    patterns: {
      method: 'GET',
      path: '/api/v1/data/patterns',
      description: 'Advanced pattern detection and anomaly analysis with statistical evidence',
      auth_required: true,
      rate_limit_cost: 3,
      scopes: ['read:analytics'],
      parameters: [
        {
          name: 'pattern_types',
          type: 'string (comma-separated)',
          required: false,
          description: 'Pattern types to detect (anomaly, efficiency, maintenance, usage)',
          example: 'anomaly,efficiency'
        },
        {
          name: 'min_confidence',
          type: 'number',
          required: false,
          description: 'Minimum confidence score (0.1-1.0)',
          example: 0.7
        },
        {
          name: 'severity_levels',
          type: 'string (comma-separated)',
          required: false,
          description: 'Severity levels to include (low, medium, high, critical)',
          example: 'high,critical'
        }
      ],
      response_example: {
        success: true,
        data: {
          patterns: [
            {
              pattern_id: 'anomaly_HVAC_abc123',
              pattern_type: 'anomaly',
              severity: 'high',
              confidence_score: 0.89,
              detected_at: '2024-01-01T12:30:00Z',
              affected_sensors: ['HVAC_1_A', 'HVAC_1_B'],
              floor_numbers: [1],
              equipment_types: ['HVAC'],
              description: 'HVAC system showing significant performance deviation',
              recommendations: [
                'Schedule urgent maintenance inspection within 24 hours',
                'Monitor system closely for further degradation'
              ],
              statistical_evidence: {
                z_score: 3.2,
                p_value: 0.001,
                sample_size: 288
              }
            }
          ]
        }
      },
      curl_example: `curl -X GET "https://api.cu-bems.com/api/v1/data/patterns?pattern_types=anomaly&min_confidence=0.8" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`
    },
    keys: {
      method: 'GET',
      path: '/api/v1/keys',
      description: 'Manage API keys for your account',
      auth_required: true,
      rate_limit_cost: 1,
      scopes: [],
      parameters: [],
      response_example: {
        success: true,
        data: {
          api_keys: [
            {
              id: 'key_123456',
              name: 'Production Dashboard',
              key_prefix: 'cb_abcd1234',
              scopes: ['read:data', 'read:analytics'],
              rate_limit_tier: 'professional',
              created_at: '2024-01-01T00:00:00Z',
              last_used_at: '2024-01-15T14:30:00Z',
              is_active: true,
              usage_stats: {
                total_requests: 15420,
                requests_this_month: 3847
              }
            }
          ]
        }
      },
      curl_example: `curl -X GET "https://api.cu-bems.com/api/v1/keys" \\
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \\
  -H "Content-Type: application/json"`
    },
    webhooks: {
      method: 'GET',
      path: '/api/v1/webhooks',
      description: 'Manage webhook endpoints for real-time event notifications',
      auth_required: true,
      rate_limit_cost: 1,
      scopes: ['write:webhooks'],
      parameters: [],
      response_example: {
        success: true,
        data: {
          webhooks: [
            {
              id: 'wh_123456',
              url: 'https://your-app.com/webhooks/cu-bems',
              events: ['data.updated', 'alert.triggered'],
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              delivery_stats: {
                total_deliveries: 245,
                successful_deliveries: 242,
                failed_deliveries: 3
              }
            }
          ]
        }
      },
      curl_example: `curl -X GET "https://api.cu-bems.com/api/v1/webhooks" \\
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \\
  -H "Content-Type: application/json"`
    }
  }

  const authenticationInfo = {
    api_key: {
      title: 'API Key Authentication',
      description: 'Use your API key in the Authorization header',
      example: 'Authorization: Bearer cb_your_api_key_here'
    },
    scopes: {
      'read:data': 'Access time-series and sensor data',
      'read:analytics': 'Access analytics and pattern data',
      'read:exports': 'Create and download data exports',
      'write:webhooks': 'Create and manage webhook endpoints'
    },
    rate_limits: {
      free: { requests_per_hour: 100, burst: 20 },
      professional: { requests_per_hour: 10000, burst: 500 }
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const buildTestUrl = (endpoint: EndpointExample): string => {
    const baseUrl = 'https://api.cu-bems.com' + endpoint.path
    const params = new URLSearchParams()

    Object.entries(testParameters).forEach(([key, value]) => {
      if (value && value.trim()) {
        params.append(key, value.trim())
      }
    })

    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl
  }

  const generateCurlCommand = (endpoint: EndpointExample): string => {
    const url = buildTestUrl(endpoint)
    const authHeader = apiKey ? `  -H "Authorization: Bearer ${apiKey}" \\` : '  -H "Authorization: Bearer YOUR_API_KEY" \\'

    return `curl -X ${endpoint.method} "${url}" \\
${authHeader}
  -H "Content-Type: application/json"`
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">API Documentation</h2>
        <p className="text-muted-foreground">
          Comprehensive documentation for the CU-BEMS Professional API
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <Book className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="endpoints">
            <Code className="h-4 w-4 mr-2" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="testing">
            <Play className="h-4 w-4 mr-2" />
            API Testing
          </TabsTrigger>
          <TabsTrigger value="examples">
            <Zap className="h-4 w-4 mr-2" />
            Examples
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>How to authenticate with the API</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">API Key Authentication</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Include your API key in the Authorization header:
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <code className="text-sm">Authorization: Bearer cb_your_api_key_here</code>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Required Scopes</h4>
                  <div className="space-y-2">
                    {Object.entries(authenticationInfo.scopes).map(([scope, description]) => (
                      <div key={scope} className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">{scope}</Badge>
                        <span className="text-sm text-muted-foreground">{description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rate Limiting</CardTitle>
                <CardDescription>API usage limits and quotas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Professional Tier</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Requests per hour:</span>
                      <span className="font-medium">10,000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Burst allowance:</span>
                      <span className="font-medium">500</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Rate Limit Headers</h4>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    <div>X-RateLimit-Limit: 10000</div>
                    <div>X-RateLimit-Remaining: 9999</div>
                    <div>X-RateLimit-Reset: 1640995200</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Base URL & Versioning</CardTitle>
              <CardDescription>API base URL and version information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-1">Base URL</div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <code>https://api.cu-bems.com</code>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Current Version</div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <code>v1</code>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Content Type</div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <code>application/json</code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <div className="space-y-4">
            {Object.entries(endpoints).map(([key, endpoint]) => (
              <Collapsible key={key}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant={endpoint.method === 'GET' ? 'default' : 'secondary'}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm">{endpoint.path}</code>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            Cost: {endpoint.rate_limit_cost}
                          </Badge>
                          {endpoint.scopes.map(scope => (
                            <Badge key={scope} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <CardDescription>{endpoint.description}</CardDescription>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-4">
                        {endpoint.parameters.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Parameters</h4>
                            <div className="space-y-2">
                              {endpoint.parameters.map((param) => (
                                <div key={param.name} className="border rounded-lg p-3">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <code className="text-sm font-medium">{param.name}</code>
                                    <Badge variant={param.required ? 'destructive' : 'secondary'} className="text-xs">
                                      {param.required ? 'Required' : 'Optional'}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">{param.type}</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">{param.description}</p>
                                  {param.example && (
                                    <div className="bg-gray-50 p-2 rounded">
                                      <code className="text-xs">Example: {JSON.stringify(param.example)}</code>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Example Response</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(JSON.stringify(endpoint.response_example, null, 2))}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg overflow-x-auto">
                            <pre className="text-xs">
                              {JSON.stringify(endpoint.response_example, null, 2)}
                            </pre>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">cURL Example</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(endpoint.curl_example)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <div className="bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
                            <pre className="text-xs">{endpoint.curl_example}</pre>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interactive API Testing</CardTitle>
              <CardDescription>Test API endpoints directly from the documentation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="test-api-key">API Key (Optional)</Label>
                  <Input
                    id="test-api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="cb_your_api_key_here"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter your API key to test authenticated endpoints
                  </p>
                </div>
                <div>
                  <Label htmlFor="endpoint-select">Select Endpoint</Label>
                  <select
                    id="endpoint-select"
                    className="w-full p-2 border rounded-md"
                    value={selectedEndpoint}
                    onChange={(e) => setSelectedEndpoint(e.target.value)}
                  >
                    {Object.entries(endpoints).map(([key, endpoint]) => (
                      <option key={key} value={key}>
                        {endpoint.method} {endpoint.path}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedEndpoint && endpoints[selectedEndpoint].parameters.length > 0 && (
                <div>
                  <Label>Parameters</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {endpoints[selectedEndpoint].parameters.map((param) => (
                      <div key={param.name}>
                        <Label htmlFor={`test-${param.name}`} className="text-sm">
                          {param.name}
                          {param.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <Input
                          id={`test-${param.name}`}
                          value={testParameters[param.name] || ''}
                          onChange={(e) => setTestParameters(prev => ({
                            ...prev,
                            [param.name]: e.target.value
                          }))}
                          placeholder={param.example?.toString()}
                        />
                        <p className="text-xs text-muted-foreground mt-1">{param.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Generated cURL Command</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generateCurlCommand(endpoints[selectedEndpoint]))}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
                  <pre className="text-xs">{generateCurlCommand(endpoints[selectedEndpoint])}</pre>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button disabled>
                  <Play className="h-4 w-4 mr-2" />
                  Send Request
                </Button>
                <p className="text-sm text-muted-foreground">
                  Interactive testing coming soon. Use the cURL command above for now.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>JavaScript/Node.js</CardTitle>
                <CardDescription>Example using fetch API</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-3 rounded-lg overflow-x-auto">
                  <pre className="text-xs">{`const response = await fetch('https://api.cu-bems.com/api/v1/data/timeseries', {
  headers: {
    'Authorization': 'Bearer cb_your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);`}</pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Python</CardTitle>
                <CardDescription>Example using requests library</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-3 rounded-lg overflow-x-auto">
                  <pre className="text-xs">{`import requests

headers = {
    'Authorization': 'Bearer cb_your_api_key_here',
    'Content-Type': 'application/json'
}

response = requests.get(
    'https://api.cu-bems.com/api/v1/data/timeseries',
    headers=headers
)

data = response.json()
print(data)`}</pre>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Error Handling</CardTitle>
              <CardDescription>How to handle API errors properly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Common Error Codes</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="destructive">401</Badge>
                      <span className="text-sm">Invalid API key or authentication required</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="destructive">403</Badge>
                      <span className="text-sm">Insufficient scope or permissions</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="destructive">429</Badge>
                      <span className="text-sm">Rate limit exceeded</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="destructive">500</Badge>
                      <span className="text-sm">Internal server error</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Error Response Format</h4>
                  <div className="bg-gray-50 p-3 rounded-lg overflow-x-auto">
                    <pre className="text-xs">{`{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "details": {
      "limit": 10000,
      "reset_time": "2024-01-01T01:00:00Z"
    },
    "suggestions": [
      "Reduce request frequency",
      "Implement request caching"
    ]
  },
  "meta": {
    "request_id": "req_123456",
    "timestamp": "2024-01-01T00:30:00Z"
  }
}`}</pre>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}