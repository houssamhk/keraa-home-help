-- Allow authenticated users to browse available handymen (public listing)
CREATE POLICY "Authenticated users can browse available handymen"
ON public.handymen
FOR SELECT
TO authenticated
USING (is_available = true);
