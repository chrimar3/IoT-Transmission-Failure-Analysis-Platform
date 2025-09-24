/**
 * API Usage Analytics Component
 * Displays comprehensive API usage statistics and performance metrics
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  Activity,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  _Calendar,
  _Filter
} from 'lucide-react'
import type { ApiUsageStats } from '@/types/api'

interface ApiUsageAnalyticsProps {
  className?: string
}

interface UsageData {
  usage_stats: ApiUsageStats
  rate_limit_status: {
    current_usage: number
    limit: number
    reset_time: string
  }
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

export function ApiUsageAnalytics({ className }: ApiUsageAnalyticsProps) {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    fetchUsageData()
  }, [fetchUsageData])

  const fetchUsageData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const startDate = new Date()
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      startDate.setDate(startDate.getDate() - days)

      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
        group_by: timeRange === '7d' ? 'day' : 'day'
      })

      const response = await fetch(`/api/v1/usage?${params}`)
      const data = await response.json()

      if (data.success) {
        setUsageData(data.data)
      } else {
        setError(data.error.message)
      }
    } catch (_err) {
      setError('Failed to fetch usage analytics')
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  const calculateSuccessRate = () => {
    if (!usageData) return 0
    const { successful_requests, total_requests } = usageData.usage_stats
    return total_requests > 0 ? Math.round((successful_requests / total_requests) * 100) : 0
  }

  const getRateLimitUsagePercentage = () => {
    if (!usageData) return 0
    const { current_usage, limit } = usageData.rate_limit_status
    return Math.round((current_usage / limit) * 100)
  }

  const formatEndpointData = () => {
    if (!usageData) return []
    return Object.entries(usageData.usage_stats.requests_by_endpoint)
      .map(([endpoint, count]) => ({
        endpoint: endpoint.replace('/api/v1/', ''),
        requests: count
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 6)
  }

  const formatDailyUsageData = () => {
    if (!usageData) return []
    return usageData.usage_stats.requests_by_day.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      requests: item.count
    }))
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>API Usage Analytics</CardTitle>
          <CardDescription>Loading usage data...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>API Usage Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!usageData) {
    return null
  }

  const successRate = calculateSuccessRate()
  const rateLimitUsage = getRateLimitUsagePercentage()
  const endpointData = formatEndpointData()
  const dailyUsageData = formatDailyUsageData()

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">API Usage Analytics</h2>
          <p className="text-muted-foreground">
            Monitor your API usage and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('7d')}
          >
            7 Days
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('30d')}
          >
            30 Days
          </Button>
          <Button
            variant={timeRange === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('90d')}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <div className="text-sm font-medium text-muted-foreground">Total Requests</div>
            </div>
            <div className="text-2xl font-bold">{usageData.usage_stats.total_requests.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              Last {timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="text-sm font-medium text-muted-foreground">Success Rate</div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">{successRate}%</div>
              <Badge variant={successRate >= 95 ? 'default' : successRate >= 90 ? 'secondary' : 'destructive'}>
                {successRate >= 95 ? 'Excellent' : successRate >= 90 ? 'Good' : 'Needs Attention'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div className="text-sm font-medium text-muted-foreground">Avg Response Time</div>
            </div>
            <div className="text-2xl font-bold">{usageData.usage_stats.average_response_time}ms</div>
            <div className="text-xs text-muted-foreground">
              {usageData.usage_stats.average_response_time < 500 ? 'Fast' :
               usageData.usage_stats.average_response_time < 1000 ? 'Good' : 'Slow'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div className="text-sm font-medium text-muted-foreground">Rate Limit Usage</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{rateLimitUsage}%</div>
              <Progress value={rateLimitUsage} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {usageData.rate_limit_status.current_usage.toLocaleString()} / {usageData.rate_limit_status.limit.toLocaleString()} requests
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Usage Trends</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily API Usage</CardTitle>
              <CardDescription>Request volume over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyUsageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Most Used Endpoints</CardTitle>
                <CardDescription>Request distribution by endpoint</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={endpointData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="endpoint" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="requests" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Endpoint Distribution</CardTitle>
                <CardDescription>Percentage breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={endpointData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ endpoint, percent }) => `${endpoint} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="requests"
                    >
                      {endpointData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Errors</CardTitle>
              <CardDescription>Most common API errors and issues</CardDescription>
            </CardHeader>
            <CardContent>
              {usageData.usage_stats.top_errors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p>No errors detected in the selected time period.</p>
                  <p className="text-sm">Your API usage is running smoothly!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {usageData.usage_stats.top_errors.map((errorItem, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <div>
                          <div className="font-medium">{errorItem.error}</div>
                          <div className="text-sm text-muted-foreground">
                            {errorItem.count} occurrence{errorItem.count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <Badge variant="destructive">{errorItem.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Distribution</CardTitle>
                <CardDescription>Performance breakdown by speed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Fast (&lt;200ms)</span>
                    <span className="text-sm text-green-600">Good</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Normal (200-500ms)</span>
                    <span className="text-sm text-blue-600">Acceptable</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Slow (&gt;500ms)</span>
                    <span className="text-sm text-orange-600">Needs Attention</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rate Limit Status</CardTitle>
                <CardDescription>Current usage against limits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Hourly Limit</span>
                      <span>{usageData.rate_limit_status.current_usage} / {usageData.rate_limit_status.limit}</span>
                    </div>
                    <Progress value={rateLimitUsage} className="h-2" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Resets at: {new Date(usageData.rate_limit_status.reset_time).toLocaleTimeString()}
                  </div>
                  {rateLimitUsage > 80 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        You&apos;re approaching your rate limit. Consider optimizing your API usage or upgrading your plan.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}