/**
 * Webhook Manager Component
 * Professional tier webhook endpoint management and testing
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Plus,
  Trash2,
  Send,
  _Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Globe,
  _Clock
} from 'lucide-react'
import type { WebhookEndpoint, WebhookEvent, _CreateWebhookRequest, _WebhookTestRequest } from '@/types/api'

interface WebhookManagerProps {
  className?: string
}

interface CreateWebhookForm {
  url: string
  events: WebhookEvent[]
}

interface TestWebhookForm {
  event_type: WebhookEvent
  test_payload: string
}

export function WebhookManager({ className }: WebhookManagerProps) {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEndpoint | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<unknown>(null)

  const [createForm, setCreateForm] = useState<CreateWebhookForm>({
    url: '',
    events: ['data.updated']
  })

  const [testForm, setTestForm] = useState<TestWebhookForm>({
    event_type: 'data.updated',
    test_payload: JSON.stringify({
      test: true,
      message: 'This is a test webhook delivery',
      timestamp: new Date().toISOString()
    }, null, 2)
  })

  const availableEvents: { value: WebhookEvent; label: string; description: string }[] = [
    {
      value: 'data.updated',
      label: 'Data Updated',
      description: 'Triggered when new sensor data is processed'
    },
    {
      value: 'alert.triggered',
      label: 'Alert Triggered',
      description: 'Triggered when system alerts are generated'
    },
    {
      value: 'export.completed',
      label: 'Export Completed',
      description: 'Triggered when data export jobs finish'
    },
    {
      value: 'pattern.detected',
      label: 'Pattern Detected',
      description: 'Triggered when anomalies or patterns are detected'
    }
  ]

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const fetchWebhooks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/webhooks')
      const data = await response.json()

      if (data.success) {
        setWebhooks(data.data.webhooks)
      } else {
        setError(data.error.message)
      }
    } catch (_err) {
      setError('Failed to fetch webhooks')
    } finally {
      setLoading(false)
    }
  }

  const createWebhook = async () => {
    try {
      setError(null)
      const response = await fetch('/api/v1/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      })

      const data = await response.json()

      if (data.success) {
        setWebhooks(prev => [data.data.webhook, ...prev])
        setCreateForm({ url: '', events: ['data.updated'] })
        setCreateDialogOpen(false)
      } else {
        setError(data.error.message)
      }
    } catch (_err) {
      setError('Failed to create webhook')
    }
  }

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/v1/webhooks?id=${webhookId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId))
      } else {
        setError(data.error.message)
      }
    } catch (_err) {
      setError('Failed to delete webhook')
    }
  }

  const toggleWebhook = async (webhook: WebhookEndpoint) => {
    try {
      const response = await fetch(`/api/v1/webhooks?id=${webhook.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_active: !webhook.is_active
        })
      })

      const data = await response.json()

      if (data.success) {
        setWebhooks(prev => prev.map(w => w.id === webhook.id ? data.data.webhook : w))
      } else {
        setError(data.error.message)
      }
    } catch (_err) {
      setError('Failed to update webhook')
    }
  }

  const testWebhook = async () => {
    if (!selectedWebhook) return

    try {
      setTestResult(null)
      let testPayload: unknown

      try {
        testPayload = JSON.parse(testForm.test_payload)
      } catch {
        setError('Invalid JSON in test payload')
        return
      }

      const response = await fetch(`/api/v1/webhooks/test?id=${selectedWebhook.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type: testForm.event_type,
          test_payload: testPayload
        })
      })

      const data = await response.json()

      if (data.success) {
        setTestResult(data.data.test_result)
      } else {
        setError(data.error.message)
      }
    } catch (_err) {
      setError('Failed to test webhook')
    }
  }

  const getStatusColor = (webhook: WebhookEndpoint): string => {
    if (!webhook.is_active) return 'bg-gray-100 text-gray-800'
    return 'bg-green-100 text-green-800'
  }

  const getStatusText = (webhook: WebhookEndpoint): string => {
    return webhook.is_active ? 'Active' : 'Inactive'
  }

  const getDeliverySuccessRate = (webhook: WebhookEndpoint): number => {
    const { total_deliveries, successful_deliveries } = webhook.delivery_stats
    return total_deliveries > 0 ? Math.round((successful_deliveries / total_deliveries) * 100) : 0
  }

  const openTestDialog = (webhook: WebhookEndpoint) => {
    setSelectedWebhook(webhook)
    setTestResult(null)
    setTestDialogOpen(true)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Webhook Endpoints</CardTitle>
          <CardDescription>Loading webhooks...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className={className}>
      {error && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhook Endpoints</CardTitle>
              <CardDescription>
                Configure webhook endpoints to receive real-time event notifications
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Webhook</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      type="url"
                      value={createForm.url}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://your-app.com/webhooks/cu-bems"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Must be a valid HTTPS URL in production
                    </p>
                  </div>

                  <div>
                    <Label>Events to Subscribe</Label>
                    <div className="space-y-2 mt-2">
                      {availableEvents.map((event) => (
                        <div key={event.value} className="flex items-start space-x-2">
                          <Checkbox
                            id={event.value}
                            checked={createForm.events.includes(event.value)}
                            onCheckedChange={(checked) => {
                              setCreateForm(prev => ({
                                ...prev,
                                events: checked
                                  ? [...prev.events, event.value]
                                  : prev.events.filter(e => e !== event.value)
                              }))
                            }}
                          />
                          <div>
                            <Label htmlFor={event.value} className="text-sm font-medium">
                              {event.label}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={createWebhook}
                      disabled={!createForm.url || createForm.events.length === 0}
                    >
                      Create Webhook
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {webhooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4" />
                <p>No webhook endpoints configured yet.</p>
                <p className="text-sm">Create your first webhook to receive real-time notifications.</p>
              </div>
            ) : (
              webhooks.map((webhook) => (
                <Card key={webhook.id} className="border">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {webhook.url}
                            </code>
                          </div>
                          <Badge className={getStatusColor(webhook)}>
                            {getStatusText(webhook)}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {webhook.events.map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Total Deliveries</div>
                            <div className="font-medium">{webhook.delivery_stats.total_deliveries}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Success Rate</div>
                            <div className="font-medium">
                              {getDeliverySuccessRate(webhook)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Failed Deliveries</div>
                            <div className="font-medium text-red-600">
                              {webhook.delivery_stats.failed_deliveries}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Last Delivery</div>
                            <div className="font-medium">
                              {webhook.last_delivery_at
                                ? new Date(webhook.last_delivery_at).toLocaleDateString()
                                : 'Never'}
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(webhook.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`toggle-${webhook.id}`} className="text-sm">
                            {webhook.is_active ? 'Active' : 'Inactive'}
                          </Label>
                          <Switch
                            id={`toggle-${webhook.id}`}
                            checked={webhook.is_active}
                            onCheckedChange={() => toggleWebhook(webhook)}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTestDialog(webhook)}
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteWebhook(webhook.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Webhook Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Test Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedWebhook && (
              <div className="text-sm text-muted-foreground">
                Testing: <code>{selectedWebhook.url}</code>
              </div>
            )}

            <div>
              <Label htmlFor="test-event">Event Type</Label>
              <select
                id="test-event"
                className="w-full p-2 border rounded-md"
                value={testForm.event_type}
                onChange={(e) => setTestForm(prev => ({ ...prev, event_type: e.target.value as WebhookEvent }))}
              >
                {availableEvents.map((event) => (
                  <option key={event.value} value={event.value}>
                    {event.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="test-payload">Test Payload (JSON)</Label>
              <Textarea
                id="test-payload"
                rows={8}
                value={testForm.test_payload}
                onChange={(e) => setTestForm(prev => ({ ...prev, test_payload: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>

            {testResult && (
              <div className="space-y-2">
                <Label>Test Result</Label>
                <div className={`p-3 border rounded-lg ${
                  testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium">
                      {testResult.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  {testResult.response && (
                    <div className="text-sm">
                      <div>Status: {testResult.response.status}</div>
                      {testResult.response.body && (
                        <div className="mt-1">
                          Response: <code className="bg-white px-1 rounded">{testResult.response.body}</code>
                        </div>
                      )}
                    </div>
                  )}
                  {testResult.error && (
                    <div className="text-sm text-red-600">
                      Error: {testResult.error}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={testWebhook}>
                <Send className="h-4 w-4 mr-2" />
                Send Test
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}