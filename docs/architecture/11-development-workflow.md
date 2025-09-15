# 11. Development Workflow

## Local Development Setup
```bash
# 1. Dataset preparation
npm run dataset:validate
npm run dataset:process
npm run db:migrate

# 2. Development server
npm run dev

# 3. Testing
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Data Processing Pipeline
```bash
# Automated processing
npm run process:2018-data
npm run process:2019-data
npm run create:materialized-views
npm run validate:data-integrity
```
