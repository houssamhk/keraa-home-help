
-- 1. Fix handyman GPS exposure: replace broken appointment check
DROP POLICY IF EXISTS "Business partners can view full handyman details" ON public.handymen;

CREATE POLICY "Business partners can view full handyman details"
ON public.handymen
FOR SELECT
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.contracts ct
    WHERE ct.handyman_id = handymen.user_id
      AND ct.status = ANY (ARRAY['active', 'completed', 'signed', 'pending'])
      AND (ct.landlord_id = auth.uid() OR ct.tenant_id = auth.uid())
  ))
  OR (EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE (
      (a.owner_id = auth.uid() AND a.tenant_id = handymen.user_id)
      OR (a.tenant_id = auth.uid() AND a.owner_id = handymen.user_id)
    )
  ))
  OR (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (
      (c.participant_1 = handymen.user_id AND c.participant_2 = auth.uid())
      OR (c.participant_2 = handymen.user_id AND c.participant_1 = auth.uid())
    )
  ))
);

-- 2. Remove user self-notification injection policy
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;

-- 3. Add RLS policies to partner profile views
ALTER VIEW public.appointment_partner_profiles SET (security_invoker = true);
ALTER VIEW public.contract_partner_profiles SET (security_invoker = true);
ALTER VIEW public.conversation_partner_profiles SET (security_invoker = true);
ALTER VIEW public.historical_contract_partners SET (security_invoker = true);
ALTER VIEW public.public_profiles SET (security_invoker = true);
ALTER VIEW public.public_handymen SET (security_invoker = true);
