-- Fix 1: Update the trigger to also assign admin role to new users
-- This ensures users can actually access the admin dashboard after signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_admin_user();

CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create admin profile
  INSERT INTO public.admin_profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Admin User'),
    NEW.email
  );
  
  -- CRITICAL FIX: Assign admin role so user can actually access data
  -- Without this, users have credentials but no permissions
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin'::app_role);
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_admin_user();

-- Fix 2: For any existing users without admin role, assign it now
-- This fixes the "credentials exist but can't login" issue
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;