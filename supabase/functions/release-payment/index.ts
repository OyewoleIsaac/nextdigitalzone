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

    const { job_id } = await req.json();

    if (!job_id) {
      return new Response(JSON.stringify({ error: "Missing job_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch job - customer must confirm
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

    if (job.customer_id !== userId) {
      return new Response(JSON.stringify({ error: "Only the customer can confirm completion" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (job.status !== "completed") {
      return new Response(JSON.stringify({ error: "Job must be in completed status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for payment updates
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the held payment
    const { data: payment } = await adminSupabase
      .from("payments")
      .select("*")
      .eq("job_id", job_id)
      .eq("payment_type", "job_payment")
      .eq("status", "held")
      .single();

    if (!payment) {
      // No escrowed payment — just confirm the job
      await supabase.from("jobs").update({
        status: "confirmed",
        guarantee_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq("id", job_id);

      await supabase.from("job_status_history").insert({
        job_id,
        old_status: "completed",
        new_status: "confirmed",
        changed_by: userId,
        notes: "Customer confirmed completion (no escrow payment)",
      });

      return new Response(JSON.stringify({ success: true, message: "Job confirmed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === WORKMANSHIP SPLIT: 80% to artisan, 20% platform fee ===
    // Materials portion goes 100% to cover costs; only workmanship is split
    const workmanshipCost = job.workmanship_cost || 0;
    const materialCost = job.material_cost || 0;

    // Artisan receives: full materials + 80% of workmanship
    const artisanWorkmanshipShare = Math.round(workmanshipCost * 0.80);
    const platformWorkmanshipFee = workmanshipCost - artisanWorkmanshipShare;
    const artisanTotal = materialCost + artisanWorkmanshipShare;

    // Update payment record with correct artisan amount
    const updatedArtisanAmount = artisanTotal > 0 ? artisanTotal : payment.artisan_amount;
    const updatedCommission = artisanTotal > 0 
      ? (payment.amount - updatedArtisanAmount)
      : payment.commission_amount;

    await adminSupabase
      .from("payments")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
        artisan_amount: updatedArtisanAmount,
        commission_amount: updatedCommission,
      })
      .eq("id", payment.id);

    // Update job
    await supabase.from("jobs").update({
      status: "confirmed",
      guarantee_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq("id", job_id);

    const notes = workmanshipCost > 0
      ? `Payment released — Materials: ₦${(materialCost / 100).toLocaleString()} (100%), Workmanship to artisan: ₦${(artisanWorkmanshipShare / 100).toLocaleString()} (80%), Platform fee: ₦${(platformWorkmanshipFee / 100).toLocaleString()} (20%)`
      : `Payment of ₦${(payment.amount / 100).toLocaleString()} released to artisan`;

    await supabase.from("job_status_history").insert({
      job_id,
      old_status: "completed",
      new_status: "confirmed",
      changed_by: userId,
      notes,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Payment released and job confirmed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Release payment error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
