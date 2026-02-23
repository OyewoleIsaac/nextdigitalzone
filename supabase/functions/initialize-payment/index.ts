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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

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

    if (!job.artisan_id) {
      return new Response(JSON.stringify({ error: "No artisan assigned to this job" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get customer email for Paystack
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, full_name")
      .eq("user_id", userId)
      .single();

    const commissionPercent = job.commission_percent || 20;
    const commissionAmount = Math.round(amount * commissionPercent / 100);
    const artisanAmount = amount - commissionAmount;

    const reference = `ndz_${job_id.slice(0, 8)}_${Date.now()}`;

    // Check for artisan subaccount for split payment
    const { data: artisanProfile } = await supabase
      .from("artisan_profiles")
      .select("paystack_subaccount_code")
      .eq("user_id", job.artisan_id)
      .single();

    // Initialize Paystack transaction
    const paystackPayload: Record<string, unknown> = {
      email: `${profile?.phone || "customer"}@ndz.app`,
      amount, // already in kobo
      reference,
      callback_url: `${req.headers.get("origin") || "https://nextdigitalzone.lovable.app"}/dashboard?payment=success&job_id=${job_id}`,
      metadata: {
        job_id,
        payment_type,
        customer_id: userId,
        artisan_id: job.artisan_id,
        commission_amount: commissionAmount,
        artisan_amount: artisanAmount,
      },
    };

    // If artisan has subaccount, use split payment
    if (artisanProfile?.paystack_subaccount_code) {
      paystackPayload.subaccount = artisanProfile.paystack_subaccount_code;
      paystackPayload.bearer = "account"; // platform bears transaction charges
      paystackPayload.transaction_charge = commissionAmount; // platform gets this
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
      return new Response(JSON.stringify({ error: "Failed to initialize payment", details: paystackData.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert payment record
    const { error: insertError } = await supabase.from("payments").insert({
      job_id,
      customer_id: userId,
      artisan_id: job.artisan_id,
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
