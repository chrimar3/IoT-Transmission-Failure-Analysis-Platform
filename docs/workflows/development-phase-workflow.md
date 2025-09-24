# Development Phase Workflow - BMAD Methodology

## 🎯 Overview

This document defines the complete development phase workflow using BMAD agents (SM, QA, PO) to ensure quality, security, and maintainability for every story implementation.

---

## 📋 Workflow Phases

### Phase 1: Story Preparation (SM - Scrum Master)

#### 1.1 Review Previous Story Notes
- Check previous story's Dev Agent Record for relevant implementation notes
- Review QA Results from related stories
- Identify dependencies and potential conflicts

#### 1.2 Draft Story from Sharded Epic
- Pull story details from sharded epic documents
- Reference architecture documents for technical requirements
- Include all acceptance criteria from epic

#### 1.3 Add Quality Requirements
**CRITICAL: Every story MUST include:**

```markdown
## Testing Requirements

### Quality Gate Criteria
**CRITICAL: All tests and quality checks MUST pass before story completion**

#### Pre-Commit Quality Checks
- npm run lint          # ESLint with zero warnings/errors
- npm run typecheck     # TypeScript strict mode validation
- npm test              # All unit and integration tests passing

#### Regression Test Requirements
1. Run Full Test Suite: npm test -- --coverage
   - Minimum 85% code coverage for new code
   - Zero failing tests allowed
   - All existing tests must continue to pass

#### Linting and Code Quality
- Zero ESLint warnings or errors
- No `any` types allowed
- No @ts-ignore comments
- All functions with explicit return types
```

---

### Phase 2: QA Risk Assessment (Quinn - Test Architect)

#### 2.1 Execute Risk Profile
```bash
QA: *risk-profile {story}
```
- Generate comprehensive risk assessment matrix
- Identify critical security vulnerabilities
- Score risks by probability × impact

#### 2.2 Execute Test Design
```bash
QA: *test-design {story}
```
- Create test scenarios with Given-When-Then patterns
- Map tests to identified risks
- Define performance benchmarks

#### 2.3 Update Story QA Results
Update the story file with:
- Test Strategy summary
- Risk Profile with scores
- Quality Gate decision (PASS/CONCERNS/FAIL)

**Quality Gate Criteria:**
- **PASS**: No critical risks, all tests defined
- **CONCERNS**: Medium risks identified, mitigation required
- **FAIL**: Critical security or revenue risks present

---

### Phase 3: PO Validation (Sarah - Product Owner)

#### 3.1 Validate Story Draft
```bash
PO: *validate-story-draft {story}
```
- Verify acceptance criteria completeness
- Ensure business value alignment
- Confirm testability of requirements

#### 3.2 Story Approval Gates
- [ ] All acceptance criteria are clear and measurable
- [ ] Testing requirements are comprehensive
- [ ] Definition of Done includes quality gates
- [ ] Risk mitigation strategies defined

---

### Phase 4: Development Implementation

#### 4.1 Pre-Development Checklist
- [ ] Story approved by PO
- [ ] QA test strategy defined
- [ ] Quality gates documented
- [ ] Development environment ready

#### 4.2 Development Standards
**Every implementation MUST:**

1. **Follow TDD approach**:
   - Write tests first
   - Implement minimum code to pass tests
   - Refactor with confidence

2. **Continuous Quality Verification**:
   ```bash
   # Run after every significant change:
   npm run lint && npm run typecheck && npm test
   ```

3. **Pre-Commit Hooks**:
   ```json
   // package.json
   "husky": {
     "hooks": {
       "pre-commit": "npm run lint && npm run typecheck",
       "pre-push": "npm test"
     }
   }
   ```

#### 4.3 Code Review Requirements
- [ ] All quality gates passing
- [ ] No hardcoded values
- [ ] Proper error handling
- [ ] Loading/error states implemented
- [ ] Security best practices followed

---

## 🚦 Definition of Done Template

### Mandatory Quality Gates
```markdown
## Definition of Done

### Code Quality Gates (MANDATORY)
- [ ] ESLint: npm run lint (ZERO warnings/errors)
- [ ] TypeScript: npm run typecheck (no errors)
- [ ] Unit Tests: >85% coverage for new code
- [ ] Integration Tests: All passing
- [ ] Regression Tests: Full suite passing
- [ ] Build: npm run build successful

### Pre-Deployment Verification
npm run lint && npm run typecheck && npm test && npm run build
```

---

## 📊 Quality Metrics

### Story Completion Criteria
1. **Code Quality**: 100% linting pass rate
2. **Test Coverage**: >85% for new code
3. **Type Safety**: Zero `any` types
4. **Performance**: Meets defined benchmarks
5. **Security**: No critical vulnerabilities

### Continuous Monitoring
```bash
# Quality dashboard command:
npm run quality:check

# Output:
✅ ESLint: 0 errors, 0 warnings
✅ TypeScript: No type errors
✅ Tests: 245 passing (0 failing)
✅ Coverage: 87.3%
✅ Build: Success
```

---

## 🔄 Feedback Loop

### Post-Implementation Review
1. **Dev Agent Record**: Update with implementation details
2. **QA Re-validation**: Verify all risks mitigated
3. **PO Sign-off**: Confirm business requirements met
4. **Lessons Learned**: Document for next story

### Continuous Improvement
- Weekly quality metrics review
- Adjust coverage thresholds based on complexity
- Update workflow based on team feedback

---

## 🎯 Success Metrics

### Story Success Indicators
- **Zero production bugs** from story implementation
- **100% quality gate pass rate** before deployment
- **<5% rework rate** after PO review
- **95% test automation** coverage

### Team Efficiency Metrics
- **Story completion velocity** trending upward
- **Defect escape rate** <2%
- **First-time quality** >90%

---

## 📝 Example Story Structure

```markdown
# Story X.X: [Title]

## Status
Draft → QA Review → PO Approved → In Progress → Done

## Testing Requirements
[Quality Gate Criteria - MANDATORY]

## Definition of Done
[Complete checklist with quality gates]

## Dev Agent Record
[Implementation tracking]

## QA Results
[Risk assessment and test strategy]
```

---

## 🚀 Quick Reference

### Agent Commands
```bash
# SM creates story
SM: Draft story from epic + architecture

# QA validates
QA: *risk-profile {story}
QA: *test-design {story}

# PO approves
PO: *validate-story-draft {story}

# Quality verification
npm run lint && npm run typecheck && npm test
```

### Quality Gate Checklist
- [ ] ESLint: Zero warnings/errors
- [ ] TypeScript: No type errors
- [ ] Tests: All passing with coverage
- [ ] Build: Successful
- [ ] Security: No vulnerabilities
- [ ] Performance: Meets targets

---

**Remember**: Quality is not negotiable. Every story must pass ALL quality gates before deployment.