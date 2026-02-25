
-- Create violation_type enum
CREATE TYPE public.violation_type AS ENUM ('bypass_attempt', 'no_show', 'poor_quality', 'other');

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  artisan_id UUID NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT rating_range CHECK (rating >= 1 AND rating <= 5)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can insert own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Admins can do all on reviews" ON public.reviews FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Create artisan_violations table
CREATE TABLE public.artisan_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artisan_id UUID NOT NULL,
  violation_type public.violation_type NOT NULL,
  reported_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.artisan_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do all on violations" ON public.artisan_violations FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Artisans can view own violations" ON public.artisan_violations FOR SELECT USING (auth.uid() = artisan_id);

-- Trigger: update artisan rating_avg when review inserted
CREATE OR REPLACE FUNCTION public.update_artisan_rating()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.artisan_profiles
  SET rating_avg = (
    SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE artisan_id = NEW.artisan_id
  ),
  updated_at = now()
  WHERE user_id = NEW.artisan_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_artisan_rating
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_artisan_rating();

-- Trigger: update artisan job counters on job status change
CREATE OR REPLACE FUNCTION public.update_artisan_job_counts()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.artisan_id IS NOT NULL AND NEW.status != OLD.status THEN
    IF NEW.status = 'confirmed' THEN
      UPDATE public.artisan_profiles
      SET completed_jobs = completed_jobs + 1, total_jobs = total_jobs + 1, updated_at = now()
      WHERE user_id = NEW.artisan_id;
    ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      UPDATE public.artisan_profiles
      SET cancelled_jobs = cancelled_jobs + 1, total_jobs = total_jobs + 1, updated_at = now()
      WHERE user_id = NEW.artisan_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_artisan_job_counts
AFTER UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.update_artisan_job_counts();
