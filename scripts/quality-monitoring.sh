#!/bin/bash
# CU-BEMS IoT Platform - Continuous Quality Monitoring Script
# 🧪 Quinn - Test Architect Quality Enforcement System

set -euo pipefail

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="${PROJECT_ROOT}/logs/quality-monitoring"
REPORT_DIR="${PROJECT_ROOT}/reports/quality"

# Create directories if they don't exist
mkdir -p "${LOG_DIR}" "${REPORT_DIR}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_DIR}/quality-monitor-${TIMESTAMP}.log"
}

# Quality metrics tracking
declare -A QUALITY_METRICS=(
    ["typescript_errors"]=0
    ["typescript_warnings"]=0
    ["test_coverage"]=0
    ["eslint_errors"]=0
    ["security_vulnerabilities"]=0
    ["build_success"]=0
)

# Gate thresholds (zero tolerance for critical items)
declare -A GATE_THRESHOLDS=(
    ["typescript_errors"]=0
    ["typescript_warnings"]=10
    ["test_coverage"]=85
    ["eslint_errors"]=0
    ["security_vulnerabilities"]=0
    ["build_success"]=1
)

# Quality check functions
check_typescript_compilation() {
    log "🔍 Checking TypeScript compilation..."

    cd "${PROJECT_ROOT}"

    # Capture TypeScript errors and warnings
    if tsc_output=$(npx tsc --noEmit 2>&1); then
        QUALITY_METRICS["typescript_errors"]=0
        QUALITY_METRICS["typescript_warnings"]=0
        log "✅ TypeScript compilation successful"
        return 0
    else
        error_count=$(echo "$tsc_output" | grep -c "error TS" || true)
        warning_count=$(echo "$tsc_output" | grep -c "warning TS" || true)

        QUALITY_METRICS["typescript_errors"]=$error_count
        QUALITY_METRICS["typescript_warnings"]=$warning_count

        log "❌ TypeScript compilation failed: $error_count errors, $warning_count warnings"

        # Save detailed error report
        echo "$tsc_output" > "${REPORT_DIR}/typescript-errors-${TIMESTAMP}.log"
        return 1
    fi
}

check_test_coverage() {
    log "🧪 Checking test coverage..."

    cd "${PROJECT_ROOT}"

    # Run tests with coverage
    if npm run test:coverage > "${REPORT_DIR}/test-coverage-${TIMESTAMP}.log" 2>&1; then
        # Extract coverage percentage (this will depend on your test runner)
        coverage=$(grep -E "All files.*[0-9]+\.[0-9]+%" "${REPORT_DIR}/test-coverage-${TIMESTAMP}.log" | tail -1 | grep -oE "[0-9]+\.[0-9]+" | head -1 || echo "0")
        QUALITY_METRICS["test_coverage"]=${coverage%.*}  # Convert to integer

        log "✅ Test coverage: ${coverage}%"
        return 0
    else
        QUALITY_METRICS["test_coverage"]=0
        log "❌ Test coverage check failed"
        return 1
    fi
}

check_linting() {
    log "📝 Checking ESLint compliance..."

    cd "${PROJECT_ROOT}"

    if eslint_output=$(npx eslint --ext .ts,.tsx . --format json 2>/dev/null); then
        error_count=$(echo "$eslint_output" | jq '[.[] | select(.errorCount > 0) | .errorCount] | add // 0')
        QUALITY_METRICS["eslint_errors"]=$error_count

        if [[ $error_count -eq 0 ]]; then
            log "✅ ESLint check passed"
            return 0
        else
            log "❌ ESLint found $error_count errors"
            echo "$eslint_output" > "${REPORT_DIR}/eslint-errors-${TIMESTAMP}.json"
            return 1
        fi
    else
        QUALITY_METRICS["eslint_errors"]=999
        log "❌ ESLint check failed to run"
        return 1
    fi
}

