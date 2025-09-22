/**
 * API Key Manager Component
 * Professional tier API key creation, management, and monitoring
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
import { Copy, Eye, EyeOff, Plus, Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import type { ApiKey, ApiKeyScope, CreateApiKeyRequest } from '@/types/api'

interface ApiKeyManagerProps {
  className?: string
}

interface CreateKeyForm {
  name: string
  scopes: ApiKeyScope[]
  expires_at?: string
}

export function ApiKeyManager({ className }: ApiKeyManagerProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const [createForm, setCreateForm] = useState<CreateKeyForm>({
    name: '',
    scopes: ['read:data'],
    expires_at: ''
  })

  const availableScopes: { value: ApiKeyScope; label: string; description: string }[] = [
    {
      value: 'read:data',
      label: 'Read Data',
      description: 'Access time-series and sensor data'
    },
    {
      value: 'read:analytics',
      label: 'Read Analytics',
      description: 'Access analytics and pattern data'
    },
    {
      value: 'read:exports',
      label: 'Read Exports',
      description: 'Create and download data exports'
    },
    {
      value: 'write:webhooks',
      label: 'Manage Webhooks',
      description: 'Create and manage webhook endpoints'
    }
  ]

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/keys')
      const data = await response.json()

      if (data.success) {
        setApiKeys(data.data.api_keys)
      } else {
        setError(data.error.message)
      }
    } catch (err) {
      setError('Failed to fetch API keys')
    } finally {
      setLoading(false)
    }
  }

  const createApiKey = async () => {
    try {
      setError(null)
      const response = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: createForm.name,
          scopes: createForm.scopes,
          expires_at: createForm.expires_at || undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        setNewKey(data.data.key)
        setApiKeys(prev => [data.data.api_key, ...prev])
        setCreateForm({ name: '', scopes: ['read:data'], expires_at: '' })
      } else {
        setError(data.error.message)
      }
    } catch (err) {
      setError('Failed to create API key')
    }
  }

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/v1/keys?id=${keyId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setApiKeys(prev => prev.filter(key => key.id !== keyId))
      } else {
        setError(data.error.message)
      }
    } catch (err) {
      setError('Failed to delete API key')
    }
  }

  const rotateApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to rotate this API key? You will need to update all integrations.')) {
      return
    }

    try {
      const response = await fetch(`/api/v1/keys/rotate?id=${keyId}`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        setNewKey(data.data.key)
        setApiKeys(prev => prev.map(key => key.id === keyId ? data.data.api_key : key))
      } else {
        setError(data.error.message)
      }
    } catch (err) {
      setError('Failed to rotate API key')
    }
  }

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev)
      if (newSet.has(keyId)) {
        newSet.delete(keyId)
      } else {
        newSet.add(keyId)
      }
      return newSet
    })
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You might want to show a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const formatKeyDisplay = (key: ApiKey) => {
    const isVisible = visibleKeys.has(key.id)
    if (isVisible) {
      return key.key_prefix + '••••••••••••••••••••••••••••'
    }
    return '••••••••••••••••••••••••••••••••••••••••••••••••'
  }

  const getScopeColor = (scope: ApiKeyScope): string => {
    const colors = {
      'read:data': 'bg-blue-100 text-blue-800',
      'read:analytics': 'bg-green-100 text-green-800',
      'read:exports': 'bg-purple-100 text-purple-800',
      'write:webhooks': 'bg-orange-100 text-orange-800'
    }
    return colors[scope] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (key: ApiKey): string => {
    if (!key.is_active) return 'bg-red-100 text-red-800'
    if (key.expires_at && new Date(key.expires_at) <= new Date()) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const getStatusText = (key: ApiKey): string => {
    if (!key.is_active) return 'Inactive'
    if (key.expires_at && new Date(key.expires_at) <= new Date()) return 'Expired'
    return 'Active'
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Loading API keys...</CardDescription>
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
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage your API keys for Professional tier access
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="key-name">Key Name</Label>
                    <Input
                      id="key-name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Production Dashboard"
                    />
                  </div>

                  <div>
                    <Label>Scopes</Label>
                    <div className="space-y-2 mt-2">
                      {availableScopes.map((scope) => (
                        <div key={scope.value} className="flex items-start space-x-2">
                          <Checkbox
                            id={scope.value}
                            checked={createForm.scopes.includes(scope.value)}
                            onCheckedChange={(checked) => {
                              setCreateForm(prev => ({
                                ...prev,
                                scopes: checked
                                  ? [...prev.scopes, scope.value]
                                  : prev.scopes.filter(s => s !== scope.value)
                              }))
                            }}
                          />
                          <div>
                            <Label htmlFor={scope.value} className="text-sm font-medium">
                              {scope.label}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {scope.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="expires-at">Expiration Date (Optional)</Label>
                    <Input
                      id="expires-at"
                      type="datetime-local"
                      value={createForm.expires_at}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, expires_at: e.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={createApiKey}
                      disabled={!createForm.name || createForm.scopes.length === 0}
                    >
                      Create Key
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {newKey && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">API Key Created Successfully!</p>
                  <p className="text-sm">
                    Copy this key now - it will not be shown again.
                  </p>
                  <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
                    <code className="flex-1 text-sm">{newKey}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(newKey)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setNewKey(null)}
                  >
                    I've copied the key
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No API keys created yet.</p>
                <p className="text-sm">Create your first API key to get started.</p>
              </div>
            ) : (
              apiKeys.map((key) => (
                <Card key={key.id} className="border">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{key.name}</h3>
                          <Badge className={getStatusColor(key)}>
                            {getStatusText(key)}
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <code className="bg-gray-100 px-2 py-1 rounded">
                            {formatKeyDisplay(key)}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleKeyVisibility(key.id)}
                          >
                            {visibleKeys.has(key.id) ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(key.key_prefix + '••••••••••••••••••••••••••••')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {key.scopes.map((scope) => (
                            <Badge
                              key={scope}
                              variant="secondary"
                              className={`text-xs ${getScopeColor(scope)}`}
                            >
                              {scope}
                            </Badge>
                          ))}
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Created: {new Date(key.created_at).toLocaleDateString()}</div>
                          {key.last_used_at && (
                            <div>Last used: {new Date(key.last_used_at).toLocaleDateString()}</div>
                          )}
                          {key.expires_at && (
                            <div>Expires: {new Date(key.expires_at).toLocaleDateString()}</div>
                          )}
                          <div>
                            Requests: {key.usage_stats.total_requests} total,{' '}
                            {key.usage_stats.requests_this_month} this month
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rotateApiKey(key.id)}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteApiKey(key.id)}
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
    </div>
  )
}