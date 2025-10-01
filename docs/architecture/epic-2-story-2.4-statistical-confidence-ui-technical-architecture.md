# Epic 2 Story 2.4: Statistical Confidence UI Components - Technical Architecture

## Architecture Overview

This document defines the technical architecture for implementing statistical confidence UI components that enhance the existing statistical validation framework from Stories 2.1-2.3. The system will provide professional-grade statistical visualization, educational content, and Professional tier differentiation while maintaining seamless integration with existing dashboard components.

## Executive Summary

**Business Context**: Facility managers need clear, professional statistical displays to support regulatory compliance, audit requirements, and executive presentations. The enhanced UI components build upon the solid foundation of Statistical validation from Stories 2.1-2.3.

**Technical Approach**: Component-based architecture using React/TypeScript with comprehensive accessibility support, professional tier gating, and educational content system.

**Key Deliverables**:
- Enhanced statistical visualization components with confidence intervals and p-value displays
- Educational content system with plain English explanations
- Professional tier advanced statistical features
- Integration with existing Executive Dashboard and Time-Series Analytics
- Performance optimized and accessibility compliant implementation

## Current Foundation Analysis

### Story 2.1: Executive Dashboard Foundation
- **Existing**: `/Users/chrism/CU-BEMS IoT Transmission Failure Analysis Platform/app/dashboard/components/StatisticalMetricCard.tsx`
- **Interface**: `ConfidenceInterval` with value, bounds, p_value, sample_size
- **Features**: Basic confidence interval display, significance badges, methodology access
- **Professional Gating**: Implemented with upgrade prompts and Crown icons

### Story 2.2: Time-Series Analytics Integration
- **Existing**: `/Users/chrism/CU-BEMS IoT Transmission Failure Analysis Platform/app/dashboard/time-series/page.tsx`
- **Framework**: Recharts with custom tooltips and anomaly detection
- **Data Structure**: TimeSeriesDataPoint with confidence and anomaly flags
- **Visualization**: Multi-sensor charts with interactive controls

### Story 2.3: Export and Professional Features
- **Existing**: `/Users/chrism/CU-BEMS IoT Transmission Failure Analysis Platform/src/components/export/ExportModal.tsx`
- **Professional Gating**: Subscription tier validation via `/Users/chrism/CU-BEMS IoT Transmission Failure Analysis Platform/src/hooks/useSubscription.ts`
- **Templates**: Executive, technical, compliance, raw data export options

### Statistical Validation Framework
- **Core Logic**: `/Users/chrism/CU-BEMS IoT Transmission Failure Analysis Platform/src/lib/algorithms/statistical-validation.ts`
- **Features**: Wilson Score intervals, p-value calculations, Bonferroni correction
- **Bangkok Dataset**: 124.9M data points, 18-month validation period

## Component Architecture Design

### 1. Core Statistical UI Components

```typescript
// Enhanced Statistical Display System
interface StatisticalUIComponent {
  // Confidence Interval Visualization
  ConfidenceIntervalDisplay: {
    component: 'ConfidenceIntervalDisplay.tsx'
    props: {
      interval: EnhancedConfidenceInterval
      visualType: 'error_bars' | 'shaded_region' | 'range_indicator'
      confidenceLevel: number
      showMethodology?: boolean
    }
    features: [
      'Interactive error bars',
      'Shaded confidence regions',
      'Range indicators with markers',
      'Hover explanations'
    ]
  }

  // P-Value and Significance Display
  PValueIndicator: {
    component: 'PValueIndicator.tsx'
    props: {
      pValue: number
      significanceLevel: number
      showPlainEnglish: boolean
      context: 'facility_management' | 'academic' | 'regulatory'
    }
    features: [
      'Color-coded significance badges',
      'Plain English interpretation',
      'Context-aware explanations',
      'Sample size context'
    ]
  }

  // Interactive Educational System
  StatisticalEducation: {
    components: [
      'StatisticalTooltip.tsx',
      'MethodologyModal.tsx',
      'PlainEnglishExplainer.tsx',
      'StatisticalGlossary.tsx'
    ]
    features: [
      'Context-aware help',
      'Interactive tutorials',
      'Searchable glossary',
      'Progressive disclosure'
    ]
  }
}
```

### 2. Data Structure Definitions