check_security_vulnerabilities() {
    log "🔒 Checking security vulnerabilities..."

    cd "${PROJECT_ROOT}"

    if audit_output=$(npm audit --json 2>/dev/null); then
        high_vulns=$(echo "$audit_output" | jq '.metadata.vulnerabilities.high // 0')
        critical_vulns=$(echo "$audit_output" | jq '.metadata.vulnerabilities.critical // 0')
        total_high_critical=$((high_vulns + critical_vulns))

        QUALITY_METRICS["security_vulnerabilities"]=$total_high_critical

        if [[ $total_high_critical -eq 0 ]]; then
            log "✅ No high/critical security vulnerabilities found"
            return 0
        else
            log "❌ Found $total_high_critical high/critical security vulnerabilities"
            echo "$audit_output" > "${REPORT_DIR}/security-audit-${TIMESTAMP}.json"
            return 1
        fi
    else
        QUALITY_METRICS["security_vulnerabilities"]=999
        log "❌ Security audit failed to run"
        return 1
    fi
}

check_build_success() {
    log "🏗️  Checking build success..."

    cd "${PROJECT_ROOT}"

    if npm run build > "${REPORT_DIR}/build-${TIMESTAMP}.log" 2>&1; then
        QUALITY_METRICS["build_success"]=1
        log "✅ Build successful"
        return 0
    else
        QUALITY_METRICS["build_success"]=0
        log "❌ Build failed"
        return 1
    fi
}

# Gate evaluation
evaluate_quality_gates() {
    log "🚦 Evaluating quality gates..."

    local gates_passed=0
    local total_gates=0
    local critical_failures=0

    echo "=== QUALITY GATE EVALUATION REPORT ===" > "${REPORT_DIR}/gate-evaluation-${TIMESTAMP}.txt"
    echo "Assessment Time: $(date)" >> "${REPORT_DIR}/gate-evaluation-${TIMESTAMP}.txt"
    echo "" >> "${REPORT_DIR}/gate-evaluation-${TIMESTAMP}.txt"

    for metric in "${!QUALITY_METRICS[@]}"; do
        total_gates=$((total_gates + 1))
        current_value=${QUALITY_METRICS[$metric]}
        threshold=${GATE_THRESHOLDS[$metric]}

        case $metric in
            "test_coverage"|"build_success")
                if [[ $current_value -ge $threshold ]]; then
                    status="✅ PASS"
                    gates_passed=$((gates_passed + 1))
                else
                    status="❌ FAIL"
                    if [[ $metric == "build_success" ]]; then
                        critical_failures=$((critical_failures + 1))
                    fi
                fi
                ;;
            *)
                if [[ $current_value -le $threshold ]]; then
                    status="✅ PASS"
                    gates_passed=$((gates_passed + 1))
                else
                    status="❌ FAIL"
                    if [[ $metric == "typescript_errors" || $metric == "security_vulnerabilities" ]]; then
                        critical_failures=$((critical_failures + 1))
                    fi
                fi
                ;;
        esac

        printf "%-25s: %8s (Current: %5s, Threshold: %5s) %s\n" \
            "$metric" "$current_value" "$current_value" "$threshold" "$status" | \
            tee -a "${REPORT_DIR}/gate-evaluation-${TIMESTAMP}.txt"
    done

    echo "" | tee -a "${REPORT_DIR}/gate-evaluation-${TIMESTAMP}.txt"
    printf "Gates Passed: %d/%d\n" "$gates_passed" "$total_gates" | tee -a "${REPORT_DIR}/gate-evaluation-${TIMESTAMP}.txt"
    printf "Critical Failures: %d\n" "$critical_failures" | tee -a "${REPORT_DIR}/gate-evaluation-${TIMESTAMP}.txt"

    # Determine overall gate status
    if [[ $critical_failures -gt 0 ]]; then
        echo -e "${RED}🚨 OVERALL GATE STATUS: CRITICAL FAIL - DEPLOYMENT BLOCKED${NC}" | tee -a "${REPORT_DIR}/gate-evaluation-${TIMESTAMP}.txt"
        return 2
    elif [[ $gates_passed -eq $total_gates ]]; then
        echo -e "${GREEN}✅ OVERALL GATE STATUS: PASS - DEPLOYMENT APPROVED${NC}" | tee -a "${REPORT_DIR}/gate-evaluation-${TIMESTAMP}.txt"
        return 0
    else
        echo -e "${YELLOW}⚠️  OVERALL GATE STATUS: CONCERNS - REVIEW REQUIRED${NC}" | tee -a "${REPORT_DIR}/gate-evaluation-${TIMESTAMP}.txt"
        return 1
    fi
}

