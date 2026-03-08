
-- Add foreign key from artisan_profiles.user_id to profiles.user_id
-- This enables the Supabase PostgREST join used in the admin Jobs page
ALTER TABLE public.artisan_profiles
  ADD CONSTRAINT artisan_profiles_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
