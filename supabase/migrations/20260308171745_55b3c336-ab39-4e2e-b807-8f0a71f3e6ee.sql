-- Allow anon (unauthenticated) users to insert submissions
-- This is needed because after signUp() with email confirmation,
-- the user session is not yet active, so auth.uid() = null.

-- Allow anon inserts on client_submissions
CREATE POLICY "Anon users can insert client submissions"
  ON public.client_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon inserts on artisan_submissions
CREATE POLICY "Anon users can insert artisan submissions"
  ON public.artisan_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Also allow anon to insert profiles (needed when signUp session is not yet active)
CREATE POLICY "Anon users can insert profiles"
  ON public.profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Also allow anon to insert artisan_profiles
CREATE POLICY "Anon users can insert artisan profiles"
  ON public.artisan_profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);