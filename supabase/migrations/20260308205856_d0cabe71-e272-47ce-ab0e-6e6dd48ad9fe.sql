
-- 1. Cascade delete artisan_profiles when profiles row is deleted
ALTER TABLE public.artisan_profiles
  DROP CONSTRAINT IF EXISTS artisan_profiles_user_id_profiles_fkey;

ALTER TABLE public.artisan_profiles
  ADD CONSTRAINT artisan_profiles_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 2. Allow users to delete their own profile (hard delete)
CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admins to delete any profile
CREATE POLICY "Admins can delete profiles"
  ON public.profiles
  FOR DELETE
  USING (is_admin());

-- 3. Allow admins and artisans to delete artisan profiles
CREATE POLICY "Admins can delete artisan profiles"
  ON public.artisan_profiles
  FOR DELETE
  USING (is_admin());

CREATE POLICY "Artisans can delete own artisan profile"
  ON public.artisan_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Nullify artisan_id on jobs when artisan_profile is deleted (not delete the job)
--    We handle this via the FK relationship: jobs.artisan_id references profiles.user_id
--    Let's add SET NULL cascade so jobs don't get deleted, just unassigned

-- jobs table: ensure artisan_id set to null when artisan profile user is deleted from profiles
-- First check if there's an existing FK from jobs.artisan_id
-- jobs.artisan_id is just a uuid column (no FK constraint enforced currently), 
-- so just document that app code handles this.
