-- User onboarding and documentation system schema
-- Supports guided tours, progress tracking, and user preferences

-- User onboarding progress tracking
CREATE TABLE IF NOT EXISTS onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    onboarding_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    current_step INTEGER NOT NULL DEFAULT 0,
    completed_steps INTEGER[] DEFAULT '{}',
    completed_at TIMESTAMPTZ,
    skipped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one active onboarding per user
    UNIQUE(user_id)
);

-- User preferences and personalization
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'facility_manager',
    building_type VARCHAR(50) DEFAULT 'office',
    experience_level VARCHAR(20) DEFAULT 'intermediate',
    primary_goals TEXT[] DEFAULT '{}',
    notifications_enabled BOOLEAN DEFAULT true,
    tour_preferences VARCHAR(20) DEFAULT 'full',
    language_preference VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one preference record per user
    UNIQUE(user_id),

    -- Constraints for valid values
    CONSTRAINT valid_role CHECK (role IN ('facility_manager', 'energy_analyst', 'building_owner', 'consultant', 'other')),
    CONSTRAINT valid_building_type CHECK (building_type IN ('office', 'retail', 'industrial', 'residential', 'mixed_use', 'other')),
    CONSTRAINT valid_experience_level CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    CONSTRAINT valid_tour_preferences CHECK (tour_preferences IN ('full', 'quick', 'skip'))
);

-- Documentation usage analytics
CREATE TABLE IF NOT EXISTS documentation_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_slug VARCHAR(200) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    session_duration_seconds INTEGER,
    completion_percentage INTEGER CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    page_context VARCHAR(200),
    user_agent TEXT,
    referrer_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints for valid values
    CONSTRAINT valid_document_type CHECK (document_type IN ('article', 'tutorial', 'video', 'faq', 'guide', 'troubleshooting')),
    CONSTRAINT valid_action CHECK (action IN ('view', 'complete', 'rate', 'feedback', 'search', 'download', 'share'))
);

-- Contextual help interactions
CREATE TABLE IF NOT EXISTS help_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    help_type VARCHAR(50) NOT NULL,
    page_context VARCHAR(200) NOT NULL,
    help_content_id VARCHAR(100) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL,
    target_element VARCHAR(200),
    session_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints for valid values
    CONSTRAINT valid_help_type CHECK (help_type IN ('tooltip', 'contextual', 'search', 'widget', 'overlay', 'spotlight')),
    CONSTRAINT valid_interaction_type CHECK (interaction_type IN ('view', 'click', 'dismiss', 'helpful', 'not_helpful', 'expand', 'collapse'))
);

-- Video tutorial progress tracking
CREATE TABLE IF NOT EXISTS video_tutorial_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id VARCHAR(100) NOT NULL,
    video_title VARCHAR(200) NOT NULL,
    duration_seconds INTEGER NOT NULL,
    watch_time_seconds INTEGER DEFAULT 0,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    completed_at TIMESTAMPTZ,
    last_position_seconds INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one progress record per user per video
    UNIQUE(user_id, video_id)
);

-- Support ticket system
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    assigned_to VARCHAR(100),
    context JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),

    -- Constraints for valid values
    CONSTRAINT valid_category CHECK (category IN ('technical', 'billing', 'feature_request', 'general', 'bug_report', 'data_access', 'integration')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'pending_user', 'resolved', 'closed', 'escalated'))
);

-- Support ticket messages/updates
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_type VARCHAR(20) NOT NULL DEFAULT 'user',
    author_name VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints for valid values
    CONSTRAINT valid_author_type CHECK (author_type IN ('user', 'support', 'system', 'bot'))
);

-- Feature feedback and suggestions
CREATE TABLE IF NOT EXISTS feature_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_area VARCHAR(100) NOT NULL,
    feedback_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority_vote INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'submitted',
    tags TEXT[] DEFAULT '{}',
    implementation_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints for valid values
    CONSTRAINT valid_feedback_type CHECK (feedback_type IN ('suggestion', 'improvement', 'bug_report', 'feature_request', 'ui_ux', 'performance')),
    CONSTRAINT valid_status CHECK (status IN ('submitted', 'reviewing', 'planned', 'in_progress', 'completed', 'declined', 'duplicate'))
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_version ON onboarding_progress(onboarding_version);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_documentation_usage_user_id ON documentation_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_documentation_usage_document_slug ON documentation_usage(document_slug);
CREATE INDEX IF NOT EXISTS idx_documentation_usage_created_at ON documentation_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_help_interactions_user_id ON help_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_help_interactions_page_context ON help_interactions(page_context);
CREATE INDEX IF NOT EXISTS idx_help_interactions_created_at ON help_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_video_tutorial_progress_user_id ON video_tutorial_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_tutorial_progress_video_id ON video_tutorial_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_feature_feedback_user_id ON feature_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_feedback_status ON feature_feedback(status);

