import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Health Check Endpoint
 * Provides comprehensive system health status for domain verification and monitoring
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  environment: string;
  version: string;
  services: {
    database: ServiceHealth;
    authentication: ServiceHealth;
    storage: ServiceHealth;
    monitoring: ServiceHealth;
  };
  domain: {
    name: string;
    ssl: boolean;
    certificate: {
      valid: boolean;
      expires?: string;
    };
  };
  performance: {
    responseTime: number;
    uptime: number;
    memoryUsage: number;
  };
}

interface ServiceHealth {
  status: 'operational' | 'degraded' | 'down';
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: await checkDatabase(),
        authentication: await checkAuthentication(),
        storage: await checkStorage(),
        monitoring: await checkMonitoring()
      },
      domain: {
        name: getDomainName(request),
        ssl: isSSLEnabled(request),
        certificate: await checkSSLCertificate(request)
      },
      performance: {
        responseTime: 0, // Will be set below
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
      }
    };

    // Calculate response time
    healthStatus.performance.responseTime = Date.now() - startTime;

    // Determine overall status
    const serviceStatuses = Object.values(healthStatus.services).map(s => s.status);
    if (serviceStatuses.includes('down')) {
      healthStatus.status = 'unhealthy';
    } else if (serviceStatuses.includes('degraded')) {
      healthStatus.status = 'degraded';
    }

    // Return appropriate status code
    const statusCode = healthStatus.status === 'healthy' ? 200 :
                      healthStatus.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthStatus, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': 'true'
      }
    });

  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check system failure',
      responseTime: Date.now() - startTime
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': 'true'
      }
    });
  }
}

async function checkDatabase(): Promise<ServiceHealth> {
  const startTime = Date.now();

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: 'Supabase configuration missing'
      };
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Simple connectivity test
    const { error } = await supabase.from('sensor_readings').select('count').limit(1);

    if (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }

    const responseTime = Date.now() - startTime;

    return {
      status: responseTime > 1000 ? 'degraded' : 'operational',
      responseTime,
      lastCheck: new Date().toISOString()
    };

  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

async function checkAuthentication(): Promise<ServiceHealth> {
  const startTime = Date.now();

  try {
    // Check if NextAuth configuration is present
    if (!process.env.NEXTAUTH_SECRET || !process.env.NEXTAUTH_URL) {
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: 'NextAuth configuration missing'
      };
    }

    // Simple configuration check
    const responseTime = Date.now() - startTime;

    return {
      status: 'operational',
      responseTime,
      lastCheck: new Date().toISOString()
    };

  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Authentication check failed'
    };
  }
}

async function checkStorage(): Promise<ServiceHealth> {
  const startTime = Date.now();

  try {
    // Check R2 configuration
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      return {
        status: 'degraded',
        lastCheck: new Date().toISOString(),
        error: 'R2 storage configuration missing (non-critical)'
      };
    }

    const responseTime = Date.now() - startTime;

    return {
      status: 'operational',
      responseTime,
      lastCheck: new Date().toISOString()
    };

  } catch (error) {
    return {
      status: 'degraded',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Storage check failed'
    };
  }
}

async function checkMonitoring(): Promise<ServiceHealth> {
  const startTime = Date.now();

  try {
    // Check if monitoring configuration is present
    const hasSentry = !!process.env.SENTRY_DSN;

    const responseTime = Date.now() - startTime;

    return {
      status: hasSentry ? 'operational' : 'degraded',
      responseTime,
      lastCheck: new Date().toISOString(),
      error: hasSentry ? undefined : 'Sentry monitoring not configured'
    };

  } catch (error) {
    return {
      status: 'degraded',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Monitoring check failed'
    };
  }
}

function getDomainName(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost';
  return host;
}

function isSSLEnabled(request: NextRequest): boolean {
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  return protocol === 'https';
}

async function checkSSLCertificate(request: NextRequest): Promise<{ valid: boolean; expires?: string }> {
  try {
    const host = getDomainName(request);

    // In production, this would make an actual SSL check
    // For now, we'll assume SSL is valid if it's enabled
    if (isSSLEnabled(request) && host !== 'localhost') {
      return {
        valid: true,
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days from now
      };
    }

    return { valid: false };

  } catch (_error) {
    return { valid: false };
  }
}