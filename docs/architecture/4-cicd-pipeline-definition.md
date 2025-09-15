# 4. CI/CD Pipeline Definition

## GitHub Actions Workflow
```yaml
name: CU-BEMS CI/CD
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test
      - run: npm run build
      
  data-validation:
    runs-on: ubuntu-latest
    steps:
      - name: Validate Dataset Integrity
        run: npm run validate:dataset
      - name: Test Data Processing Pipeline
        run: npm run test:pipeline
        
  deploy-preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy Preview
        run: vercel --token=${{ secrets.VERCEL_TOKEN }}
        
  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```
