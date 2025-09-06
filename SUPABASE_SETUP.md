# Supabase Setup Guide for SplitEasy

## Issue
The application is showing empty error objects (`{}`) when trying to create groups because Supabase is not properly configured.

## Solution

### Option 1: Local Supabase Development (Recommended)

1. **Install Supabase CLI**:
   - Download from: https://github.com/supabase/cli/releases
   - Or use Chocolatey: `choco install supabase`
   - Or use Scoop: `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase`

2. **Start Local Supabase**:
   ```bash
   supabase start
   ```

3. **Create Environment File**:
   Create `.env.local` in the project root with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
   ```

4. **Run Migrations**:
   ```bash
   supabase db reset
   ```

### Option 2: Use Remote Supabase Project

1. **Create Supabase Project**:
   - Go to https://supabase.com
   - Create a new project
   - Get your project URL and anon key

2. **Create Environment File**:
   Create `.env.local` in the project root with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Run Migrations**:
   - Copy the SQL from `supabase/migrations/001_create_groups_table_with_rls.sql`
   - Run it in your Supabase SQL editor

### Option 3: Quick Test with Mock Data

If you want to test the UI without setting up Supabase, you can temporarily modify the API to return mock data.

## Current Error Details

The error occurs because:
1. Environment variables are not set
2. Supabase client cannot connect to the database
3. The error object is empty because the connection fails before reaching the database

## Next Steps

1. Choose one of the setup options above
2. Create the `.env.local` file
3. Start the development server: `npm run dev`
4. Test group creation functionality

## Troubleshooting

- If you see "CONFIG_ERROR", check your environment variables
- If you see "CONNECTION_ERROR", ensure Supabase is running
- If you see "AUTH_ERROR", make sure you're logged in
- Check the browser console for detailed error logs