# Generate quality dashboard
generate_quality_dashboard() {
    local dashboard_file="${REPORT_DIR}/quality-dashboard-${TIMESTAMP}.html"

    cat > "$dashboard_file" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CU-BEMS IoT Quality Dashboard</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background: #f5f5f5; }
        .header { background: #2d3748; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .pass { color: #38a169; }
        .fail { color: #e53e3e; }
        .warning { color: #d69e2e; }
        .gate-status { padding: 15px; margin: 20px 0; border-radius: 8px; font-weight: bold; text-align: center; }
        .status-pass { background: #c6f6d5; color: #22543d; }
        .status-fail { background: #fed7d7; color: #742a2a; }
        .status-warning { background: #fefcbf; color: #744210; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 CU-BEMS IoT Quality Dashboard</h1>
        <p class="timestamp">Generated: $(date)</p>
        <p>Test Architect: Quinn | Assessment ID: QA-GATE-${TIMESTAMP}</p>
    </div>

    <div class="metrics-grid">
EOF

    # Add metric cards
    for metric in "${!QUALITY_METRICS[@]}"; do
        current_value=${QUALITY_METRICS[$metric]}
        threshold=${GATE_THRESHOLDS[$metric]}

        case $metric in
            "test_coverage"|"build_success")
                if [[ $current_value -ge $threshold ]]; then
                    status_class="pass"
                    status_text="✅ PASS"
                else
                    status_class="fail"
                    status_text="❌ FAIL"
                fi
                ;;
            *)
                if [[ $current_value -le $threshold ]]; then
                    status_class="pass"
                    status_text="✅ PASS"
                else
                    status_class="fail"
                    status_text="❌ FAIL"
                fi
                ;;
        esac

        cat >> "$dashboard_file" << EOF
        <div class="metric-card">
            <h3>${metric//_/ }</h3>
            <div class="metric-value ${status_class}">${current_value}</div>
            <p>Threshold: ${threshold}</p>
            <p class="${status_class}">${status_text}</p>
        </div>
EOF
    done

    cat >> "$dashboard_file" << EOF
    </div>
</body>
</html>
EOF

    log "📊 Quality dashboard generated: $dashboard_file"
}

# Main execution
main() {
    log "🚀 Starting CU-BEMS IoT Quality Gate Monitoring..."
    log "Project Root: $PROJECT_ROOT"

    local exit_code=0

    # Run all quality checks
    check_typescript_compilation || exit_code=1
    check_test_coverage || exit_code=1
    check_linting || exit_code=1
    check_security_vulnerabilities || exit_code=1
    check_build_success || exit_code=1

    # Evaluate gates and generate reports
    evaluate_quality_gates
    gate_exit_code=$?

    generate_quality_dashboard

    # Final summary
    log "📋 Quality monitoring complete. Reports available in: $REPORT_DIR"

    if [[ $gate_exit_code -eq 2 ]]; then
        log "🚨 CRITICAL: Deployment blocked due to critical gate failures"
        exit 2
    elif [[ $gate_exit_code -eq 1 ]]; then
        log "⚠️  WARNING: Quality concerns detected, review required"
        exit 1
    else
        log "✅ SUCCESS: All quality gates passed"
        exit 0
    fi
}

# Execute main function
main "$@"