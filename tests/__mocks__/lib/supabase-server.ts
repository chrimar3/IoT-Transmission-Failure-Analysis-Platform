/**
 * Mock for lib/supabase-server module
 * Provides server-side Supabase client mock for API routes and server components
 */

import { mockSupabaseClient } from '../supabase';

export const createServerClient = jest.fn(() => mockSupabaseClient);

export const getServerClient = jest.fn(() => mockSupabaseClient);

export const supabaseServer = {
  from: mockSupabaseClient.from,
  auth: mockSupabaseClient.auth,
  storage: mockSupabaseClient.storage,
  rpc: mockSupabaseClient.rpc,
  functions: {
    invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
  channel: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn().mockReturnThis(),
  }),
  removeChannel: jest.fn(),
  removeAllChannels: jest.fn(),
  getChannels: jest.fn().mockReturnValue([]),
};

export default {
  createServerClient,
  getServerClient,
  supabaseServer,
};
