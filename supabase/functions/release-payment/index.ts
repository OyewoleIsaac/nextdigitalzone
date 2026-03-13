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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { job_id } = await req.json();

    if (!job_id) {
      return new Response(JSON.stringify({ error: "Missing job_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch job — customer must confirm
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
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

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
    const workmanshipCost = job.workmanship_cost || 0;
    const materialCost = job.material_cost || 0;

    const artisanWorkmanshipShare = Math.round(workmanshipCost * 0.80);
    const platformWorkmanshipFee = workmanshipCost - artisanWorkmanshipShare;
    const artisanTotal = materialCost + artisanWorkmanshipShare;

    const updatedArtisanAmount = artisanTotal > 0 ? artisanTotal : payment.artisan_amount;
    const updatedCommission = artisanTotal > 0
      ? (payment.amount - updatedArtisanAmount)
      : payment.commission_amount;

    // === TRY TO PAY ARTISAN VIA PAYSTACK ===
    let transferCode: string | null = null;
    let transferStatus = "pending";
    let transferMessage = "Payment marked for manual transfer (no subaccount configured)";

    if (job.artisan_id) {
      // Get artisan's Paystack recipient code from their subaccount
      const { data: artisanProfile } = await adminSupabase
        .from("artisan_profiles")
        .select("paystack_subaccount_code")
        .eq("user_id", job.artisan_id)
        .single();

      if (artisanProfile?.paystack_subaccount_code) {
        // Paystack split-pay already sent artisan's portion during initial charge.
        // For split-pay: funds go directly to subaccount at charge time.
        // We just need to record the release — the money is already with the artisan.
        // However, if this was a wallet-only payment (no Paystack involved), we need a manual transfer.
        const paystackRef = payment.paystack_reference || "";
        const isWalletOnly = paystackRef.startsWith("wallet-credit-");

        if (!isWalletOnly) {
          // Paystack split-pay already handled fund routing — just mark as released
          transferMessage = "Funds routed to artisan's Paystack subaccount via split payment";
          transferStatus = "released";
        } else {
          // Wallet-only payment — we need to credit artisan's wallet on the platform
          // since there's no Paystack transaction to split
          const { data: artisanWallet } = await adminSupabase
            .from("profiles")
            .select("wallet_balance")
            .eq("user_id", job.artisan_id)
            .single();

          const currentBalance = artisanWallet?.wallet_balance ?? 0;
          await adminSupabase
            .from("profiles")
            .update({ wallet_balance: currentBalance + updatedArtisanAmount })
            .eq("user_id", job.artisan_id);

          await adminSupabase.from("wallet_transactions").insert({
            user_id: job.artisan_id,
            amount: updatedArtisanAmount,
            type: "credit",
            description: `Job payment received for job ${job_id.slice(0, 8)}`,
            reference: job_id,
          });

          transferMessage = "Artisan paid via platform wallet credit (wallet-paid job)";
          transferStatus = "released";
        }
      } else {
        // No subaccount — credit artisan's platform wallet and notify admin to pay manually
        const { data: artisanWallet } = await adminSupabase
          .from("profiles")
          .select("wallet_balance")
          .eq("user_id", job.artisan_id)
          .single();

        const currentBalance = artisanWallet?.wallet_balance ?? 0;
        await adminSupabase
          .from("profiles")
          .update({ wallet_balance: currentBalance + updatedArtisanAmount })
          .eq("user_id", job.artisan_id);

        await adminSupabase.from("wallet_transactions").insert({
          user_id: job.artisan_id,
          amount: updatedArtisanAmount,
          type: "credit",
          description: `Job payment for job ${job_id.slice(0, 8)} — pending bank setup`,
          reference: job_id,
        });

        // Notify the artisan they have earnings pending bank account setup
        await adminSupabase.from("notifications").insert({
          user_id: job.artisan_id,
          job_id,
          title: "Payment received — set up bank account",
          body: `₦${(updatedArtisanAmount / 100).toLocaleString()} has been credited to your platform wallet. Please add your bank details in your profile to receive future payments directly.`,
          type: "payment",
        });

        transferMessage = "Artisan has no bank subaccount — amount credited to platform wallet. Artisan notified to add bank details.";
        transferStatus = "released";
      }
    }

    // Update payment record
    await adminSupabase
      .from("payments")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
        artisan_amount: updatedArtisanAmount,
        commission_amount: updatedCommission,
        ...(transferCode ? { paystack_transfer_code: transferCode } : {}),
      })
      .eq("id", payment.id);

    // Update job to confirmed
    await supabase.from("jobs").update({
      status: "confirmed",
      guarantee_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq("id", job_id);

    const breakdownNote = workmanshipCost > 0
      ? `Payment released — Materials: ₦${(materialCost / 100).toLocaleString()} (100%), Workmanship to artisan: ₦${(artisanWorkmanshipShare / 100).toLocaleString()} (80%), Platform fee: ₦${(platformWorkmanshipFee / 100).toLocaleString()} (20%). ${transferMessage}`
      : `Payment of ₦${(updatedArtisanAmount / 100).toLocaleString()} released to artisan. ${transferMessage}`;

    await supabase.from("job_status_history").insert({
      job_id,
      old_status: "completed",
      new_status: "confirmed",
      changed_by: userId,
      notes: breakdownNote,
    });

    // Notify artisan of confirmed completion (if they have subaccount — already paid)
    if (job.artisan_id) {
      await adminSupabase.from("notifications").upsert({
        user_id: job.artisan_id,
        job_id,
        title: "Job confirmed — payment released",
        body: `Customer confirmed the job is complete. Your earnings of ₦${(updatedArtisanAmount / 100).toLocaleString()} have been released.`,
        type: "payment",
      });

      // Send Resend email to artisan
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        try {
          const { data: artData } = await adminSupabase.auth.admin.getUserById(job.artisan_id);
          const artEmail = artData?.user?.email;
          if (artEmail) {
            const siteUrl = Deno.env.get("SITE_URL") || "https://ndzservices360.com";
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendKey}`,
              },
              body: JSON.stringify({
                from: "NDZ Services 360 <no-reply@ndzservices360.com>",
                to: [artEmail],
                subject: "Payment released — job confirmed",
                html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                  <h2 style="color:#f97316;">NDZ Services 360</h2>
                  <p>Hi, your payment of <strong>₦${(updatedArtisanAmount / 100).toLocaleString()}</strong> for the job <strong>"${job.title || job_id.slice(0, 8)}"</strong> has been released.</p>
                  <p>${transferMessage}</p>
                  <div style="text-align:center;margin:24px 0;">
                    <a href="${siteUrl}/artisan/dashboard" style="background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">View Dashboard →</a>
                  </div>
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
                  <p style="color:#9ca3af;font-size:12px;">NDZ Services 360 · Nigeria's Trusted Artisan Platform</p>
                </body></html>`,
              }),
            });
          }
        } catch (e) {
          console.warn("Release payment email error:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment released and job confirmed",
        artisan_amount: updatedArtisanAmount,
        platform_fee: updatedCommission,
        transfer_status: transferStatus,
        transfer_message: transferMessage,
      }),
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
