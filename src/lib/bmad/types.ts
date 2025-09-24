/**
 * BMAD Framework Type Definitions
 */

export interface BmadConfig {
  projectName: string;
  dataSource: string;
  timeframe: string;
  totalRecords: number;
}

export interface BmadBuildResults {
  dataCollected: boolean;
  recordsProcessed: number;
  dataQuality: number;
  completeness: number;
  validationErrors: number;
  processingTime: number;
  dataSources: DataSource[];
  summary: string;
}

export interface DataSource {
  name: string;
  type: string;
  records: number;
  size: string;
  quality: number;
  issues: string[];
}

export interface BmadMetrics {
  kpis: KPI[];
  performance: PerformanceMetrics;
  dataQuality: number;
  systemHealth: number;
  timestamp: string;
}

export interface KPI {
  name: string;
  value: number | string;
  target: number | string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  description: string;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
  efficiency: number;
}

export interface BmadAnalysis {
  insights: Insight[];
  patterns: Pattern[];
  anomalies: Anomaly[];
  criticalIssues: CriticalIssue[];
  opportunities: Opportunity[];
  confidenceScore: number;
  summary: string;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  evidence: string[];
  value?: number;
}

export interface Pattern {
  type: string;
  description: string;
  frequency: string;
  impact: string;
  recommendation: string;
}

export interface Anomaly {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: string;
  description: string;
  detectedAt: string;
  impact: string;
}

export interface CriticalIssue {
  id: string;
  title: string;
  severity: 'critical' | 'high';
  affectedSystems: string[];
  impact: string;
  urgency: string;
  recommendation: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
  confidence: number;
  // Enhanced validation
  dataPoints?: number;
  calculationMethod?: string;
  validationStatus?: 'validated' | 'estimated' | 'hardcoded';
  sensitivityFactors?: Map<string, number>;
}

export interface BmadDecisions {
  recommendations: Recommendation[];
  priorityMatrix: PriorityItem[];
  actionPlan: ActionItem[];
  totalSavings: number;
  implementationTimeline: Timeline[];
  riskAssessment: RiskItem[];
  summary: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'immediate' | 'urgent' | 'high' | 'medium' | 'low';
  impact: string;
  savings: number;
  effort: string;
  timeframe: string;
  steps: string[];
  // Validation fields for credible metrics
  calculationMethod?: string;
  confidenceLevel?: number;
  dataSource?: string;
  validationStatus?: 'validated' | 'estimated' | 'hardcoded';
  baseline?: number;
  sampleSize?: number;
  pValue?: number;
}

export interface PriorityItem {
  item: string;
  priority: number;
  impact: number;
  effort: number;
  score: number;
}

export interface ActionItem {
  id: string;
  action: string;
  owner: string;
  deadline: string;
  status: 'pending' | 'in-progress' | 'completed';
  dependencies: string[];
}

export interface Timeline {
  phase: string;
  startDate: string;
  endDate: string;
  milestones: string[];
  deliverables: string[];
}

export interface RiskItem {
  risk: string;
  probability: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  mitigation: string;
}

export interface BmadReport {
  timestamp: string;
  projectName: string;
  executiveSummary: string;
  phases: {
    build: BmadBuildResults;
    measure: BmadMetrics;
    analyze: BmadAnalysis;
    decide: BmadDecisions;
  };
  keyFindings: string[];
  recommendations: Recommendation[];
  nextSteps: string[];
  roi: ROIMetrics;
}

export interface ROIMetrics {
  annualSavings: number;
  implementationCost: number;
  netSavings: number;
  roi: string;
  paybackPeriod: string;
  // Validation metadata
  validationStatus?: 'validated' | 'estimated' | 'hardcoded';
  confidenceInterval?: {
    lower: number;
    upper: number;
    confidence: number;
  };
  assumptions?: string[];
  calculationDate?: string;
}

export interface AlertItem {
  type: 'warning' | 'critical' | 'info';
  message: string;
  value?: number;
  issues?: CriticalIssue[];
}