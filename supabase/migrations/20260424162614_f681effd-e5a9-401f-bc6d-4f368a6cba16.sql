UPDATE public.profiles
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('onboarding_completed', true)
WHERE role_type IS NOT NULL
  AND role_type IN ('owner', 'tenant', 'handyman', 'provider')
  AND COALESCE((settings->>'onboarding_completed')::boolean, false) = false;