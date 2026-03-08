import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Use getUser() instead of deprecated getClaims()
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { job_id, payment_type, amount } = await req.json();

    if (!job_id || !payment_type || !amount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the job
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only the customer can pay
    if (job.customer_id !== userId) {
      return new Response(JSON.stringify({ error: "Only the customer can make payments" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get customer profile for email
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, full_name")
      .eq("user_id", userId)
      .single();

    const commissionPercent = job.commission_percent || 20;
    const commissionAmount = Math.round(amount * commissionPercent / 100);
    const artisanAmount = amount - commissionAmount;

    // For inspection fee payments, artisan_id may not exist yet — use a placeholder
    const artisanId = job.artisan_id || "00000000-0000-0000-0000-000000000000";

    const reference = `ndz_${job_id.slice(0, 8)}_${Date.now()}`;

    // Build Paystack payload
    const paystackPayload: Record<string, unknown> = {
      email: `${profile?.phone || userId.slice(0, 8)}@ndz.app`,
      amount, // in kobo
      reference,
      callback_url: `${req.headers.get("origin") || "https://nextdigitalzone.lovable.app"}/dashboard?payment=success&job_id=${job_id}`,
      metadata: {
        job_id,
        payment_type,
        customer_id: userId,
        artisan_id: artisanId,
        commission_amount: commissionAmount,
        artisan_amount: artisanAmount,
      },
    };

    // If artisan has subaccount, use split payment
    if (job.artisan_id) {
      const { data: artisanProfile } = await supabase
        .from("artisan_profiles")
        .select("paystack_subaccount_code")
        .eq("user_id", job.artisan_id)
        .single();

      if (artisanProfile?.paystack_subaccount_code) {
        paystackPayload.subaccount = artisanProfile.paystack_subaccount_code;
        paystackPayload.bearer = "account";
        paystackPayload.transaction_charge = commissionAmount;
      }
    }

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paystackPayload),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      console.error("Paystack error:", paystackData.message);
      return new Response(JSON.stringify({ error: "Failed to initialize payment", details: paystackData.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert/upsert payment record (use service role to avoid RLS issues on insert)
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: insertError } = await serviceSupabase.from("payments").insert({
      job_id,
      customer_id: userId,
      artisan_id: artisanId,
      amount,
      commission_amount: commissionAmount,
      artisan_amount: artisanAmount,
      payment_type,
      status: "pending",
      paystack_reference: reference,
    });

    if (insertError) {
      console.error("Payment insert error:", insertError);
    }

    return new Response(
      JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        reference,
        access_code: paystackData.data.access_code,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Initialize payment error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
