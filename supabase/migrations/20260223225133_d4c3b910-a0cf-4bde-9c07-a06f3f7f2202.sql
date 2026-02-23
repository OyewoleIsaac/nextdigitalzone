
-- Create payment type enum
CREATE TYPE public.payment_type AS ENUM ('inspection_fee', 'job_payment');

-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'held', 'released', 'refunded');

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  artisan_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL DEFAULT 0,
  artisan_amount INTEGER NOT NULL DEFAULT 0,
  payment_type public.payment_type NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  paystack_reference TEXT UNIQUE,
  paystack_transfer_code TEXT,
  paid_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Customers can view their own payments
CREATE POLICY "Customers can view own payments"
ON public.payments FOR SELECT
USING (auth.uid() = customer_id);

-- Artisans can view payments for their jobs
CREATE POLICY "Artisans can view own payments"
ON public.payments FOR SELECT
USING (auth.uid() = artisan_id);

-- Admins can do all on payments
CREATE POLICY "Admins can do all on payments"
ON public.payments FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Service role / edge functions insert payments (via service role key)
CREATE POLICY "Service role can insert payments"
ON public.payments FOR INSERT
WITH CHECK (true);

-- Service role can update payments (for webhook status updates)
CREATE POLICY "Service role can update payments"
ON public.payments FOR UPDATE
USING (true);
