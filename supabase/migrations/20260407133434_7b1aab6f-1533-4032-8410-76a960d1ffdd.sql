
ALTER TABLE public.profiles DISABLE TRIGGER check_profile_sensitive_fields;
ALTER TABLE public.profiles DISABLE TRIGGER enforce_profile_sensitive_fields;

UPDATE public.profiles 
SET role_type = 'owner', kyc_verified = true, phone = '0555000001'
WHERE user_id = '58c7e1aa-a825-4395-a7a5-914b42f6ad21';

UPDATE public.profiles 
SET role_type = 'tenant', kyc_verified = true, phone = '0555000002'
WHERE user_id = '949aef58-593d-46ea-8de0-2cc34e106328';

ALTER TABLE public.profiles ENABLE TRIGGER check_profile_sensitive_fields;
ALTER TABLE public.profiles ENABLE TRIGGER enforce_profile_sensitive_fields;

INSERT INTO public.kyc_verifications (user_id, id_type, status, verified_at, submitted_at)
VALUES 
  ('58c7e1aa-a825-4395-a7a5-914b42f6ad21', 'national_id', 'verified', NOW(), NOW()),
  ('949aef58-593d-46ea-8de0-2cc34e106328', 'national_id', 'verified', NOW(), NOW())
ON CONFLICT DO NOTHING;
