import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const siteUrl = Deno.env.get("SITE_URL") || "https://ndzservices360.com";

async function sendResendEmail(
  resendKey: string,
  to: string,
  subject: string,
  html: string
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "NDZ Services 360 <no-reply@ndzservices360.com>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    console.warn("Resend error:", res.status, await res.text());
  }
}

function emailTemplate(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#f97316;">NDZ Services 360</h2>
  ${content}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="color:#9ca3af;font-size:12px;">NDZ Services 360 · Nigeria's Trusted Artisan Platform</p>
</body></html>`;
}

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

      // For inspection_fee: promote job from 'draft' → 'pending' so admin can see it
      if (payment_type === "inspection_fee" && job_id) {
        // Fetch current job status to know old_status
        const { data: job } = await supabase
          .from("jobs")
          .select("status")
          .eq("id", job_id)
          .single();

        const oldStatus = job?.status || "draft";

        await supabase
          .from("jobs")
          .update({ status: "pending", inspection_fee: event.data.amount })
          .eq("id", job_id);

        await supabase.from("job_status_history").insert({
          job_id,
          old_status: oldStatus,
          new_status: "pending",
          changed_by: customer_id,
          notes: "Booking/inspection fee paid — job now active and awaiting artisan assignment",
        });

        console.log(`Job ${job_id} promoted from draft to pending after booking fee payment`);

        // Email customer confirming their request is now active
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey && customer_id) {
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(customer_id);
            const { data: jobData } = await supabase.from("jobs").select("title").eq("id", job_id).single();
            const customerEmail = userData?.user?.email;
            if (customerEmail) {
              await sendResendEmail(
                resendKey,
                customerEmail,
                "Your service request is now active",
                emailTemplate(`
                  <p>Your booking fee has been received and your service request <strong>"${jobData?.title || job_id.slice(0, 8)}"</strong> is now active.</p>
                  <p>Our team is reviewing it and will assign an artisan shortly.</p>
                  <div style="text-align:center;margin:24px 0;">
                    <a href="${siteUrl}/dashboard" style="background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">View Dashboard →</a>
                  </div>
                `)
              );
            }
          } catch (e) {
            console.warn("Email send failed (inspection fee):", e);
          }
        }

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

        // Email customer + artisan that payment is secured
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          try {
            const { data: jobData } = await supabase
              .from("jobs")
              .select("title, artisan_id")
              .eq("id", job_id)
              .single();

            if (customer_id) {
              const { data: custData } = await supabase.auth.admin.getUserById(customer_id);
              const custEmail = custData?.user?.email;
              if (custEmail) {
                await sendResendEmail(
                  resendKey,
                  custEmail,
                  "Payment secured — work will begin soon",
                  emailTemplate(`
                    <p>Your payment of <strong>₦${(event.data.amount / 100).toLocaleString()}</strong> for <strong>"${jobData?.title || ""}"</strong> has been held securely in escrow.</p>
                    <p>The artisan will now begin work. You'll release the payment once the job is done to your satisfaction.</p>
                    <div style="text-align:center;margin:24px 0;">
                      <a href="${siteUrl}/dashboard" style="background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">View Dashboard →</a>
                    </div>
                  `)
                );
              }
            }

            const artId = jobData?.artisan_id || artisan_id;
            if (artId) {
              const { data: artData } = await supabase.auth.admin.getUserById(artId);
              const artEmail = artData?.user?.email;
              if (artEmail) {
                await sendResendEmail(
                  resendKey,
                  artEmail,
                  "Customer has paid — you may begin work",
                  emailTemplate(`
                    <p>Payment of <strong>₦${(event.data.amount / 100).toLocaleString()}</strong> has been secured in escrow for <strong>"${jobData?.title || ""}"</strong>.</p>
                    <p>You can now begin work. Once you upload proof of completion, the customer will confirm and payment will be released to you.</p>
                    <div style="text-align:center;margin:24px 0;">
                      <a href="${siteUrl}/artisan/dashboard" style="background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">View Job →</a>
                    </div>
                  `)
                );
              }
            }
          } catch (e) {
            console.warn("Email send failed (job payment):", e);
          }
        }
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
