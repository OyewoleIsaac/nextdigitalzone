
-- Add wallet_balance to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance integer NOT NULL DEFAULT 0;

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  description text NOT NULL,
  reference text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view own transactions
CREATE POLICY "Users can view own wallet transactions"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can do all
CREATE POLICY "Admins can do all on wallet transactions"
  ON public.wallet_transactions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Service role inserts (edge functions use service role key)
CREATE POLICY "Service role can insert wallet transactions"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (true);
