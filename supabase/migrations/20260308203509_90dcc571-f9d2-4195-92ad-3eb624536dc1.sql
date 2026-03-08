
-- 1. Add inspection/agency fields to categories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS requires_inspection boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_inspection_fee integer NOT NULL DEFAULT 200000,
  ADD COLUMN IF NOT EXISTS is_agency_job boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_agency_fee integer NOT NULL DEFAULT 500000;

-- 2. Add material/workmanship quote fields + agency fields to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS material_cost integer NULL,
  ADD COLUMN IF NOT EXISTS workmanship_cost integer NULL,
  ADD COLUMN IF NOT EXISTS agreed_salary integer NULL,
  ADD COLUMN IF NOT EXISTS agency_commission_percent integer NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS materials_allocated_at timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS workmanship_released_at timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS artisan_offer_status text NULL CHECK (artisan_offer_status IN ('pending','accepted','rejected'));

-- 3. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  job_id uuid NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can do all on notifications"
  ON public.notifications FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Index for fast user notification lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_job_id ON public.notifications(job_id);
