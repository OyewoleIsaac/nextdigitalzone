
-- Allow authenticated and anon users to insert attachment records
-- (the "Service role can insert attachments" policy only covers service_role, not client-side uploads)
CREATE POLICY "Authenticated users can insert attachments"
  ON public.submission_attachments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon users can insert attachments"
  ON public.submission_attachments FOR INSERT
  TO anon
  WITH CHECK (true);