```typescript
// Enhanced Confidence Interval with Educational Metadata
interface EnhancedConfidenceInterval {
  // Core statistical data (extends existing ConfidenceInterval)
  value: number
  lower: number
  upper: number
  confidence_level: number
  p_value: number
  sample_size: number

  // Enhanced visualization properties
  visual_representation: 'error_bars' | 'shaded_region' | 'range_indicator'
  significance_level: number

  // Effect size and practical significance
  effect_size: {
    value: number
    interpretation: 'small' | 'medium' | 'large'
    practical_significance: boolean
    context: string
  }

  // Sample size and power analysis
  sample_size_analysis: {
    n: number
    power: number
    minimum_detectable_effect: number
    adequacy: 'adequate' | 'marginal' | 'inadequate'
  }

  // Methodology and validation
  methodology: {
    statistical_test: string
    assumptions_met: boolean
    correction_applied?: string
    reference_citation: string
    bangkok_dataset_context: string
  }

  // Educational content
  educational_content: {
    plain_english_summary: string
    key_takeaway: string
    practical_meaning: string
    regulatory_context?: string
  }
}

// User Statistical Display Preferences
interface StatisticalDisplaySettings {
  user_id: string
  confidence_level: 90 | 95 | 99  // Professional tier gets custom levels
  show_p_values: boolean
  show_effect_sizes: boolean
  show_sample_sizes: boolean
  plain_english_explanations: boolean
  methodology_detail_level: 'basic' | 'intermediate' | 'advanced'

  // Visual preferences
  visual_style: {
    error_bar_style: 'standard' | 'professional'
    significance_color_scheme: 'standard' | 'colorblind_friendly'
    chart_annotations: boolean
    interactive_explanations: boolean
  }

  // Professional tier preferences
  professional_features: {
    custom_confidence_levels: boolean
    advanced_statistical_tests: boolean
    methodology_consulting: boolean
    audit_trail_access: boolean
  }
}

// Statistical Education Content
interface EducationalContent {
  concept_id: string
  title: string
  plain_english_explanation: string
  technical_explanation: string
  practical_example: string
  facility_management_context: string
  regulatory_relevance?: string

  // Interactive elements
  interactive_tutorial?: {
    steps: Array<{
      title: string
      explanation: string
      visualization?: string
      user_action?: string
    }>
  }

  // References and validation
  academic_references: string[]
  bangkok_dataset_examples: string[]
  last_reviewed: string
  expert_validated: boolean
}
```

### 3. Component Implementation Specifications

#### 3.1 ConfidenceIntervalDisplay Component

```typescript
// File: /src/components/statistical/ConfidenceIntervalDisplay.tsx
interface ConfidenceIntervalDisplayProps {
  interval: EnhancedConfidenceInterval
  visualType: 'error_bars' | 'shaded_region' | 'range_indicator'
  confidenceLevel?: number
  size?: 'compact' | 'standard' | 'detailed'
  showMethodology?: boolean
  className?: string
}

const ConfidenceIntervalDisplay: React.FC<ConfidenceIntervalDisplayProps> = ({
  interval,
  visualType,
  confidenceLevel = 95,
  size = 'standard',
  showMethodology = false,
  className
}) => {
  const { preferences } = useStatisticalPreferences()
  const { subscription } = useSubscription()

  // Visual rendering based on type
  const renderErrorBars = () => { /* Error bar implementation */ }
  const renderShadedRegion = () => { /* Shaded region implementation */ }
  const renderRangeIndicator = () => { /* Range indicator implementation */ }

  return (
    <div className={`confidence-interval-display ${className}`}>
      {/* Visual representation */}
      {visualType === 'error_bars' && renderErrorBars()}
      {visualType === 'shaded_region' && renderShadedRegion()}
      {visualType === 'range_indicator' && renderRangeIndicator()}

      {/* Educational overlay */}
      {preferences.plain_english_explanations && (
        <StatisticalTooltip content={interval.educational_content} />
      )}

      {/* Professional features */}
      {subscription.isProfessional && showMethodology && (
        <MethodologyLink interval={interval} />
      )}
    </div>
  )
}
```

#### 3.2 PValueIndicator Component

