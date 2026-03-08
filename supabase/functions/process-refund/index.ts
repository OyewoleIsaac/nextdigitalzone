import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Refund policy constants (in kobo)
const BOOKING_FEE = 500000; // ₦5,000
const PROCESSING_FEE_DEDUCTION = 30000; // ₦300 — covers Paystack transaction fee + admin overhead
const REFUNDABLE_AMOUNT = BOOKING_FEE - PROCESSING_FEE_DEDUCTION; // ₦4,700

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify admin caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Unauthorized');

    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!adminCheck) throw new Error('Not an admin');

    const { dispute_id, refund_type } = await req.json();
    // refund_type: 'partial' (₦4,700) | 'full' (₦5,000) | 'wallet_credit' (₦5,000 credit, no Paystack fee) | 'none'

    if (!dispute_id) throw new Error('dispute_id is required');

    // Fetch dispute
    const { data: dispute, error: disputeErr } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', dispute_id)
      .single();
    if (disputeErr || !dispute) throw new Error('Dispute not found');
    if (dispute.status !== 'open') throw new Error('Dispute is not open');

    // Find the booking fee payment for this job
    const { data: payment, error: paymentErr } = await supabase
      .from('payments')
      .select('*')
      .eq('job_id', dispute.job_id)
      .eq('payment_type', 'inspection_fee')
      .eq('status', 'paid')
      .maybeSingle();

    if (paymentErr) throw new Error('Error fetching payment: ' + paymentErr.message);

    let refundResult = null;

    if (refund_type === 'wallet_credit') {
      // Issue ₦5,000 as platform wallet credit — no Paystack fee, no loss to admin
      const creditAmount = BOOKING_FEE; // full ₦5,000 in kobo

      // Insert wallet transaction
      const { error: walletTxErr } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: dispute.customer_id,
          amount: creditAmount,
          type: 'credit',
          description: 'Refund credit for unserviced booking — dispute #' + dispute_id.slice(0, 8),
          reference: dispute_id,
        });

      if (walletTxErr) throw new Error('Failed to create wallet transaction: ' + walletTxErr.message);

      // Update profile wallet_balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', dispute.customer_id)
        .single();

      const currentBalance = profile?.wallet_balance ?? 0;

      await supabase
        .from('profiles')
        .update({ wallet_balance: currentBalance + creditAmount })
        .eq('user_id', dispute.customer_id);

      // Mark payment as refunded
      if (payment) {
        await supabase
          .from('payments')
          .update({ status: 'refunded' })
          .eq('id', payment.id);
      }

      // Cancel job
      await supabase
        .from('jobs')
        .update({ status: 'cancelled', cancellation_reason: `Wallet credit refund approved by admin. Reason: ${dispute.reason}` })
        .eq('id', dispute.job_id);

      refundResult = { type: 'wallet_credit', amount: creditAmount };

    } else if (refund_type !== 'none' && payment?.paystack_reference) {
      const refundAmount = refund_type === 'full' ? BOOKING_FEE : REFUNDABLE_AMOUNT;

      const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY');
      if (!PAYSTACK_SECRET) throw new Error('Paystack secret key not configured');

      // Call Paystack Refund API
      const paystackRes = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: payment.paystack_reference,
          amount: refundAmount,
        }),
      });

      const paystackData = await paystackRes.json();
      console.log('Paystack refund response:', JSON.stringify(paystackData));

      if (!paystackRes.ok || !paystackData.status) {
        throw new Error(`Paystack refund failed: ${paystackData.message || 'Unknown error'}`);
      }

      refundResult = paystackData.data;

      // Update payment record to refunded
      await supabase
        .from('payments')
        .update({ status: 'refunded' })
        .eq('id', payment.id);

      // Update job to cancelled
      await supabase
        .from('jobs')
        .update({ status: 'cancelled', cancellation_reason: `Refund approved by admin. Reason: ${dispute.reason}` })
        .eq('id', dispute.job_id);
    }

    // Resolve the dispute
    const resolutionNote = refund_type === 'none'
      ? 'Admin reviewed and closed. No refund issued.'
      : refund_type === 'wallet_credit'
        ? `Full ₦5,000 issued as platform wallet credit. No Paystack fees deducted.`
        : refund_type === 'full'
          ? `Full refund of ₦5,000 issued to customer's original payment method.`
          : `Partial refund of ₦4,700 issued (₦300 processing fee deducted).`;

    await supabase
      .from('disputes')
      .update({ status: 'resolved', resolution_notes: resolutionNote })
      .eq('id', dispute_id);

    return new Response(JSON.stringify({ success: true, refund: refundResult, resolution_notes: resolutionNote }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('process-refund error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
