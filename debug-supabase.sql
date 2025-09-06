-- Debug SQL queries for Supabase
-- Run these in your Supabase SQL Editor to debug issues

-- 1. Test authentication status
SELECT public.debug_auth();

-- 2. Test group insertion capabilities
SELECT public.test_group_insert();

-- 3. Check existing policies on groups table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'groups';

-- 4. Check if groups table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'groups' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check RLS status on groups table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'groups';

-- 6. Test manual group insertion (run this while authenticated in your app)
-- This will help identify if the issue is with RLS or the application
INSERT INTO public.groups (name, created_by) 
VALUES ('Debug Test Group', auth.uid())
RETURNING *;

-- 7. Check if there are any existing groups
SELECT COUNT(*) as group_count FROM public.groups;

-- 8. Check current user's groups (if any exist)
SELECT * FROM public.groups WHERE created_by = auth.uid();

-- 9. Test the enhanced policies by trying to insert with different scenarios
-- (These should all fail for unauthenticated users)
DO $$
BEGIN
    -- Test 1: Insert without authentication (should fail)
    BEGIN
        INSERT INTO public.groups (name, created_by) 
        VALUES ('Test 1', '00000000-0000-0000-0000-000000000000');
        RAISE NOTICE 'Test 1 FAILED: Insert succeeded without proper auth';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Test 1 PASSED: Insert properly blocked - %', SQLERRM;
    END;
    
    -- Test 2: Insert with null created_by (should fail)
    BEGIN
        INSERT INTO public.groups (name, created_by) 
        VALUES ('Test 2', NULL);
        RAISE NOTICE 'Test 2 FAILED: Insert succeeded with null created_by';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Test 2 PASSED: Insert properly blocked - %', SQLERRM;
    END;
END $$;

-- 10. Clean up test data (run this after testing)
-- DELETE FROM public.groups WHERE name LIKE 'Debug Test Group%' OR name LIKE 'Test %';
