
-- Restore notification insert policy: allow authenticated users to send notifications 
-- to other users they have a relationship with (conversations, contracts, appointments)
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if sender has a conversation with the target user
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id IS NOT NULL
      AND (
        (c.participant_1 = auth.uid() AND c.participant_2 = user_id)
        OR (c.participant_2 = auth.uid() AND c.participant_1 = user_id)
      )
  )
  -- Or has a contract with the target user
  OR EXISTS (
    SELECT 1 FROM public.contracts ct
    WHERE (
      (ct.landlord_id = auth.uid() AND (ct.tenant_id = user_id OR ct.handyman_id = user_id))
      OR (ct.tenant_id = auth.uid() AND (ct.landlord_id = user_id OR ct.handyman_id = user_id))
      OR (ct.handyman_id = auth.uid() AND (ct.landlord_id = user_id OR ct.tenant_id = user_id))
    )
  )
  -- Or has an appointment with the target user
  OR EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE (
      (a.owner_id = auth.uid() AND a.tenant_id = user_id)
      OR (a.tenant_id = auth.uid() AND a.owner_id = user_id)
    )
  )
  -- Or has a service request with the target user
  OR EXISTS (
    SELECT 1 FROM public.service_requests sr
    JOIN public.handymen h ON h.id = sr.handyman_id
    WHERE (
      (sr.client_id = auth.uid() AND h.user_id = user_id)
      OR (h.user_id = auth.uid() AND sr.client_id = user_id)
    )
  )
  -- Or is admin
  OR public.has_role(auth.uid(), 'admin')
);
