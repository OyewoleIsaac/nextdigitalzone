
-- Drop overly permissive policies
DROP POLICY "Service role can insert payments" ON public.payments;
DROP POLICY "Service role can update payments" ON public.payments;

-- Authenticated users can insert payments for themselves
CREATE POLICY "Authenticated users can insert own payments"
ON public.payments FOR INSERT
WITH CHECK (auth.uid() = customer_id);

-- Customers and artisans can update their own payments (limited)
CREATE POLICY "Participants can update own payments"
ON public.payments FOR UPDATE
USING (auth.uid() = customer_id OR auth.uid() = artisan_id);
