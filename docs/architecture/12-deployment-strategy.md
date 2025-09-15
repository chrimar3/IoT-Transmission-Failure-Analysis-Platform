# 12. Deployment Strategy

## Environment Progression & Domain Requirements
1. **Development**: Local with Docker PostgreSQL
2. **Staging**: Vercel preview + Supabase staging (preview-*.vercel.app)
3. **Production**: Custom domain + Vercel + Supabase production

### Domain Setup Requirements (Epic 1, Story 1.5 - New)
- **Domain Registration**: Register cu-bems-analytics.com (or similar)
- **DNS Configuration**: Vercel DNS setup with automatic SSL
- **Subdomain Strategy**: 
  - api.cu-bems-analytics.com (API endpoints)
  - app.cu-bems-analytics.com (main application)
  - docs.cu-bems-analytics.com (user documentation)
- **SSL Certificates**: Automatic via Vercel/Let's Encrypt
- **CDN Configuration**: Vercel Edge Network for global performance

## Zero-Downtime Deployments
- Feature flags for gradual rollouts
- Database migrations with backward compatibility
- Automated rollback on health check failures
