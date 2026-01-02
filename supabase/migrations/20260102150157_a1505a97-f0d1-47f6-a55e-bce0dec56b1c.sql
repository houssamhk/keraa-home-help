-- Make current user admin
UPDATE public.user_roles 
SET role = 'admin'::app_role 
WHERE user_id = '81750785-0639-4a7f-a598-b3411f3f731e';