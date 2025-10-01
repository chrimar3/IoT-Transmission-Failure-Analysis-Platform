## Description

<!-- Provide a brief description of the changes in this PR -->

## Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that breaks existing functionality)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring (no functional changes)
- [ ] Dependency updates
- [ ] Configuration changes

## Related Issues

<!-- Link to related issues using GitHub keywords -->
<!-- Example: Fixes #123, Closes #456, Related to #789 -->

Fixes #
Related to #

## Changes Made

<!-- Provide a detailed list of changes -->

-
-
-

## Testing

<!-- Describe the testing you've performed -->

### Test Coverage

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] All existing tests pass
- [ ] Test coverage is ≥80% for new code

### Manual Testing

<!-- Describe manual testing steps performed -->

1.
2.
3.

### Test Results

```
<!-- Paste test results here -->
npm test output:
```

## Quality Checklist

<!-- Ensure all items are checked before submitting -->

### Code Quality

- [ ] Code follows project coding standards
- [ ] ESLint passes with zero warnings (`npm run lint`)
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] Code has been self-reviewed
- [ ] Complex logic has explanatory comments
- [ ] No console.log or debug code left in

### Security

- [ ] No sensitive data (API keys, passwords) in code
- [ ] Input validation implemented where needed
- [ ] Authentication/authorization checks in place
- [ ] SQL injection prevention measures used
- [ ] XSS prevention measures used

### Performance

- [ ] No performance regressions introduced
- [ ] Database queries optimized
- [ ] API response times within SLA (<3s)
- [ ] Large datasets handled efficiently

### Documentation

- [ ] README updated (if applicable)
- [ ] API documentation updated (if applicable)
- [ ] Code comments added for complex logic
- [ ] Migration guide provided (for breaking changes)

## Deployment Considerations

<!-- Any special deployment requirements or database migrations? -->

### Database Changes

- [ ] No database changes
- [ ] Migration scripts included
- [ ] Rollback plan documented

### Environment Variables

- [ ] No new environment variables
- [ ] New variables documented in `.env.example`
- [ ] Deployment guide updated

### Dependencies

- [ ] No new dependencies
- [ ] New dependencies documented
- [ ] Package versions locked

## Screenshots

<!-- If applicable, add screenshots or GIFs demonstrating the changes -->

### Before


### After


## Breaking Changes

<!-- If this is a breaking change, describe the impact and migration path -->

**Impact:**


**Migration Path:**


## Rollback Plan

<!-- How can this change be rolled back if issues arise in production? -->


## Reviewer Notes

<!-- Any specific areas you'd like reviewers to focus on? -->


## Post-Merge Tasks

<!-- Any tasks that need to be done after merging? -->

- [ ] Update staging environment
- [ ] Run database migrations
- [ ] Update API documentation site
- [ ] Notify stakeholders
- [ ] Monitor error logs for 24h
- [ ] Update CHANGELOG.md

---

## Conventional Commits

<!-- This PR should follow conventional commit format in the title -->
<!-- Examples: -->
<!-- feat(dashboard): add real-time alert notifications -->
<!-- fix(api): resolve timeout issues in patterns endpoint -->
<!-- docs(readme): update installation instructions -->

**PR Title Format:** `type(scope): brief description`

---

By submitting this pull request, I confirm that:

- [ ] My code follows the project's code of conduct
- [ ] I have performed a self-review of my code
- [ ] I have added tests that prove my fix/feature works
- [ ] All new and existing tests pass locally
- [ ] I have made corresponding changes to documentation
- [ ] My changes generate no new warnings or errors
