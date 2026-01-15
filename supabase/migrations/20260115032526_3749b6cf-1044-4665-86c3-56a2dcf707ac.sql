-- Fix the permissive upload policy to be more restrictive
DROP POLICY IF EXISTS "Anyone can upload attachments" ON public.submission_attachments;

-- Create a more restrictive policy that only allows inserts with valid submission types
CREATE POLICY "Anyone can upload attachments with valid data"
    ON public.submission_attachments FOR INSERT
    WITH CHECK (
        submission_type IN ('client', 'artisan') 
        AND submission_id IS NOT NULL 
        AND file_path IS NOT NULL
    );