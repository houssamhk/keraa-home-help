-- Revoke public access to all profile-related views and grant only to authenticated users

REVOKE ALL ON public.public_profiles FROM anon;
GRANT SELECT ON public.public_profiles TO authenticated;

REVOKE ALL ON public.public_handymen FROM anon;
GRANT SELECT ON public.public_handymen TO authenticated;

REVOKE ALL ON public.appointment_partner_profiles FROM anon;
GRANT SELECT ON public.appointment_partner_profiles TO authenticated;

REVOKE ALL ON public.contract_partner_profiles FROM anon;
GRANT SELECT ON public.contract_partner_profiles TO authenticated;

REVOKE ALL ON public.conversation_partner_profiles FROM anon;
GRANT SELECT ON public.conversation_partner_profiles TO authenticated;

REVOKE ALL ON public.historical_contract_partners FROM anon;
GRANT SELECT ON public.historical_contract_partners TO authenticated;
