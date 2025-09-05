-- Migration: Create missing tables for SplitEasy
-- This migration creates the expenses, group_members, expense_participants, and profiles tables

-- Create profiles table (user profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    paid_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category TEXT DEFAULT 'other',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create expense_participants table
CREATE TABLE IF NOT EXISTS public.expense_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    share_amount DECIMAL(10,2) NOT NULL CHECK (share_amount >= 0),
    UNIQUE(expense_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON public.expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by_user_id ON public.expenses(paid_by_user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON public.expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_expense_participants_expense_id ON public.expense_participants(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_participants_user_id ON public.expense_participants(user_id);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- RLS Policies for group_members table
CREATE POLICY "Users can view group members of their groups" ON public.group_members
    FOR SELECT TO authenticated
    USING (
        group_id IN (
            SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Group admins can add members" ON public.group_members
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_id = group_members.group_id 
            AND user_id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Group admins can update members" ON public.group_members
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_id = group_members.group_id 
            AND user_id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Group admins can remove members" ON public.group_members
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_id = group_members.group_id 
            AND user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for expenses table
CREATE POLICY "Users can view expenses of their groups" ON public.expenses
    FOR SELECT TO authenticated
    USING (
        group_id IN (
            SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Group members can add expenses" ON public.expenses
    FOR INSERT TO authenticated
    WITH CHECK (
        group_id IN (
            SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Expense creators can update their expenses" ON public.expenses
    FOR UPDATE TO authenticated
    USING (paid_by_user_id = auth.uid());

CREATE POLICY "Expense creators can delete their expenses" ON public.expenses
    FOR DELETE TO authenticated
    USING (paid_by_user_id = auth.uid());

-- RLS Policies for expense_participants table
CREATE POLICY "Users can view expense participants of their groups" ON public.expense_participants
    FOR SELECT TO authenticated
    USING (
        expense_id IN (
            SELECT e.id FROM public.expenses e
            JOIN public.group_members gm ON e.group_id = gm.group_id
            WHERE gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Group members can add expense participants" ON public.expense_participants
    FOR INSERT TO authenticated
    WITH CHECK (
        expense_id IN (
            SELECT e.id FROM public.expenses e
            JOIN public.group_members gm ON e.group_id = gm.group_id
            WHERE gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Group members can update expense participants" ON public.expense_participants
    FOR UPDATE TO authenticated
    USING (
        expense_id IN (
            SELECT e.id FROM public.expenses e
            JOIN public.group_members gm ON e.group_id = gm.group_id
            WHERE gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Group members can delete expense participants" ON public.expense_participants
    FOR DELETE TO authenticated
    USING (
        expense_id IN (
            SELECT e.id FROM public.expenses e
            JOIN public.group_members gm ON e.group_id = gm.group_id
            WHERE gm.user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.group_members TO authenticated;
GRANT ALL ON public.expenses TO authenticated;
GRANT ALL ON public.expense_participants TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.profiles IS 'User profiles for SplitEasy app';
COMMENT ON TABLE public.group_members IS 'Membership information for expense groups';
COMMENT ON TABLE public.expenses IS 'Expenses within groups';
COMMENT ON TABLE public.expense_participants IS 'User participation in specific expenses';

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
