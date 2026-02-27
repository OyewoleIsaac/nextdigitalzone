
-- Add disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  artisan_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  resolution_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can insert own disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Participants can view own disputes"
  ON public.disputes FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() = artisan_id);

CREATE POLICY "Admins can do all on disputes"
  ON public.disputes FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for disputes
ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
