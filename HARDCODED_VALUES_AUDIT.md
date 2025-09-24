# 🚨 Hardcoded Values Audit Report
## Critical Issues in Business Metrics Calculation

**Date**: 2025-09-18
**Status**: CRITICAL - All savings claims unvalidated
**Total Hardcoded Values Found**: 47 values across 4 files

---

## 📊 Executive Summary

Our current BMAD implementation contains **47 hardcoded business values** with no basis in actual data analysis. This makes all savings claims ($297,500) **unverifiable and potentially misleading**.

**Immediate Action Required**: Replace all hardcoded calculations with data-driven analysis.

---

## 🔍 Detailed Findings

### File: `src/lib/bmad/decide-phase.ts`

#### Hardcoded Savings Values:
| Line | Value | Context | Risk Level |
|------|-------|---------|------------|
| 60 | `$30,000` | Floor 2 audit savings | **CRITICAL** |
| 78 | `$47,500` | AC maintenance savings | **CRITICAL** |
| 96 | `$20,000` | Peak load management | **CRITICAL** |
| 114 | `$12,000` | Sensor replacement | **HIGH** |
| 132 | `$18,000` | Weekend energy reduction | **HIGH** |
| 150 | `$95,000` | Comprehensive efficiency | **CRITICAL** |
| 168 | `$75,000` | Predictive maintenance | **CRITICAL** |

#### Hardcoded Operational Claims:
| Line | Claim | Validation Status |
|------|-------|------------------|
| 59 | "Floor 2 consuming 2.8x normal energy" | ❌ No baseline established |
| 93 | "340% peak consumption spikes" | ❌ No data source |
| 111 | "8 problematic sensors causing 60% of failures" | ❌ No analysis shown |
| 147 | "Transform building from 73/100 to 85/100" | ❌ No scoring methodology |

### File: `src/lib/bmad/analyze-phase.ts`

#### Hardcoded Pattern Claims:
| Line | Pattern | Status |
|------|---------|---------|
| 61 | "340% increase in consumption during peak hours" | ❌ Unvalidated |
| 68 | "15% of total consumption during weekends" | ❌ No data |
| 75 | "$12,000 additional monthly cost in summer" | ❌ No utility rates |
| 82 | "2-3% efficiency loss per quarter" | ❌ No trend analysis |

#### Hardcoded Anomaly Values:
| Line | Anomaly | Validation Needed |
|------|---------|------------------|
| 160 | "Floor 2 is consuming 2.8x more energy" | Baseline calculation |
| 175 | "14 AC units showing performance degradation" | Equipment monitoring data |
| 191 | "8 sensors causing 60% of transmission failures" | Error log analysis |

### File: `src/lib/bmad/index.ts`

#### Summary Hardcoded Claims:
| Line | Claim | Required Data Source |
|------|-------|---------------------|
| 106 | "Floor 2 consuming 2.8x more energy - $25-35K savings" | Floor energy consumption by date |
| 107 | "14 AC units showing degradation - $40-55K prevention" | Equipment efficiency metrics |
| 108 | "12.3% YoY energy increase trend - $45-60K impact" | Historical consumption data |

---

## 🧮 Missing Calculation Foundations

### Required Data Sources (Currently Missing):
1. **Electricity Rates**: No Bangkok utility pricing data
2. **Baseline Consumption**: No historical average established
3. **Equipment Efficiency**: No performance benchmarks
4. **Maintenance Costs**: No actual repair/replacement costs
5. **Occupancy Data**: No correlation with energy usage
6. **Weather Data**: No seasonal adjustment factors

### Required Calculations (Not Implemented):
```typescript
// What we need to implement:
interface RequiredCalculations {
  // Energy Cost Model
  calculateEnergyCost(kwh: number, timeOfUse: string): number;

  // Baseline Establishment
  establishBaseline(historicalData: SensorData[]): EnergyBaseline;

  // Anomaly Detection
  detectAnomalies(current: number, baseline: EnergyBaseline): AnomalyReport;

  // Savings Calculation
  calculateSavings(before: number, after: number, cost: number): SavingsReport;

  // Confidence Scoring
  calculateConfidence(dataPoints: number, variance: number): ConfidenceScore;
}
```

