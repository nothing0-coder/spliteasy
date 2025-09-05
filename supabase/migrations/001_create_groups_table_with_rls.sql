-- Migration: Create groups table with proper RLS policies
-- This migration creates the groups table with the specified schema and implements
-- row-level security policies for SplitEasy expense-splitting app

-- Create the groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON public.groups(created_at);

-- Enable Row Level Security
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Policy 1: Users can select groups they created
CREATE POLICY "Users can select groups they created" ON public.groups
    FOR SELECT 
    TO authenticated
    USING (created_by = auth.uid());

-- Policy 2: Users can insert groups
CREATE POLICY "Users can insert groups" ON public.groups
    FOR INSERT 
    TO authenticated
    WITH CHECK (created_by = auth.uid());

-- Policy 3: Users can update groups they created
CREATE POLICY "Users can update groups they created" ON public.groups
    FOR UPDATE 
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Policy 4: Users can delete groups they created
CREATE POLICY "Users can delete groups they created" ON public.groups
    FOR DELETE 
    TO authenticated
    USING (created_by = auth.uid());

-- Grant necessary permissions to authenticated users
GRANT ALL ON public.groups TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.groups IS 'Expense splitting groups in SplitEasy app';
COMMENT ON COLUMN public.groups.id IS 'Unique identifier for the group';
COMMENT ON COLUMN public.groups.name IS 'Display name of the group';
COMMENT ON COLUMN public.groups.created_by IS 'User ID of the group creator (references auth.users)';
COMMENT ON COLUMN public.groups.created_at IS 'Timestamp when the group was created';