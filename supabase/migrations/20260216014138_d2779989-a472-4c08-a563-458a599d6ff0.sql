
-- Create user_role enum
CREATE TYPE public.user_role AS ENUM ('customer', 'artisan');

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  avatar_url text,
  address text,
  latitude double precision,
  longitude double precision,
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create artisan_profiles table (extended artisan data)
CREATE TABLE public.artisan_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id),
  custom_category text,
  years_experience integer,
  bio text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  service_radius_km integer NOT NULL DEFAULT 10,
  is_available boolean NOT NULL DEFAULT true,
  rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  total_jobs integer NOT NULL DEFAULT 0,
  completed_jobs integer NOT NULL DEFAULT 0,
  cancelled_jobs integer NOT NULL DEFAULT 0,
  paystack_subaccount_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artisan_profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Artisan profiles RLS policies
CREATE POLICY "Artisans can view own artisan profile"
  ON public.artisan_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Artisans can insert own artisan profile"
  ON public.artisan_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Artisans can update own artisan profile"
  ON public.artisan_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all artisan profiles"
  ON public.artisan_profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all artisan profiles"
  ON public.artisan_profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_artisan_profiles_updated_at
  BEFORE UPDATE ON public.artisan_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
