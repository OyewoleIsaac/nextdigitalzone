ALTER TABLE public.artisan_profiles
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_code TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS account_name TEXT;