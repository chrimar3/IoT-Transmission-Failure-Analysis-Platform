/**
 * Supabase Server-Side Client
 *
 * Server-side client for Supabase operations with service role key
 * Used for API routes and server components
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export interface ServerClientOptions {
  useServiceRole?: boolean;
}

/**
 * Create a Supabase client for server-side operations
 * @param options Configuration options for the client
 * @returns Configured Supabase client
 */
export function createServerClient(options: ServerClientOptions = {}): SupabaseClient {
  const { useServiceRole = true } = options;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = useServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseKey) {
    throw new Error(
      `Missing ${useServiceRole ? 'SUPABASE_SERVICE_ROLE_KEY' : 'NEXT_PUBLIC_SUPABASE_ANON_KEY'} environment variable`
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Get a singleton server client instance
 */
let serverClientInstance: SupabaseClient | null = null;

export function getServerClient(): SupabaseClient {
  if (!serverClientInstance) {
    serverClientInstance = createServerClient();
  }
  return serverClientInstance;
}

/**
 * Default export for convenience
 */
export const supabaseServer = {
  from: (table: string) => getServerClient().from(table),
  auth: getServerClient().auth,
  storage: getServerClient().storage,
  functions: getServerClient().functions,
  channel: (name: string) => getServerClient().channel(name),
  removeChannel: (channel: RealtimeChannel) => getServerClient().removeChannel(channel),
  removeAllChannels: () => getServerClient().removeAllChannels(),
  getChannels: () => getServerClient().getChannels(),
};