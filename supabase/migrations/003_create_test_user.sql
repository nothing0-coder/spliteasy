-- Create a test user for development
-- This is only for local development testing

-- Insert a test user into auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NULL,
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Insert corresponding profile
INSERT INTO public.profiles (
  id,
  full_name,
  avatar_url,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test User',
  NULL,
  NOW()
);
