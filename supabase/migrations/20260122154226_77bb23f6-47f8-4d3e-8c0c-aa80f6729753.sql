-- 1. Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Add encrypted NIN column to client_submissions
ALTER TABLE public.client_submissions 
ADD COLUMN IF NOT EXISTS nin_encrypted bytea;

-- 3. Create rate limiting table
CREATE TABLE IF NOT EXISTS public.submission_rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address text NOT NULL,
  endpoint text NOT NULL,
  attempt_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  UNIQUE(ip_address, endpoint)
);

-- Enable RLS on rate limits table
ALTER TABLE public.submission_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow public insert/update for rate limiting (edge function will manage this)
CREATE POLICY "Service role can manage rate limits"
ON public.submission_rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Drop the old open storage policies for both buckets
DROP POLICY IF EXISTS "Anyone can upload form files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload verification docs" ON storage.objects;

-- 5. Create new restrictive storage policies with file type validation
-- For form-uploads bucket - only allow safe file types (pdf, jpg, jpeg, png, gif, webp)
CREATE POLICY "Validated file uploads only for form-uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'form-uploads' AND
  (
    storage.filename(name) ILIKE '%.pdf' OR 
    storage.filename(name) ILIKE '%.jpg' OR
    storage.filename(name) ILIKE '%.jpeg' OR
    storage.filename(name) ILIKE '%.png' OR
    storage.filename(name) ILIKE '%.gif' OR
    storage.filename(name) ILIKE '%.webp' OR
    storage.filename(name) ILIKE '%.doc' OR
    storage.filename(name) ILIKE '%.docx'
  )
);

-- For verification-docs bucket - only allow document types
CREATE POLICY "Validated file uploads only for verification-docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification-docs' AND
  (
    storage.filename(name) ILIKE '%.pdf' OR 
    storage.filename(name) ILIKE '%.jpg' OR
    storage.filename(name) ILIKE '%.jpeg' OR
    storage.filename(name) ILIKE '%.png'
  )
);

-- 6. Revoke direct insert on client_submissions and artisan_submissions for anonymous users
-- (submissions will go through edge function instead)
DROP POLICY IF EXISTS "Anyone can submit client forms" ON public.client_submissions;
DROP POLICY IF EXISTS "Anyone can submit artisan forms" ON public.artisan_submissions;

-- Create new policies that only allow service_role to insert
CREATE POLICY "Service role can insert client submissions"
ON public.client_submissions
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can insert artisan submissions"
ON public.artisan_submissions
FOR INSERT
TO service_role
WITH CHECK (true);

-- 7. Drop direct insert policy on submission_attachments
DROP POLICY IF EXISTS "Anyone can upload attachments with valid data" ON public.submission_attachments;

-- Create new policy for service role only
CREATE POLICY "Service role can insert attachments"
ON public.submission_attachments
FOR INSERT
TO service_role
WITH CHECK (true);