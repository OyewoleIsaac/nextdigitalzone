
-- Allow admins to read files from form-uploads bucket (for viewing submission attachments)
CREATE POLICY "Admins can read form-uploads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'form-uploads' AND public.is_admin()
  );

-- Allow admins to read files from verification-docs bucket (for viewing ID documents)
CREATE POLICY "Admins can read verification-docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-docs' AND public.is_admin()
  );

-- Allow authenticated users to upload to form-uploads bucket
CREATE POLICY "Authenticated users can upload to form-uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'form-uploads');

-- Allow anon users to upload to form-uploads bucket (for public forms)
CREATE POLICY "Anon users can upload to form-uploads"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'form-uploads');

-- Allow authenticated users to upload to verification-docs bucket
CREATE POLICY "Authenticated users can upload to verification-docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'verification-docs');

-- Allow anon users to upload to verification-docs bucket
CREATE POLICY "Anon users can upload to verification-docs"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'verification-docs');
