
-- Fix 1: Add admin authorization check to assign_admin_role function
CREATE OR REPLACE FUNCTION public.assign_admin_role(target_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_user_id UUID;
BEGIN
  -- SECURITY: Only admins can assign admin roles
  -- Exception: if no admin exists yet, allow first admin setup
  IF public.has_any_admin() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Find user by email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please register first.', target_email;
  END IF;
  
  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN TRUE;
END;
$function$;
