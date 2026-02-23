import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY")!;
    const body = await req.text();

    // Verify Paystack signature
    const signature = req.headers.get("x-paystack-signature");
    const hash = createHmac("sha512", secret).update(body).digest("hex");

    if (hash !== signature) {
      console.error("Invalid Paystack signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(body);

    // Use service role for DB writes
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event.event === "charge.success") {
      const { reference, metadata } = event.data;
      const { job_id, payment_type, customer_id, artisan_id } = metadata || {};

      // Update payment status
      const { error: paymentError } = await supabase
        .from("payments")
        .update({
          status: payment_type === "job_payment" ? "held" : "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("paystack_reference", reference);

      if (paymentError) {
        console.error("Payment update error:", paymentError);
      }

      // Update job status based on payment type
      if (payment_type === "inspection_fee" && job_id) {
        await supabase
          .from("jobs")
          .update({ status: "inspection_paid" })
          .eq("id", job_id);

        await supabase.from("job_status_history").insert({
          job_id,
          old_status: "inspection_requested",
          new_status: "inspection_paid",
          changed_by: customer_id,
          notes: "Inspection fee paid via Paystack",
        });
      } else if (payment_type === "job_payment" && job_id) {
        await supabase
          .from("jobs")
          .update({ status: "payment_escrowed", final_amount: event.data.amount })
          .eq("id", job_id);

        await supabase.from("job_status_history").insert({
          job_id,
          old_status: "price_agreed",
          new_status: "payment_escrowed",
          changed_by: customer_id,
          notes: `Payment of ₦${(event.data.amount / 100).toLocaleString()} held in escrow`,
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
