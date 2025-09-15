# 2. Ultra-Lean Technology Stack

## Core Infrastructure ($0-20/month)
- **Frontend**: Next.js 14+ App Router (Vercel Free)
- **Database**: Supabase PostgreSQL (Free tier: 500MB)
- **Authentication**: NextAuth.js + Supabase Auth
- **Payments**: Stripe (pay-per-transaction)
- **Email Service**: Resend (Free tier: 3K emails/month) or SendGrid integration
- **Analytics**: Vercel Analytics (Free tier)
- **Monitoring**: Sentry (Free tier: 5k events)

## Data Processing
- **ETL**: Node.js scripts (serverless functions)
- **Storage**: Supabase Storage for processed datasets
- **Caching**: Next.js built-in caching + Edge Runtime
