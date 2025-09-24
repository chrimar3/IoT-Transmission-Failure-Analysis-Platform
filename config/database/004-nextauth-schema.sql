-- Migration 004: NextAuth.js Schema for Supabase Integration
-- Description: Creates NextAuth.js tables in next_auth schema
-- Author: CU-BEMS Development Team
-- Date: 2025-09-22

-- Create next_auth schema for NextAuth.js tables
CREATE SCHEMA IF NOT EXISTS next_auth;

-- Grant usage on schema to authenticated users
GRANT USAGE ON SCHEMA next_auth TO authenticated;
GRANT ALL ON SCHEMA next_auth TO service_role;

-- Users table for NextAuth.js
CREATE TABLE IF NOT EXISTS next_auth.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    "emailVerified" TIMESTAMPTZ,
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts table for OAuth providers
CREATE TABLE IF NOT EXISTS next_auth.accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, "providerAccountId")
);

-- Sessions table for session management
CREATE TABLE IF NOT EXISTS next_auth.sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "sessionToken" TEXT UNIQUE NOT NULL,
    "userId" UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    expires TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification tokens for email verification
CREATE TABLE IF NOT EXISTS next_auth.verification_tokens (
    token TEXT UNIQUE NOT NULL,
    identifier TEXT NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (identifier, token)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_next_auth_users_email ON next_auth.users(email);
CREATE INDEX IF NOT EXISTS idx_next_auth_accounts_user_id ON next_auth.accounts("userId");
CREATE INDEX IF NOT EXISTS idx_next_auth_accounts_provider ON next_auth.accounts(provider, "providerAccountId");
CREATE INDEX IF NOT EXISTS idx_next_auth_sessions_user_id ON next_auth.sessions("userId");
CREATE INDEX IF NOT EXISTS idx_next_auth_sessions_token ON next_auth.sessions("sessionToken");
CREATE INDEX IF NOT EXISTS idx_next_auth_verification_tokens ON next_auth.verification_tokens(identifier, expires);

-- Row Level Security (RLS) policies
ALTER TABLE next_auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE next_auth.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE next_auth.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE next_auth.verification_tokens ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to service_role for NextAuth operations
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA next_auth TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA next_auth TO service_role;

-- Allow service_role to bypass RLS (NextAuth adapter needs full access)
GRANT pg_read_all_data, pg_write_all_data TO service_role;

-- Optional: Grant read access to authenticated users for their own data
-- Users can read their own user record
CREATE POLICY "Users can read own user data" ON next_auth.users
    FOR SELECT USING (auth.uid()::TEXT = id::TEXT);

-- Users can read their own accounts
CREATE POLICY "Users can read own accounts" ON next_auth.accounts
    FOR SELECT USING (auth.uid()::TEXT = "userId"::TEXT);

-- Users can read their own sessions
CREATE POLICY "Users can read own sessions" ON next_auth.sessions
    FOR SELECT USING (auth.uid()::TEXT = "userId"::TEXT);

-- Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION next_auth.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_next_auth_users_updated_at BEFORE UPDATE ON next_auth.users
    FOR EACH ROW EXECUTE FUNCTION next_auth.update_updated_at_column();

CREATE TRIGGER update_next_auth_accounts_updated_at BEFORE UPDATE ON next_auth.accounts
    FOR EACH ROW EXECUTE FUNCTION next_auth.update_updated_at_column();

CREATE TRIGGER update_next_auth_sessions_updated_at BEFORE UPDATE ON next_auth.sessions
    FOR EACH ROW EXECUTE FUNCTION next_auth.update_updated_at_column();