-- Functions for automated ticket number generation
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_number = 'CU-' || LPAD(nextval('support_ticket_sequence')::text, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS support_ticket_sequence START 1000;

-- Trigger to auto-generate ticket numbers
DROP TRIGGER IF EXISTS trigger_generate_ticket_number ON support_tickets;
CREATE TRIGGER trigger_generate_ticket_number
    BEFORE INSERT ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION generate_ticket_number();

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
DROP TRIGGER IF EXISTS trigger_update_onboarding_progress_updated_at ON onboarding_progress;
CREATE TRIGGER trigger_update_onboarding_progress_updated_at
    BEFORE UPDATE ON onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trigger_update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_video_tutorial_progress_updated_at ON video_tutorial_progress;
CREATE TRIGGER trigger_update_video_tutorial_progress_updated_at
    BEFORE UPDATE ON video_tutorial_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER trigger_update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_feature_feedback_updated_at ON feature_feedback;
CREATE TRIGGER trigger_update_feature_feedback_updated_at
    BEFORE UPDATE ON feature_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS policies for user data security
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_tutorial_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_feedback ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY IF NOT EXISTS "Users can view own onboarding progress" ON onboarding_progress
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own onboarding progress" ON onboarding_progress
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own documentation usage" ON documentation_usage
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own documentation usage" ON documentation_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own help interactions" ON help_interactions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own help interactions" ON help_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own video progress" ON video_tutorial_progress
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own video progress" ON video_tutorial_progress
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own support tickets" ON support_tickets
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can create own support tickets" ON support_tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own support tickets" ON support_tickets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own ticket messages" ON support_ticket_messages
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM support_tickets st
        WHERE st.id = ticket_id AND st.user_id = auth.uid()
    ));
CREATE POLICY IF NOT EXISTS "Users can create own ticket messages" ON support_ticket_messages
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM support_tickets st
        WHERE st.id = ticket_id AND st.user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Users can view own feature feedback" ON feature_feedback
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can create own feature feedback" ON feature_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own feature feedback" ON feature_feedback
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies (for support staff)
CREATE POLICY IF NOT EXISTS "Admins can view all support tickets" ON support_tickets
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid() AND u.role = 'admin'
    ));

CREATE POLICY IF NOT EXISTS "Admins can update all support tickets" ON support_tickets
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid() AND u.role = 'admin'
    ));

-- Comments and documentation
COMMENT ON TABLE onboarding_progress IS 'Tracks user progress through guided onboarding tours';
COMMENT ON TABLE user_preferences IS 'Stores user personalization settings and preferences';
COMMENT ON TABLE documentation_usage IS 'Analytics for documentation and tutorial usage';
COMMENT ON TABLE help_interactions IS 'Tracks contextual help system interactions';
COMMENT ON TABLE video_tutorial_progress IS 'Progress tracking for video tutorials';
COMMENT ON TABLE support_tickets IS 'Customer support ticket management';
COMMENT ON TABLE support_ticket_messages IS 'Messages and updates for support tickets';
COMMENT ON TABLE feature_feedback IS 'User feedback and feature requests';

COMMENT ON COLUMN onboarding_progress.onboarding_version IS 'Version of onboarding tour (for A/B testing)';
COMMENT ON COLUMN onboarding_progress.completed_steps IS 'Array of completed step indices';
COMMENT ON COLUMN user_preferences.primary_goals IS 'Array of user-selected primary goals';
COMMENT ON COLUMN support_tickets.context IS 'JSON context including error details, page info, etc.';
COMMENT ON COLUMN support_tickets.ticket_number IS 'Human-friendly ticket identifier (e.g., CU-001234)';
COMMENT ON COLUMN feature_feedback.priority_vote IS 'Community voting score for feature priority';