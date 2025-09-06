-- Enhanced RLS Policies with Better Debugging
-- This migration improves the existing RLS policies and adds debugging functions

-- Debug function to check authentication status
CREATE OR REPLACE FUNCTION public.debug_auth()
RETURNS TABLE (
  current_user_id uuid,
  current_role text
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT auth.uid(), auth.role();
$$;

-- Create a debug function to test group insertion
CREATE OR REPLACE FUNCTION public.test_group_insert()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result jsonb;
  current_user_id uuid;
BEGIN
  SELECT auth.uid() INTO current_user_id;
  
  result := jsonb_build_object(
    'auth_uid', current_user_id,
    'auth_role', auth.role(),
    'can_insert', CASE 
      WHEN current_user_id IS NOT NULL THEN 'yes' 
      ELSE 'no' 
    END
  );
  
  RETURN result;
END;
$$;

-- Drop existing policies to recreate them with better debugging
DROP POLICY IF EXISTS "Users can select groups they created" ON public.groups;
DROP POLICY IF EXISTS "Users can insert groups" ON public.groups;
DROP POLICY IF EXISTS "Users can update groups they created" ON public.groups;
DROP POLICY IF EXISTS "Users can delete groups they created" ON public.groups;

-- Improved SELECT policy
CREATE POLICY "Users can select groups they created" ON public.groups
    FOR SELECT 
    TO authenticated
    USING (created_by = auth.uid());

-- Improved INSERT policy with better debugging
CREATE POLICY "Users can insert groups" ON public.groups
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        auth.uid() = created_by
    );

-- Improved UPDATE policy
CREATE POLICY "Users can update groups they created" ON public.groups
    FOR UPDATE 
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Improved DELETE policy
CREATE POLICY "Users can delete groups they created" ON public.groups
    FOR DELETE 
    TO authenticated
    USING (created_by = auth.uid());

-- REMOVED: Temporary debugging policy for production security
-- CREATE POLICY "groups_debug_insert" ON public.groups
--     FOR INSERT TO authenticated
--     WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON public.groups TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.debug_auth() IS 'Debug function to check current authentication status';
COMMENT ON FUNCTION public.test_group_insert() IS 'Debug function to test group insertion capabilities';
