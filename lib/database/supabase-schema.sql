-- CU-BEMS IoT Platform - Supabase Metadata Schema
-- Production-ready database schema for validation tracking and audit trails
-- Created: September 18, 2025

-- =============================================
-- CORE METADATA TABLES
-- =============================================

-- Validation Sessions: Track each analysis run
CREATE TABLE validation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_name VARCHAR(255) NOT NULL,
    dataset_version VARCHAR(100) NOT NULL,
    total_records BIGINT NOT NULL,
    data_quality_score DECIMAL(5,2),
    analysis_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    analysis_completed_at TIMESTAMPTZ,
    bmad_phase VARCHAR(20) CHECK (bmad_phase IN ('build', 'measure', 'analyze', 'decide')),
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validated Insights: Store all statistically validated business insights
CREATE TABLE validated_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES validation_sessions(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    metric_unit VARCHAR(50),
    validation_status VARCHAR(20) NOT NULL CHECK (validation_status IN ('validated', 'estimated', 'requires_more_data')),
    confidence_level DECIMAL(5,2) NOT NULL, -- 95.0 for 95% confidence
    p_value DECIMAL(10,8), -- Statistical significance
    sample_size INTEGER NOT NULL,
    standard_error DECIMAL(15,4),
    margin_of_error DECIMAL(15,4),
    confidence_interval_lower DECIMAL(15,2),
    confidence_interval_upper DECIMAL(15,2),
    calculation_method VARCHAR(255) NOT NULL,
    data_source VARCHAR(255) NOT NULL,
    baseline_value DECIMAL(15,2),
    trend_direction VARCHAR(20) CHECK (trend_direction IN ('increasing', 'decreasing', 'stable')),
    trend_rate DECIMAL(10,4),
    trend_significance DECIMAL(10,8),
    business_category VARCHAR(50) CHECK (business_category IN ('energy', 'maintenance', 'efficiency', 'cost', 'reliability')),
    severity VARCHAR(20) CHECK (severity IN ('info', 'warning', 'critical')),
    description TEXT,
    recommendation TEXT,
    business_impact TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Savings Scenarios: Track validated savings calculations
CREATE TABLE savings_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES validation_sessions(id) ON DELETE CASCADE,
    scenario_id VARCHAR(100) NOT NULL,
    scenario_name VARCHAR(255) NOT NULL,
    scenario_description TEXT,
    category VARCHAR(50) CHECK (category IN ('energy_optimization', 'maintenance_prevention', 'operational_efficiency')),
    annual_savings DECIMAL(15,2) NOT NULL,
    implementation_cost DECIMAL(15,2) NOT NULL,
    effort_level VARCHAR(20) CHECK (effort_level IN ('low', 'medium', 'high')),
    timeframe VARCHAR(100),
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high')),
    roi_percentage DECIMAL(8,2),
    payback_months DECIMAL(6,1),
    net_present_value DECIMAL(15,2),
    validation_status VARCHAR(20) NOT NULL CHECK (validation_status IN ('validated', 'estimated', 'requires_validation')),
    confidence_level DECIMAL(5,2) NOT NULL,
    confidence_interval_lower DECIMAL(15,2),
    confidence_interval_upper DECIMAL(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Savings Breakdown: Detailed breakdown of each savings component
CREATE TABLE savings_breakdown (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES savings_scenarios(id) ON DELETE CASCADE,
    component_name VARCHAR(255) NOT NULL,
    component_savings DECIMAL(15,2) NOT NULL,
    calculation_method VARCHAR(255) NOT NULL,
    data_source VARCHAR(255) NOT NULL,
    confidence_level DECIMAL(5,2) NOT NULL,
    percentage_of_total DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DATA QUALITY & MONITORING
-- =============================================

-- Data Quality Metrics: Track data quality over time
CREATE TABLE data_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES validation_sessions(id) ON DELETE CASCADE,
    data_source VARCHAR(255) NOT NULL,
    total_records BIGINT NOT NULL,
    valid_records BIGINT NOT NULL,
    invalid_records BIGINT NOT NULL,
    missing_values BIGINT DEFAULT 0,
    duplicate_records BIGINT DEFAULT 0,
    outlier_count BIGINT DEFAULT 0,
    quality_score DECIMAL(5,2) NOT NULL, -- 0-100
    completeness_score DECIMAL(5,2) NOT NULL,
    consistency_score DECIMAL(5,2) NOT NULL,
    accuracy_score DECIMAL(5,2) NOT NULL,
    quality_issues JSONB DEFAULT '[]', -- Array of quality issue descriptions
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Floor Performance Tracking: Track floor-by-floor performance
CREATE TABLE floor_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES validation_sessions(id) ON DELETE CASCADE,
    floor_number INTEGER NOT NULL,
    total_sensors INTEGER NOT NULL,
    avg_consumption DECIMAL(12,4) NOT NULL,
    normalized_consumption DECIMAL(12,4) NOT NULL,
    deviation_from_mean DECIMAL(12,4),
    z_score DECIMAL(8,4),
    outlier_status VARCHAR(20) CHECK (outlier_status IN ('normal', 'anomaly', 'critical_anomaly')),
    sample_size INTEGER NOT NULL,
    confidence_level DECIMAL(5,2) NOT NULL,
    efficiency_score DECIMAL(5,2),
    maintenance_priority VARCHAR(20) CHECK (maintenance_priority IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment Performance Tracking
CREATE TABLE equipment_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES validation_sessions(id) ON DELETE CASCADE,
    equipment_type VARCHAR(100) NOT NULL,
    sensor_count INTEGER NOT NULL,
    performance_score DECIMAL(5,2) NOT NULL,
    degradation_rate DECIMAL(8,4),
    failure_risk DECIMAL(5,2),
    maintenance_urgency VARCHAR(20) CHECK (maintenance_urgency IN ('low', 'medium', 'high', 'critical')),
    cost_impact_estimate DECIMAL(15,2),
    cost_confidence_lower DECIMAL(15,2),
    cost_confidence_upper DECIMAL(15,2),
    cost_validation_status VARCHAR(20) CHECK (cost_validation_status IN ('validated', 'estimated')),
    avg_power_consumption DECIMAL(12,4),
    reliability_percentage DECIMAL(5,2),
    failure_frequency DECIMAL(8,6),
    optimization_potential DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AUDIT TRAIL & CALCULATION TRACKING
-- =============================================

-- Calculation Audit Trail: Track every business calculation
CREATE TABLE calculation_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES validation_sessions(id) ON DELETE CASCADE,
    calculation_type VARCHAR(100) NOT NULL,
    calculation_name VARCHAR(255) NOT NULL,
    input_data JSONB NOT NULL, -- Store input parameters
    calculation_method VARCHAR(255) NOT NULL,
    statistical_method VARCHAR(255),
    result_value DECIMAL(15,2),
    result_unit VARCHAR(50),
    confidence_level DECIMAL(5,2),
    p_value DECIMAL(10,8),
    sample_size INTEGER,
    validation_status VARCHAR(20) CHECK (validation_status IN ('validated', 'estimated', 'failed')),
    error_message TEXT,
    execution_time_ms INTEGER,
    data_sources JSONB NOT NULL, -- Array of data sources used
    assumptions JSONB DEFAULT '[]', -- Array of assumptions made
    peer_reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hardcoded Value Replacement Tracking
CREATE TABLE hardcoded_replacements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_value DECIMAL(15,2) NOT NULL,
    original_location VARCHAR(500) NOT NULL, -- File path and line number
    replacement_method VARCHAR(255) NOT NULL,
    validated_value DECIMAL(15,2),
    validation_confidence DECIMAL(5,2),
    replacement_date TIMESTAMPTZ DEFAULT NOW(),
    validation_session_id UUID REFERENCES validation_sessions(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'replaced', 'validated', 'rejected')),
    notes TEXT,
    replaced_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- USER MANAGEMENT & PERMISSIONS
-- =============================================

-- User Profiles: Extended user information
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'viewer' CHECK (role IN ('viewer', 'analyst', 'admin', 'super_admin')),
    department VARCHAR(100),
    permissions JSONB DEFAULT '{}', -- Granular permissions object
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Access Log: Track who accessed what data
CREATE TABLE access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    session_id UUID REFERENCES validation_sessions(id),
    action VARCHAR(100) NOT NULL, -- 'view', 'calculate', 'export', etc.
    resource_type VARCHAR(100), -- 'insights', 'scenarios', 'audit', etc.
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CONFIGURATION & SETTINGS
-- =============================================

-- System Configuration: Store configurable parameters
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    config_type VARCHAR(50) NOT NULL, -- 'calculation_params', 'thresholds', 'rates', etc.
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration values
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
('energy_rate_usd_per_kwh', '0.12', 'calculation_params', 'Energy rate in USD per kWh for cost calculations'),
('demand_charge_usd_per_kw_month', '15.0', 'calculation_params', 'Demand charge rate in USD per kW per month'),
('maintenance_base_cost_usd', '3500', 'calculation_params', 'Base maintenance cost per equipment unit in USD'),
('confidence_level_threshold', '95.0', 'validation_params', 'Minimum confidence level for validated insights'),
('p_value_threshold', '0.05', 'validation_params', 'Maximum p-value for statistical significance'),
('sample_size_minimum', '30', 'validation_params', 'Minimum sample size for statistical analysis'),
('data_quality_threshold', '95.0', 'quality_params', 'Minimum data quality score for reliable analysis');

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Primary lookup indexes
CREATE INDEX idx_validation_sessions_status ON validation_sessions(status);
CREATE INDEX idx_validation_sessions_created_at ON validation_sessions(created_at);
CREATE INDEX idx_validated_insights_session_id ON validated_insights(session_id);
CREATE INDEX idx_validated_insights_metric_name ON validated_insights(metric_name);
CREATE INDEX idx_validated_insights_validation_status ON validated_insights(validation_status);
CREATE INDEX idx_savings_scenarios_session_id ON savings_scenarios(session_id);
CREATE INDEX idx_savings_scenarios_category ON savings_scenarios(category);
CREATE INDEX idx_floor_performance_session_id ON floor_performance(session_id);
CREATE INDEX idx_floor_performance_floor_number ON floor_performance(floor_number);
CREATE INDEX idx_equipment_performance_session_id ON equipment_performance(session_id);
CREATE INDEX idx_equipment_performance_type ON equipment_performance(equipment_type);
CREATE INDEX idx_calculation_audit_session_id ON calculation_audit(session_id);
CREATE INDEX idx_calculation_audit_type ON calculation_audit(calculation_type);
CREATE INDEX idx_hardcoded_replacements_status ON hardcoded_replacements(status);
CREATE INDEX idx_access_log_user_id ON access_log(user_id);
CREATE INDEX idx_access_log_accessed_at ON access_log(accessed_at);

-- Composite indexes for common queries
CREATE INDEX idx_insights_session_status ON validated_insights(session_id, validation_status);
CREATE INDEX idx_scenarios_session_category ON savings_scenarios(session_id, category);
CREATE INDEX idx_audit_session_type ON calculation_audit(session_id, calculation_type);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE validation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE validated_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardcoded_replacements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for validation_sessions
CREATE POLICY "Users can view validation sessions" ON validation_sessions
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM user_profiles
            WHERE is_active = TRUE
            AND role IN ('analyst', 'admin', 'super_admin')
        )
    );

CREATE POLICY "Analysts can create validation sessions" ON validation_sessions
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM user_profiles
            WHERE is_active = TRUE
            AND role IN ('analyst', 'admin', 'super_admin')
        )
    );