```typescript
// File: /src/components/statistical/PValueIndicator.tsx
interface PValueIndicatorProps {
  pValue: number
  significanceLevel: number
  sampleSize: number
  context: 'executive' | 'technical' | 'regulatory'
  showPlainEnglish?: boolean
  size?: 'compact' | 'standard'
}

const PValueIndicator: React.FC<PValueIndicatorProps> = ({
  pValue,
  significanceLevel,
  sampleSize,
  context,
  showPlainEnglish = true,
  size = 'standard'
}) => {
  const getSignificanceLevel = (p: number) => {
    if (p < 0.001) return {
      level: 'highly_significant',
      color: 'text-green-700 bg-green-100',
      badge: 'p < 0.001',
      interpretation: 'Extremely strong evidence'
    }
    if (p < 0.01) return {
      level: 'very_significant',
      color: 'text-green-600 bg-green-50',
      badge: 'p < 0.01',
      interpretation: 'Very strong evidence'
    }
    if (p < 0.05) return {
      level: 'significant',
      color: 'text-blue-600 bg-blue-50',
      badge: 'p < 0.05',
      interpretation: 'Strong evidence'
    }
    return {
      level: 'not_significant',
      color: 'text-gray-600 bg-gray-50',
      badge: 'n.s.',
      interpretation: 'Insufficient evidence'
    }
  }

  const significance = getSignificanceLevel(pValue)

  return (
    <div className={`p-value-indicator ${size}`}>
      {/* Significance Badge */}
      <span className={`significance-badge ${significance.color}`}>
        <Info className="w-3 h-3 mr-1" />
        {significance.badge}
      </span>

      {/* Plain English Explanation */}
      {showPlainEnglish && (
        <div className="plain-english-explanation">
          <p className="text-sm text-gray-700">
            {significance.interpretation} for this finding
          </p>
          <p className="text-xs text-gray-500">
            Based on {sampleSize.toLocaleString()} data points
          </p>
        </div>
      )}

      {/* Context-specific interpretation */}
      {context === 'executive' && (
        <ExecutiveInterpretation pValue={pValue} />
      )}
    </div>
  )
}
```

#### 3.3 Statistical Education System

```typescript
// File: /src/components/statistical/StatisticalEducation.tsx
interface StatisticalEducationProps {
  concept: string
  context: 'dashboard' | 'chart' | 'modal'
  userLevel: 'beginner' | 'intermediate' | 'advanced'
}

const StatisticalEducation: React.FC<StatisticalEducationProps> = ({
  concept,
  context,
  userLevel
}) => {
  const [showExplanation, setShowExplanation] = useState(false)
  const [educationalContent, setEducationalContent] = useState<EducationalContent | null>(null)

  useEffect(() => {
    loadEducationalContent(concept, userLevel)
  }, [concept, userLevel])

  return (
    <>
      {/* Help Trigger */}
      <button
        onClick={() => setShowExplanation(true)}
        className="educational-help-trigger"
        aria-label={`Learn about ${concept}`}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Educational Modal */}
      {showExplanation && educationalContent && (
        <StatisticalEducationModal
          content={educationalContent}
          onClose={() => setShowExplanation(false)}
          context={context}
        />
      )}
    </>
  )
}
```

## Integration Strategy

### 4.1 Executive Dashboard Enhancement

**Target File**: `/Users/chrism/CU-BEMS IoT Transmission Failure Analysis Platform/app/dashboard/components/StatisticalMetricCard.tsx`

**Enhancement Strategy**:
1. **Extend existing StatisticalMetricCard**: Add enhanced confidence interval visualization while preserving current functionality
2. **Integrate educational tooltips**: Add context-aware help system without cluttering existing UI
3. **Professional tier features**: Enhance existing professional gating with advanced statistical controls

```typescript
// Enhanced StatisticalMetricCard Integration
const EnhancedStatisticalMetricCard: React.FC<StatisticalMetricCardProps> = ({
  // Existing props
  title,
  confidence_interval,
  unit,
  category,
  isProfessionalFeature = false,
  showUpgradePrompt,
  // New enhanced props
  showAdvancedFeatures = false,
  educationalLevel = 'basic'
}) => {
  const { preferences } = useStatisticalPreferences()
  const { subscription } = useSubscription()

  // Preserve existing professional gating logic
  if (isProfessionalFeature && showUpgradePrompt && !subscription.isProfessional) {
    return <ExistingUpgradePrompt />
  }

  return (
    <div className="enhanced-statistical-metric-card">
      {/* Existing header with educational enhancement */}
      <div className="card-header">
        <h3>{title}</h3>
        <StatisticalEducation
          concept="confidence_interval"
          context="dashboard"
          userLevel={educationalLevel}
        />
      </div>

      {/* Enhanced confidence interval display */}
      <ConfidenceIntervalDisplay
        interval={confidence_interval}
        visualType={preferences.visual_style.error_bar_style === 'professional' ? 'error_bars' : 'range_indicator'}
        showMethodology={subscription.isProfessional && showAdvancedFeatures}
      />

      {/* Enhanced p-value indicator */}
      <PValueIndicator
        pValue={confidence_interval.p_value}
        significanceLevel={0.05}
        sampleSize={confidence_interval.sample_size}
        context="executive"
        showPlainEnglish={preferences.plain_english_explanations}
      />

      {/* Professional tier advanced features */}
      {subscription.isProfessional && showAdvancedFeatures && (
        <AdvancedStatisticalFeatures interval={confidence_interval} />
      )}
    </div>
  )
}
```

