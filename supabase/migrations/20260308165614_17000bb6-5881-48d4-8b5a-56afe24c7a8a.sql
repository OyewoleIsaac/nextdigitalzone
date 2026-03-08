
-- Fix 1: Allow authenticated users to insert their own submissions during signup
-- (Currently only "Service role" can insert, but signup.tsx uses the anon client with auth)

-- Client submissions: allow authenticated users to insert
CREATE POLICY "Authenticated users can insert client submissions"
  ON public.client_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Artisan submissions: allow authenticated users to insert
CREATE POLICY "Authenticated users can insert artisan submissions"
  ON public.artisan_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fix 2: Allow authenticated users to read artisan profiles for admin job assignment
-- (Admins + artisans already have select, but the admin needs it via edge function too)
CREATE POLICY "Authenticated users can view artisan profiles for matching"
  ON public.artisan_profiles
  FOR SELECT
  TO authenticated
  USING (true);
