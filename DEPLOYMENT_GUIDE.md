# SplitEasy - Deployment Guide

## 🚀 Production Deployment Checklist

### 1. Environment Setup

#### Required Environment Variables
Create `.env.local` for local development and set these in your production environment:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Site URL for email links
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

#### Supabase Configuration
1. **Create a new Supabase project** at https://supabase.com
2. **Run database migrations**:
   ```bash
   # Connect to your Supabase project
   npx supabase link --project-ref your-project-ref
   
   # Push migrations
   npx supabase db push
   ```

3. **Configure Authentication**:
   - Go to Authentication > Settings
   - Enable Google OAuth provider
   - Add redirect URL: `https://your-domain.com/auth/callback`
   - Configure email templates for magic links

4. **Set up Row Level Security**:
   - All tables have RLS enabled
   - Policies are configured in the migration files

### 2. Build and Deploy

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# or via CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### Other Platforms
```bash
# Build the application
npm run build

# Start production server
npm start
```

### 3. Domain Configuration

#### Custom Domain
1. **Add domain in Vercel** (or your hosting platform)
2. **Update Supabase redirect URLs**:
   - Go to Authentication > URL Configuration
   - Add your production domain to allowed redirect URLs
   - Update site URL

#### SSL Certificate
- Vercel provides automatic SSL
- Other platforms: ensure HTTPS is enabled

### 4. Database Setup

#### Run Migrations
```sql
-- Run these in your Supabase SQL editor:

-- 1. Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create other tables (see migration files)
-- Run the complete migration from: supabase/migrations/002_create_missing_tables.sql
```

#### Verify Tables
```sql
-- Check that all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('groups', 'group_members', 'expenses', 'expense_participants', 'profiles');
```

### 5. Testing

#### Smoke Tests
1. **Authentication**:
   - [ ] Google OAuth login works
   - [ ] Magic link login works
   - [ ] Logout works
   - [ ] Protected routes redirect to login

2. **Core Features**:
   - [ ] Create a group
   - [ ] Add an expense
   - [ ] View balances
   - [ ] View analytics
   - [ ] Navigation works

3. **Error Handling**:
   - [ ] 404 pages work
   - [ ] Error states display properly
   - [ ] Loading states work

### 6. Performance Optimization

#### Production Build
```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer

# Check for performance issues
npm run build -- --debug
```

#### Caching
- API responses are cached in memory
- Consider Redis for production scaling
- Enable CDN for static assets

### 7. Monitoring

#### Error Tracking
Consider adding:
- Sentry for error tracking
- Vercel Analytics for performance
- Supabase monitoring for database

#### Logs
- Application logs in hosting platform
- Database logs in Supabase
- Authentication logs in Supabase

### 8. Security Checklist

#### Authentication
- [ ] OAuth providers configured correctly
- [ ] Redirect URLs are secure
- [ ] Session management is working
- [ ] RLS policies are active

#### Data Protection
- [ ] Environment variables are secure
- [ ] Database access is restricted
- [ ] API endpoints are protected
- [ ] Input validation is working

### 9. Backup Strategy

#### Database Backups
- Supabase provides automatic backups
- Consider additional backup solutions for critical data

#### Code Backups
- Use Git for version control
- Tag releases for easy rollback

### 10. Scaling Considerations

#### Database
- Monitor query performance
- Add indexes as needed
- Consider read replicas for high traffic

#### Application
- Use CDN for static assets
- Implement proper caching
- Monitor memory usage
- Consider horizontal scaling

## 🔧 Troubleshooting

### Common Issues

#### Authentication Problems
```bash
# Check Supabase configuration
# Verify redirect URLs match exactly
# Check OAuth provider settings
```

#### Database Errors
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'groups';

-- Verify user permissions
SELECT * FROM information_schema.role_table_grants 
WHERE grantee = 'authenticated';
```

#### Build Errors
```bash
# Clear Next.js cache
rm -rf .next
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

### Support Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

## 📊 Post-Deployment

### Analytics Setup
1. **Google Analytics** (optional)
2. **Vercel Analytics** (built-in)
3. **Supabase Analytics** (database metrics)

### User Feedback
1. **Feedback form** (consider adding)
2. **Error reporting** (Sentry integration)
3. **Usage analytics** (privacy-compliant)

### Maintenance
1. **Regular updates** (dependencies)
2. **Security patches** (monitor alerts)
3. **Performance monitoring** (set up alerts)
4. **Backup verification** (test restore process)

## 🎉 Launch Checklist

- [ ] Domain configured and SSL enabled
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Authentication configured
- [ ] Smoke tests passed
- [ ] Error tracking enabled
- [ ] Analytics configured
- [ ] Backup strategy in place
- [ ] Monitoring alerts set up
- [ ] Documentation updated

Your SplitEasy application is now ready for production! 🚀