### 4.2 Time-Series Analytics Integration

**Target File**: `/Users/chrism/CU-BEMS IoT Transmission Failure Analysis Platform/app/dashboard/time-series/page.tsx`

**Enhancement Strategy**:
1. **Confidence interval overlays**: Add shaded regions and error bars to existing Recharts components
2. **Interactive statistical tooltips**: Enhance existing CustomTooltip with statistical significance information
3. **Anomaly confidence display**: Improve existing anomaly detection with statistical context

```typescript
// Enhanced Time-Series with Statistical Confidence
const EnhancedTimeSeriesChart: React.FC = () => {
  const { preferences } = useStatisticalPreferences()

  const CustomStatisticalTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null

    const dataPoint = payload[0]?.payload

    return (
      <div className="statistical-tooltip">
        {/* Existing tooltip content */}
        <ExistingTooltipContent />

        {/* Enhanced statistical information */}
        {dataPoint?.confidence && (
          <div className="confidence-info">
            <p className="text-sm font-medium">Statistical Confidence</p>
            <ConfidenceIntervalDisplay
              interval={dataPoint.confidence}
              visualType="compact_indicator"
              size="compact"
            />
          </div>
        )}

        {/* Anomaly statistical context */}
        {dataPoint?.anomaly && (
          <div className="anomaly-statistical-context">
            <PValueIndicator
              pValue={dataPoint.anomaly.pValue}
              significanceLevel={0.01}
              sampleSize={dataPoint.anomaly.sampleSize}
              context="technical"
              size="compact"
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <ResponsiveContainer>
      <LineChart data={timeSeriesData}>
        {/* Existing chart elements */}

        {/* Confidence interval shading */}
        {preferences.show_confidence_intervals && (
          <ReferenceArea
            x1={confidenceBounds.lower}
            x2={confidenceBounds.upper}
            fillOpacity={0.2}
            fill="#3B82F6"
            stroke="none"
          />
        )}

        {/* Enhanced tooltip */}
        <Tooltip content={<CustomStatisticalTooltip />} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

## Professional Tier Differentiation

### 5.1 Advanced Statistical Features

**Professional-Only Components**:
- `AdvancedConfidenceLevelControls.tsx`: Custom confidence level selection (90%, 95%, 99%, custom)
- `MultipleComparisonCorrection.tsx`: Bonferroni, Benjamini-Hochberg corrections
- `StatisticalConsultingTooltips.tsx`: Best practice recommendations
- `ValidationCertificate.tsx`: Audit documentation generator

### 5.2 Feature Gating Implementation

```typescript
// File: /src/hooks/useStatisticalFeatures.ts
export const useStatisticalFeatures = () => {
  const { subscription } = useSubscription()

  const checkStatisticalFeatureAccess = (feature: StatisticalFeature): FeatureAccess => {
    const baseFeatures = [
      'basic_confidence_intervals',
      'p_value_display',
      'plain_english_explanations',
      'basic_methodology_access'
    ]

    const professionalFeatures = [
      'custom_confidence_levels',
      'advanced_statistical_tests',
      'multiple_comparison_correction',
      'statistical_consulting',
      'validation_certificates',
      'detailed_audit_trails',
      'methodology_exports'
    ]

    if (baseFeatures.includes(feature)) {
      return { canAccess: true }
    }

    if (professionalFeatures.includes(feature)) {
      if (subscription.isProfessional) {
        return { canAccess: true }
      }
      return {
        canAccess: false,
        message: `${feature} requires Professional subscription`,
        upgradeRequired: true
      }
    }

    return { canAccess: false, message: 'Unknown feature' }
  }

  return { checkStatisticalFeatureAccess }
}
```

## Performance Requirements

### 6.1 Performance Specifications

**Load Time Requirements**:
- Initial statistical component render: < 100ms
- Confidence interval calculations: < 50ms
- Educational tooltip display: < 25ms
- Methodology modal loading: < 500ms
- Statistical preference updates: < 200ms

**Memory Usage**:
- Statistical education content: < 2MB cached
- Confidence interval calculations: < 1MB working memory
- User preference storage: < 100KB per user

**Network Optimization**:
- Educational content lazy loading
- Statistical calculation caching (5-minute TTL)
- Compressed methodology documentation
- Progressive statistical feature loading

### 6.2 Performance Implementation

```typescript
// File: /src/lib/statistical/performance.ts
export class StatisticalPerformanceManager {
  private calculationCache = new Map<string, CachedResult>()
  private educationalContentCache = new Map<string, EducationalContent>()

