/**
 * Resilient Supabase Client Wrapper
 * Provides a drop-in replacement for Supabase client with resilience features
 * Epic 2 Story 2.6: Supabase Resilience Enhancement
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getResilienceService } from './resilience-service';

/**
 * Create a resilient Supabase client with built-in retry, circuit breaker, and caching
 */
export function createResilientClient(
  supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY!,
  options?: {
    enableCache?: boolean;
    readonly?: boolean;
  }
): SupabaseClient {
  const resilienceService = getResilienceService();
  const baseClient = createClient(supabaseUrl, supabaseKey);

  // Return a proxy that intercepts all method calls
  return new Proxy(baseClient, {
    get(target, prop) {
      const original = target[prop as keyof typeof target];

      // Intercept 'from' method to wrap queries
      if (prop === 'from') {
        return (table: string) => {
          const queryBuilder = (original as typeof baseClient.from).call(target, table);

          // Wrap query builder methods with resilience
          return new Proxy(queryBuilder, {
            get(qbTarget, qbProp) {
              const qbOriginal = qbTarget[qbProp as keyof typeof qbTarget];

              // Intercept query execution methods
              if (
                typeof qbOriginal === 'function' &&
                ['select', 'insert', 'update', 'delete', 'upsert'].includes(qbProp as string)
              ) {
                return (...args: unknown[]) => {
                  const query = (qbOriginal as (...args: unknown[]) => unknown).apply(qbTarget, args);

                  // If this returns a promise-like object, wrap it
                  if (query && typeof query.then === 'function') {
                    const cacheKey = options?.enableCache
                      ? `${table}:${qbProp}:${JSON.stringify(args)}`
                      : undefined;

                    return resilienceService.executeQuery(
                      async () => query,
                      {
                        cacheable: options?.enableCache && qbProp === 'select',
                        cacheKey,
                        readonly: options?.readonly || qbProp === 'select'
                      }
                    );
                  }

                  return query;
                };
              }

              return qbOriginal;
            }
          });
        };
      }

      // Intercept 'rpc' method for stored procedures
      if (prop === 'rpc') {
        return (fnName: string, params?: Record<string, unknown>) => {
          const cacheKey = options?.enableCache
            ? `rpc:${fnName}:${JSON.stringify(params)}`
            : undefined;

          return resilienceService.executeQuery(
            async (client) => client.rpc(fnName, params),
            {
              cacheable: options?.enableCache,
              cacheKey,
              readonly: options?.readonly
            }
          );
        };
      }

      // Pass through all other properties
      return original;
    }
  }) as SupabaseClient;
}

/**
 * Create a read-only resilient client (optimized for queries)
 */
export function createReadOnlyClient(): SupabaseClient {
  return createResilientClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      enableCache: true,
      readonly: true
    }
  );
}

/**
 * Create a write-optimized resilient client (no caching)
 */
export function createWriteClient(): SupabaseClient {
  return createResilientClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      enableCache: false,
      readonly: false
    }
  );
}

/**
 * Get health status of the resilient client
 */
export function getClientHealth() {
  const resilienceService = getResilienceService();
  return {
    metrics: resilienceService.getMetrics(),
    circuitBreaker: resilienceService.getCircuitBreakerStatus()
  };
}