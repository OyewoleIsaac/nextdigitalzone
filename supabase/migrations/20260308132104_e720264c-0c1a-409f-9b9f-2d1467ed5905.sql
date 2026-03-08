
-- Fix profiles UPDATE policies: drop restrictive ones, recreate as permissive
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix artisan_profiles UPDATE policies
DROP POLICY IF EXISTS "Artisans can update own artisan profile" ON public.artisan_profiles;
DROP POLICY IF EXISTS "Admins can update all artisan profiles" ON public.artisan_profiles;

CREATE POLICY "Artisans can update own artisan profile"
  ON public.artisan_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all artisan profiles"
  ON public.artisan_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