  async getConfidenceInterval(
    data: StatisticalData,
    cacheKey: string
  ): Promise<EnhancedConfidenceInterval> {
    // Check cache first
    const cached = this.calculationCache.get(cacheKey)
    if (cached && this.isValidCache(cached)) {
      return cached.result
    }

    // Perform calculation
    const result = await this.calculateConfidenceInterval(data)

    // Cache result
    this.calculationCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000 // 5 minutes
    })

    return result
  }

  async preloadEducationalContent(concepts: string[]): Promise<void> {
    // Lazy load educational content in background
    const loadPromises = concepts.map(concept =>
      this.loadEducationalContent(concept)
    )
    await Promise.all(loadPromises)
  }
}
```

## Accessibility Compliance

### 7.1 Accessibility Requirements

**WCAG 2.1 AA Compliance**:
- Color contrast ratios ≥ 4.5:1 for statistical indicators
- Keyboard navigation for all interactive elements
- Screen reader support with proper ARIA labels
- Alternative text for statistical visualizations
- High contrast mode support

**Statistical Visualization Accessibility**:
- Error bars with textual descriptions
- Confidence intervals with numerical ranges
- P-value significance accessible to screen readers
- Statistical tooltips navigable via keyboard

### 7.2 Accessibility Implementation

```typescript
// File: /src/components/statistical/accessibility.tsx
interface AccessibleStatisticalDisplayProps {
  interval: EnhancedConfidenceInterval
  visualType: string
}