---

## 📈 Impact Assessment

### Business Risk:
- **Credibility Loss**: Unvalidated claims undermine platform credibility
- **Investment Risk**: Stakeholders making decisions on false data
- **Compliance Issues**: Potential regulatory concerns with unsubstantiated claims

### Technical Debt:
- **Maintenance Burden**: Hardcoded values require manual updates
- **Scalability Issues**: Cannot adapt to different buildings/regions
- **Testing Challenges**: Cannot verify accuracy without real data

---

## 🎯 Remediation Plan

### Phase 1: Immediate Actions (Week 1)
1. **Flag all hardcoded values** with validation status
2. **Implement data pipeline** to process actual sensor data
3. **Create baseline calculator** from historical records
4. **Add confidence scoring** to all calculations

### Phase 2: Data-Driven Implementation (Week 2)
1. **Replace hardcoded patterns** with ML-based detection
2. **Implement cost model** with real electricity rates
3. **Create statistical validation** framework
4. **Add sensitivity analysis** for projections

### Phase 3: Validation & Testing (Week 3)
1. **Manual verification** of calculation results
2. **A/B testing** against known benchmarks
3. **Peer review** of methodology
4. **Documentation** of all assumptions

---

## 🔧 Technical Requirements

### New Interfaces Needed:
```typescript
interface EnergyBaseline {
  dailyAverage: number;
  weeklyPattern: number[];
  seasonalFactors: number[];
  confidence: number;
  samplePeriod: string;
}

interface CostModel {
  energyRatePerKwh: number;
  demandChargePerKw: number;
  timeOfUseRates: Map<string, number>;
  source: string;
  validFrom: string;
}

interface ValidationResult {
  isValid: boolean;
  confidenceLevel: number;
  pValue?: number;
  sampleSize: number;
  methodology: string;
  lastValidated: string;
}
```

### Database Schema Changes:
```sql
-- New tables for validated metrics
CREATE TABLE energy_baselines (
  id SERIAL PRIMARY KEY,
  floor_number INTEGER,
  baseline_kwh_per_day DECIMAL(10,2),
  calculation_date DATE,
  sample_size INTEGER,
  confidence_level DECIMAL(5,2)
);

CREATE TABLE cost_models (
  id SERIAL PRIMARY KEY,
  region VARCHAR(50),
  energy_rate_per_kwh DECIMAL(10,4),
  demand_charge_per_kw DECIMAL(10,2),
  effective_date DATE,
  source VARCHAR(100)
);
```

---

## 📋 Action Items

### Immediate (This Week):
- [ ] Replace all hardcoded savings with calculation placeholders
- [ ] Implement baseline establishment from actual data
- [ ] Create cost model with real Bangkok electricity rates
- [ ] Add validation status to all metrics

### Short Term (Next 2 Weeks):
- [ ] Build statistical anomaly detection
- [ ] Implement confidence interval calculations
- [ ] Create sensitivity analysis framework
- [ ] Add peer review process for calculations

### Long Term (Next Month):
- [ ] Deploy machine learning pattern detection
- [ ] Implement real-time validation monitoring
- [ ] Create automated testing for calculation accuracy
- [ ] Build regulatory compliance documentation

---

## ⚠️ Critical Warnings

1. **Do not use current savings figures** ($297,500) in any business presentations
2. **All ROI calculations are invalid** until data-driven approach implemented
3. **Platform credibility at risk** if hardcoded values are discovered
4. **Regulatory compliance issues** possible with unsubstantiated energy claims

---

## 📞 Next Steps

1. **Immediately begin Phase 1 remediation**
2. **Engage stakeholders** about timeline for validated metrics
3. **Create interim disclaimers** for all current reports
4. **Establish data governance** process for future calculations

**Priority**: 🔴 **CRITICAL - Start implementation immediately**