-- RLS Policies for validated_insights
CREATE POLICY "Users can view validated insights" ON validated_insights
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM user_profiles
            WHERE is_active = TRUE
        )
    );

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM user_profiles
            WHERE is_active = TRUE
            AND role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for system_config
CREATE POLICY "Admins can manage system config" ON system_config
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM user_profiles
            WHERE is_active = TRUE
            AND role IN ('admin', 'super_admin')
        )
    );

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_validation_sessions_updated_at BEFORE UPDATE ON validation_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log access events
CREATE OR REPLACE FUNCTION log_access_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO access_log (user_id, session_id, action, resource_type, resource_id)
    VALUES (auth.uid(), NEW.session_id, 'create', TG_TABLE_NAME, NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply access logging triggers
CREATE TRIGGER log_insights_access AFTER INSERT ON validated_insights FOR EACH ROW EXECUTE FUNCTION log_access_event();
CREATE TRIGGER log_scenarios_access AFTER INSERT ON savings_scenarios FOR EACH ROW EXECUTE FUNCTION log_access_event();

-- Function to calculate data quality score
CREATE OR REPLACE FUNCTION calculate_data_quality_score(
    p_total_records BIGINT,
    p_valid_records BIGINT,
    p_missing_values BIGINT DEFAULT 0,
    p_duplicate_records BIGINT DEFAULT 0,
    p_outlier_count BIGINT DEFAULT 0
) RETURNS DECIMAL(5,2) AS $$
DECLARE
    completeness_score DECIMAL(5,2);
    validity_score DECIMAL(5,2);
    consistency_score DECIMAL(5,2);
    final_score DECIMAL(5,2);
BEGIN
    -- Completeness: percentage of non-missing values
    completeness_score := ((p_total_records - p_missing_values)::DECIMAL / p_total_records) * 100;

    -- Validity: percentage of valid records
    validity_score := (p_valid_records::DECIMAL / p_total_records) * 100;

    -- Consistency: penalize duplicates and excessive outliers
    consistency_score := 100 -
        (p_duplicate_records::DECIMAL / p_total_records * 100) -
        (GREATEST(0, p_outlier_count - p_total_records * 0.05)::DECIMAL / p_total_records * 100);

    -- Weighted average (validity 50%, completeness 30%, consistency 20%)
    final_score := (validity_score * 0.5) + (completeness_score * 0.3) + (consistency_score * 0.2);

    RETURN GREATEST(0, LEAST(100, final_score));
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- Latest validation session summary
CREATE VIEW latest_validation_summary AS
SELECT
    vs.id,
    vs.session_name,
    vs.dataset_version,
    vs.total_records,
    vs.data_quality_score,
    vs.bmad_phase,
    vs.status,
    vs.analysis_started_at,
    vs.analysis_completed_at,
    COUNT(vi.id) as insights_count,
    COUNT(ss.id) as scenarios_count,
    SUM(ss.annual_savings) as total_annual_savings,
    AVG(vi.confidence_level) as avg_confidence_level
FROM validation_sessions vs
LEFT JOIN validated_insights vi ON vs.id = vi.session_id
LEFT JOIN savings_scenarios ss ON vs.id = ss.session_id
WHERE vs.status = 'completed'
GROUP BY vs.id, vs.session_name, vs.dataset_version, vs.total_records,
         vs.data_quality_score, vs.bmad_phase, vs.status,
         vs.analysis_started_at, vs.analysis_completed_at
ORDER BY vs.analysis_completed_at DESC;

-- Hardcoded replacement progress
CREATE VIEW hardcoded_replacement_progress AS
SELECT
    COUNT(*) as total_hardcoded_values,
    COUNT(*) FILTER (WHERE status = 'replaced') as replaced_count,
    COUNT(*) FILTER (WHERE status = 'validated') as validated_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'replaced')::DECIMAL / COUNT(*) * 100, 1) as replacement_progress,
    ROUND(COUNT(*) FILTER (WHERE status = 'validated')::DECIMAL / COUNT(*) * 100, 1) as validation_progress
FROM hardcoded_replacements;

-- COMMENT ON SCHEMA
COMMENT ON TABLE validation_sessions IS 'Tracks each BMAD analysis run with metadata and timing';
COMMENT ON TABLE validated_insights IS 'Stores statistically validated business insights with confidence metrics';
COMMENT ON TABLE savings_scenarios IS 'Tracks validated savings opportunities with ROI calculations';
COMMENT ON TABLE calculation_audit IS 'Complete audit trail of all business calculations for transparency';
COMMENT ON TABLE hardcoded_replacements IS 'Tracks replacement of hardcoded values with data-driven calculations';