const AccessibleConfidenceInterval: React.FC<AccessibleStatisticalDisplayProps> = ({
  interval,
  visualType
}) => {
  const accessibilityDescription = `
    Statistical confidence: ${interval.confidence_level}% confident
    the true value is between ${interval.lower.toFixed(2)} and ${interval.upper.toFixed(2)}.
    Point estimate: ${interval.value.toFixed(2)}.
    Statistical significance: ${interval.p_value < 0.05 ? 'significant' : 'not significant'}
    with p-value ${interval.p_value.toFixed(3)}.
    Based on ${interval.sample_size.toLocaleString()} data points.
  `

  return (
    <div
      className="accessible-confidence-interval"
      role="img"
      aria-label={accessibilityDescription}
      tabIndex={0}
    >
      {/* Visual representation */}
      <VisualConfidenceInterval interval={interval} type={visualType} />

      {/* Screen reader table */}
      <table className="sr-only" role="presentation">
        <caption>Statistical confidence interval details</caption>
        <tbody>
          <tr>
            <td>Point Estimate:</td>
            <td>{interval.value.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Lower Bound:</td>
            <td>{interval.lower.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Upper Bound:</td>
            <td>{interval.upper.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Confidence Level:</td>
            <td>{interval.confidence_level}%</td>
          </tr>
          <tr>
            <td>P-Value:</td>
            <td>{interval.p_value.toFixed(3)}</td>
          </tr>
          <tr>
            <td>Sample Size:</td>
            <td>{interval.sample_size.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      {/* Keyboard navigation support */}
      <div className="keyboard-help sr-only focus:not-sr-only">
        Press Enter to view detailed methodology
      </div>
    </div>
  )
}
```

## Database Schema Design

### 8.1 Statistical Preferences Schema

```sql
-- User statistical display preferences
CREATE TABLE user_statistical_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,

    -- Display preferences
    confidence_level INTEGER DEFAULT 95 CHECK (confidence_level IN (90, 95, 99)),
    show_p_values BOOLEAN DEFAULT true,
    show_effect_sizes BOOLEAN DEFAULT true,
    show_sample_sizes BOOLEAN DEFAULT true,
    plain_english_explanations BOOLEAN DEFAULT true,
    methodology_detail_level VARCHAR(20) DEFAULT 'basic' CHECK (methodology_detail_level IN ('basic', 'intermediate', 'advanced')),

    -- Visual style preferences
    visual_preferences JSONB DEFAULT '{
        "error_bar_style": "standard",
        "significance_color_scheme": "standard",
        "chart_annotations": true,
        "interactive_explanations": true
    }',

    -- Professional tier preferences (only accessible with professional subscription)
    professional_preferences JSONB DEFAULT '{
        "custom_confidence_levels": false,
        "advanced_statistical_tests": false,
        "methodology_consulting": false,
        "audit_trail_access": false
    }',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Statistical audit trail for compliance
CREATE TABLE statistical_audit_trails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES auth.users(id),

    -- Calculation metadata
    calculation_timestamp TIMESTAMPTZ DEFAULT NOW(),
    statistical_method VARCHAR(100) NOT NULL,
    confidence_level INTEGER NOT NULL,

    -- Data sources
    data_sources JSONB NOT NULL,
    sample_size INTEGER NOT NULL,
    data_quality_score DECIMAL(3,2),

    -- Statistical results
    statistical_results JSONB NOT NULL,
    validation_steps JSONB NOT NULL,

    -- Bangkok dataset integration
    bangkok_dataset_integration JSONB NOT NULL DEFAULT '{
        "dataset_version": "v1.2",
        "validation_period": "2018-01-01 to 2019-06-30",
        "academic_validation": true,
        "university_approval": true
    }',

    -- Export and access tracking
    methodology_export_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Educational content management
CREATE TABLE statistical_educational_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id VARCHAR(100) UNIQUE NOT NULL,

    -- Content
    title VARCHAR(200) NOT NULL,
    plain_english_explanation TEXT NOT NULL,
    technical_explanation TEXT NOT NULL,
    practical_example TEXT NOT NULL,
    facility_management_context TEXT NOT NULL,
    regulatory_relevance TEXT,

    -- Metadata
    difficulty_level VARCHAR(20) DEFAULT 'basic' CHECK (difficulty_level IN ('basic', 'intermediate', 'advanced')),
    bangkok_dataset_examples TEXT[],
    academic_references TEXT[],

    -- Interactive content
    interactive_tutorial JSONB,

    -- Quality assurance
    expert_validated BOOLEAN DEFAULT false,
    last_reviewed TIMESTAMPTZ,
    review_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_statistical_preferences_user_id ON user_statistical_preferences(user_id);
CREATE INDEX idx_audit_trails_metric_user ON statistical_audit_trails(metric_id, user_id);
CREATE INDEX idx_audit_trails_timestamp ON statistical_audit_trails(calculation_timestamp);
CREATE INDEX idx_audit_trails_method ON statistical_audit_trails(statistical_method);
CREATE INDEX idx_educational_content_concept ON statistical_educational_content(concept_id);
CREATE INDEX idx_educational_content_difficulty ON statistical_educational_content(difficulty_level);

-- Row Level Security
ALTER TABLE user_statistical_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistical_audit_trails ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own statistical preferences"
ON user_statistical_preferences FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own audit trails"
ON statistical_audit_trails FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit trails"
ON statistical_audit_trails FOR INSERT WITH CHECK (true);

CREATE POLICY "Educational content is publicly readable"
ON statistical_educational_content FOR SELECT USING (true);
```

## API Specifications

### 9.1 Statistical Enhancement APIs

```typescript
// File: /app/api/statistical/preferences/route.ts
export async function GET(request: NextRequest) {
  // Get user statistical display preferences
}

export async function PUT(request: NextRequest) {
  // Update user statistical display preferences
  // Validate professional tier access for advanced features
}

// File: /app/api/statistical/confidence-intervals/route.ts
export async function POST(request: NextRequest) {
  const { metric_id, data, confidence_level } = await request.json()

  // Enhanced confidence interval calculation
  const result = await calculateEnhancedConfidenceInterval(data, {
    confidence_level,
    include_educational_content: true,
    context: 'facility_management'
  })

  // Create audit trail
  await createAuditTrail(metric_id, result, request)

  return NextResponse.json(result)
}

// File: /app/api/statistical/education/route.ts
export async function GET(request: NextRequest) {
  const concept = request.nextUrl.searchParams.get('concept')
  const level = request.nextUrl.searchParams.get('level') || 'basic'

  // Get educational content with Bangkok dataset context
  const content = await getEducationalContent(concept, level)

  return NextResponse.json(content)
}

// File: /app/api/statistical/methodology-export/route.ts
export async function POST(request: NextRequest) {
  const { metric_id, format } = await request.json()

  // Professional tier validation
  const session = await getServerSession(authOptions)
  if (session?.user?.subscriptionTier !== 'PROFESSIONAL') {
    return NextResponse.json({ error: 'Professional subscription required' }, { status: 403 })
  }

  // Generate methodology documentation
  const methodology = await generateMethodologyDocumentation(metric_id, format)

  return NextResponse.json(methodology)
}
```

## File Structure and Organization

```
src/
├── components/statistical/
│   ├── core/
│   │   ├── ConfidenceIntervalDisplay.tsx     # Enhanced confidence interval visualization
│   │   ├── PValueIndicator.tsx               # P-value display with significance badges
│   │   ├── UncertaintyVisualization.tsx      # Error bars and confidence regions
│   │   ├── StatisticalBadge.tsx              # Standardized significance badges
│   │   └── StatisticalMetricEnhanced.tsx     # Enhanced version of existing component
│   ├── educational/
│   │   ├── StatisticalTooltip.tsx            # Educational hover explanations
│   │   ├── MethodologyModal.tsx              # Detailed methodology documentation
│   │   ├── PlainEnglishExplainer.tsx         # Accessible statistical explanations
│   │   ├── StatisticalGlossary.tsx           # Searchable statistical terms
│   │   ├── InteractiveStatsTutorial.tsx      # Guided tutorial system
│   │   └── ContextualHelp.tsx                # Context-aware help system
│   ├── professional/
│   │   ├── AdvancedStatisticalControls.tsx   # Professional confidence level controls
│   │   ├── MultipleComparisonCorrection.tsx  # Advanced statistical corrections
│   │   ├── StatisticalConsultingTooltips.tsx # Best practice recommendations
│   │   ├── ValidationCertificate.tsx         # Audit documentation generator
│   │   └── AuditTrailViewer.tsx              # Statistical validation process display
│   ├── accessibility/
│   │   ├── AccessibleConfidenceInterval.tsx  # Screen reader compatible displays
│   │   ├── HighContrastStatistics.tsx        # High contrast mode components
│   │   └── KeyboardNavigableStats.tsx        # Keyboard navigation support
│   └── index.ts                              # Barrel exports
│
├── hooks/statistical/
│   ├── useStatisticalPreferences.ts          # User preference management
│   ├── useConfidenceIntervals.ts             # Enhanced confidence interval calculations
│   ├── useStatisticalEducation.ts            # Educational content management
│   ├── useStatisticalFeatures.ts             # Feature access control
│   ├── useAuditTrail.ts                      # Audit trail tracking
│   └── useMethodologyExport.ts               # Professional methodology exports
│
├── lib/statistical/
│   ├── calculations/
│   │   ├── enhanced-confidence-intervals.ts   # Extended statistical calculations
│   │   ├── effect-size-analysis.ts           # Effect size calculations
│   │   ├── sample-size-analysis.ts           # Power analysis and adequacy
│   │   └── multiple-comparisons.ts           # Bonferroni, B-H corrections
│   ├── education/
│   │   ├── content-manager.ts                # Educational content system
│   │   ├── plain-english-generator.ts        # Automated explanations
│   │   └── context-aware-help.ts             # Context-sensitive guidance
│   ├── performance/
│   │   ├── calculation-cache.ts              # Statistical calculation caching
│   │   ├── lazy-loading.ts                   # Educational content lazy loading
│   │   └── performance-monitor.ts            # Performance tracking
│   └── validation/
│       ├── accuracy-validation.ts            # Statistical accuracy validation
│       ├── bangkok-dataset-integration.ts     # Dataset-specific validations
│       └── methodology-validator.ts          # Methodology compliance checking
│
├── types/statistical/
│   ├── enhanced-confidence-intervals.ts      # Enhanced statistical interfaces
│   ├── educational-content.ts                # Educational content types
│   ├── statistical-preferences.ts            # User preference types
│   ├── audit-trail.ts                        # Audit trail interfaces
│   └── professional-features.ts              # Professional tier types
│
└── app/api/statistical/
    ├── preferences/route.ts                  # User statistical preferences API
    ├── confidence-intervals/route.ts         # Enhanced confidence interval API
    ├── education/route.ts                    # Educational content API
    ├── methodology-export/route.ts           # Professional methodology export API
    ├── audit-trail/route.ts                  # Statistical audit trail API
    ├── glossary/route.ts                     # Statistical glossary API
    └── validation-certificate/route.ts       # Professional validation certificate API
```

## Testing Strategy

### 10.1 Test Coverage Requirements

**Unit Testing (95% Coverage Required)**:
- Statistical calculation accuracy tests
- Component rendering tests with various confidence levels
- Educational content comprehension validation
- Professional tier feature access control
- Accessibility compliance testing

**Integration Testing (90% Coverage Required)**:
- Executive Dashboard statistical enhancement integration
- Time-series analytics confidence interval overlays
- Export system methodology documentation integration
- Authentication system professional tier validation

### 10.2 Test Implementation Examples

```typescript
// File: /__tests__/components/statistical/ConfidenceIntervalDisplay.test.tsx
describe('ConfidenceIntervalDisplay', () => {
  test('renders confidence interval with correct visual representation', () => {
    const mockInterval: EnhancedConfidenceInterval = {
      value: 72.3,
      lower: 70.1,
      upper: 74.5,
      confidence_level: 95,
      p_value: 0.001,
      sample_size: 124900000,
      visual_representation: 'error_bars',
      // ... other properties
    }

    render(<ConfidenceIntervalDisplay interval={mockInterval} visualType="error_bars" />)

    expect(screen.getByText('95%')).toBeInTheDocument()
    expect(screen.getByText('70.1 - 74.5')).toBeInTheDocument()
  })

  test('shows professional features only for professional users', () => {
    mockUseSubscription.mockReturnValue({ isProfessional: true })

    render(<ConfidenceIntervalDisplay interval={mockInterval} showMethodology={true} />)

    expect(screen.getByText('View Methodology')).toBeInTheDocument()
  })
})

// File: /__tests__/lib/statistical/enhanced-confidence-intervals.test.ts
describe('Enhanced Confidence Intervals', () => {
  test('calculates Wilson Score interval correctly', async () => {
    const result = await calculateEnhancedConfidenceInterval({
      proportion: 0.723,
      sampleSize: 124900000,
      confidenceLevel: 95
    })

    expect(result.value).toBeCloseTo(72.3, 1)
    expect(result.lower).toBeCloseTo(70.1, 1)
    expect(result.upper).toBeCloseTo(74.5, 1)
  })

  test('includes Bangkok dataset context', async () => {
    const result = await calculateEnhancedConfidenceInterval(mockData)

    expect(result.methodology.bangkok_dataset_context).toContain('Bangkok University')
    expect(result.educational_content.practical_meaning).toBeDefined()
  })
})
```

## Deployment and Rollout Plan

### 11.1 Phased Implementation

**Phase 1: Core Statistical UI Components (Week 1)**
- Implement `ConfidenceIntervalDisplay.tsx`
- Implement `PValueIndicator.tsx`
- Implement basic educational tooltips
- Deploy to staging environment

**Phase 2: Dashboard Integration (Week 2)**
- Enhance existing `StatisticalMetricCard.tsx`
- Integrate with Executive Dashboard
- Add Time-Series Analytics overlays
- User acceptance testing

**Phase 3: Professional Features (Week 3)**
- Implement advanced statistical controls
- Add methodology export functionality
- Professional tier validation and testing
- Performance optimization

**Phase 4: Educational System (Week 4)**
- Complete educational content system
- Implement interactive tutorials
- Accessibility compliance validation
- Production deployment

### 11.2 Rollout Strategy

**A/B Testing Approach**:
- 10% of Professional users get enhanced statistical features
- Monitor performance impact and user engagement
- Gradual rollout based on performance metrics
- Full deployment after validation

## Risk Assessment and Mitigation

### 12.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Performance degradation | High | Medium | Implement caching, lazy loading |
| Accessibility compliance failure | High | Low | Comprehensive accessibility testing |
| Statistical calculation errors | Critical | Low | Extensive validation testing |
| Professional tier bypass | Medium | Low | Server-side validation |

### 12.2 User Experience Risks

| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Statistical concepts too complex | High | Medium | Plain English explanations, progressive disclosure |
| UI clutter from new components | Medium | Medium | Careful UX design, optional features |
| Performance impact on mobile | Medium | Low | Responsive design optimization |

## Success Metrics

### 13.1 Technical Success Metrics

- **Performance**: < 100ms component render time
- **Accuracy**: 100% statistical calculation validation
- **Accessibility**: WCAG 2.1 AA compliance
- **Coverage**: 95% unit test coverage, 90% integration test coverage

### 13.2 Business Success Metrics

- **User Engagement**: 40% increase in Executive Dashboard time-on-page
- **Professional Conversion**: 15% increase in upgrade rate
- **Feature Adoption**: 60% of users engage with educational content
- **Compliance**: 100% audit trail functionality validation

## Conclusion

This technical architecture provides a comprehensive foundation for implementing statistical confidence UI components that enhance the platform's credibility, support regulatory compliance, and differentiate Professional tier features. The design leverages existing components while adding sophisticated statistical visualization and educational content systems.

**Key Benefits**:
- **Professional credibility** through rigorous statistical displays
- **Educational value** via plain English explanations
- **Regulatory compliance** through audit trail and methodology documentation
- **Performance optimized** implementation with accessibility compliance
- **Professional tier differentiation** with advanced statistical features

The implementation plan provides a practical, phased approach that minimizes risk while maximizing the value delivered to facility managers requiring professional-grade statistical validation for their IoT building management insights.