-- Manual Insert Test for Supabase SQL Editor
-- Run these queries in your Supabase SQL Editor to test group creation

-- 1. Check current authentication status
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'Authenticated'
    ELSE 'Not Authenticated'
  END as auth_status;

-- 2. Test manual group insertion (run this while authenticated in your app)
-- This will only work if you're logged in through your web application
INSERT INTO public.groups (name, created_by) 
VALUES ('Manual Test Group ' || extract(epoch from now()), auth.uid())
RETURNING id, name, created_by, created_at;

-- 3. Check if the insert was successful
SELECT 
  id,
  name,
  created_by,
  created_at,
  CASE 
    WHEN created_by = auth.uid() THEN 'Owned by current user'
    ELSE 'Not owned by current user'
  END as ownership_status
FROM public.groups 
WHERE name LIKE 'Manual Test Group%'
ORDER BY created_at DESC
LIMIT 5;

-- 4. Test RLS policies by trying to insert with different user ID
-- This should fail due to RLS policy
DO $$
BEGIN
  BEGIN
    INSERT INTO public.groups (name, created_by) 
    VALUES ('RLS Test Group', '00000000-0000-0000-0000-000000000000');
    RAISE NOTICE 'RLS Test FAILED: Insert succeeded when it should have been blocked';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'RLS Test PASSED: Insert properly blocked - %', SQLERRM;
  END;
END $$;

-- 5. Test null constraint
-- This should fail due to NOT NULL constraint
DO $$
BEGIN
  BEGIN
    INSERT INTO public.groups (name, created_by) 
    VALUES ('Null Test Group', NULL);
    RAISE NOTICE 'Null Test FAILED: Insert succeeded with NULL created_by';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Null Test PASSED: Insert properly blocked - %', SQLERRM;
  END;
END $$;

-- 6. Check existing groups for current user
SELECT 
  COUNT(*) as total_groups,
  COUNT(CASE WHEN created_by = auth.uid() THEN 1 END) as owned_groups
FROM public.groups;

-- 7. Clean up test data (uncomment to run)
-- DELETE FROM public.groups WHERE name LIKE 'Manual Test Group%' OR name LIKE 'RLS Test Group%' OR name LIKE 'Null Test Group%';

