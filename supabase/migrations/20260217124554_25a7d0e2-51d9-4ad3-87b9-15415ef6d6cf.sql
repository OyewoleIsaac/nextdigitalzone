
-- Create job_status enum
CREATE TYPE public.job_status AS ENUM (
  'pending',
  'assigned',
  'quoted',
  'inspection_requested',
  'inspection_paid',
  'price_agreed',
  'payment_escrowed',
  'in_progress',
  'completed',
  'confirmed',
  'disputed',
  'cancelled'
);

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  artisan_id UUID,
  category_id UUID REFERENCES public.categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status public.job_status NOT NULL DEFAULT 'pending',
  requires_inspection BOOLEAN NOT NULL DEFAULT false,
  inspection_fee INTEGER,
  quoted_amount INTEGER,
  final_amount INTEGER,
  commission_percent INTEGER NOT NULL DEFAULT 20,
  assigned_by TEXT,
  admin_assigner_id UUID,
  photo_before TEXT,
  photo_after TEXT,
  guarantee_expires_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create job_status_history table
CREATE TABLE public.job_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  old_status public.job_status,
  new_status public.job_status NOT NULL,
  changed_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;

-- Jobs RLS policies
CREATE POLICY "Customers can view own jobs" ON public.jobs
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own jobs" ON public.jobs
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own jobs" ON public.jobs
  FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Artisans can view assigned jobs" ON public.jobs
  FOR SELECT USING (auth.uid() = artisan_id);

CREATE POLICY "Artisans can update assigned jobs" ON public.jobs
  FOR UPDATE USING (auth.uid() = artisan_id);

CREATE POLICY "Admins can do all on jobs" ON public.jobs
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Job status history RLS
CREATE POLICY "Users can view history for their jobs" ON public.job_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_status_history.job_id
      AND (jobs.customer_id = auth.uid() OR jobs.artisan_id = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can insert history" ON public.job_status_history
  FOR INSERT WITH CHECK (auth.uid() = changed_by);

CREATE POLICY "Admins can do all on job history" ON public.job_status_history
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Updated_at trigger for jobs
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create job-photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('job-photos', 'job-photos', false);

-- Storage policies for job-photos
CREATE POLICY "Authenticated users can upload job photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'job-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view job photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'job-photos' AND auth.role() = 'authenticated');

-- Enable realtime for jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
