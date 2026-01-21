-- Create storage bucket for form uploads if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-uploads', 'form-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload to form-uploads bucket (for form submissions)
CREATE POLICY "Anyone can upload form files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'form-uploads');

-- Only admins can view/download form uploads
CREATE POLICY "Admins can view form uploads"
ON storage.objects
FOR SELECT
USING (bucket_id = 'form-uploads' AND public.is_admin());

-- Only admins can delete form uploads
CREATE POLICY "Admins can delete form uploads"
ON storage.objects
FOR DELETE
USING (bucket_id = 'form-uploads' AND public.is_admin());