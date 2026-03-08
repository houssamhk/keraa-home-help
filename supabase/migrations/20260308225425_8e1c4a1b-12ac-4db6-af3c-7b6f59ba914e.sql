
-- Drop the broken notification policy and recreate correctly
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.participant_1 = auth.uid() AND c.participant_2 = notifications.user_id)
       OR (c.participant_2 = auth.uid() AND c.participant_1 = notifications.user_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.contracts ct
    WHERE (ct.landlord_id = auth.uid() AND (ct.tenant_id = notifications.user_id OR ct.handyman_id = notifications.user_id))
       OR (ct.tenant_id = auth.uid() AND (ct.landlord_id = notifications.user_id OR ct.handyman_id = notifications.user_id))
       OR (ct.handyman_id = auth.uid() AND (ct.landlord_id = notifications.user_id OR ct.tenant_id = notifications.user_id))
  )
  OR EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE (a.owner_id = auth.uid() AND a.tenant_id = notifications.user_id)
       OR (a.tenant_id = auth.uid() AND a.owner_id = notifications.user_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.service_requests sr
    JOIN public.handymen h ON h.id = sr.handyman_id
    WHERE (sr.client_id = auth.uid() AND h.user_id = notifications.user_id)
       OR (h.user_id = auth.uid() AND sr.client_id = notifications.user_id)
  )
  OR public.has_role(auth.uid(), 'admin')
);
