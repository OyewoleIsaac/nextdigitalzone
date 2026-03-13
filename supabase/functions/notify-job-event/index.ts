import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type JobEvent =
  | "artisan_assigned"
  | "quote_submitted"
  | "quote_accepted"
  | "inspection_done"
  | "inspection_confirmed"
  | "job_completed"
  | "payment_released";

interface Payload {
  job_id: string;
  event: JobEvent;
}

async function sendEmail(
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
    const text = await res.text();
    console.warn("Resend error:", res.status, text);
  }
}

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#ffffff;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:24px;">
    <tr><td>
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#f97316;font-size:22px;margin:0;">NDZ Services 360</h1>
      </div>
      ${content}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:12px;text-align:center;">NDZ Services 360 · Nigeria's Trusted Artisan Platform</p>
    </td></tr>
  </table>
</body></html>`;
}

const siteUrl = Deno.env.get("SITE_URL") || "https://ndzservices360.com";

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

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.warn("RESEND_API_KEY not set — skipping email");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { job_id, event }: Payload = await req.json();

    // Fetch job with customer and artisan profiles
    const { data: job } = await supabase
      .from("jobs")
      .select(
        `*, category:categories(name),
         customer_profile:profiles!jobs_customer_id_fkey(full_name, email:auth_email),
         artisan_profile:profiles!jobs_artisan_id_fkey(full_name, email:auth_email)`
      )
      .eq("id", job_id)
      .single();

    if (!job) {
      console.warn("Job not found:", job_id);
      return new Response(JSON.stringify({ success: false, error: "Job not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch emails from auth.users (profiles table may not store email directly)
    const customerUserId = job.customer_id;
    const artisanUserId = job.artisan_id;

    const getEmail = async (userId: string | null): Promise<string | null> => {
      if (!userId) return null;
      const { data } = await supabase.auth.admin.getUserById(userId);
      return data?.user?.email ?? null;
    };

    const customerEmail = await getEmail(customerUserId);
    const artisanEmail = await getEmail(artisanUserId);

    const customerName =
      (job.customer_profile as any)?.full_name || "Customer";
    const artisanName =
      (job.artisan_profile as any)?.full_name || "Artisan";
    const jobTitle = job.title || "your service request";
    const categoryName = (job.category as any)?.name || "";
    const shortId = job_id.slice(0, 8).toUpperCase();

    const dashboardUrl = `${siteUrl}/dashboard`;
    const artisanDashUrl = `${siteUrl}/artisan/dashboard`;

    const btn = (label: string, url: string) =>
      `<div style="text-align:center;margin:28px 0;">
         <a href="${url}" style="background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold;display:inline-block;">${label} →</a>
       </div>`;

    switch (event) {
      case "artisan_assigned": {
        // Email customer
        if (customerEmail) {
          await sendEmail(
            resendKey,
            customerEmail,
            "An artisan has been assigned to your request",
            baseTemplate(`
              <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${customerName}</strong>,</p>
              <p style="color:#374151;font-size:16px;line-height:1.6;">
                Great news! An artisan (<strong>${artisanName}</strong>) has been assigned to your service request:
                <strong>"${jobTitle}"</strong> (Ref: ${shortId}).
              </p>
              <p style="color:#374151;font-size:16px;line-height:1.6;">
                The artisan will contact you to schedule an inspection visit. You can view the details in your dashboard.
              </p>
              ${btn("View My Request", dashboardUrl)}
            `)
          );
        }
        // Email artisan
        if (artisanEmail) {
          await sendEmail(
            resendKey,
            artisanEmail,
            "New job assigned to you",
            baseTemplate(`
              <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${artisanName}</strong>,</p>
              <p style="color:#374151;font-size:16px;line-height:1.6;">
                A new job has been assigned to you: <strong>"${jobTitle}"</strong>${categoryName ? ` (${categoryName})` : ""} (Ref: ${shortId}).
              </p>
              <p style="color:#374151;font-size:16px;line-height:1.6;">
                Please visit the customer's location for an inspection and mark it as done on your dashboard.
              </p>
              ${btn("View Job", artisanDashUrl)}
            `)
          );
        }
        break;
      }

      case "quote_submitted": {
        if (customerEmail) {
          const amount = job.quoted_amount
            ? `₦${(job.quoted_amount / 100).toLocaleString()}`
            : "pending";
          await sendEmail(
            resendKey,
            customerEmail,
            "You have received a quote for your service request",
            baseTemplate(`
              <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${customerName}</strong>,</p>
              <p style="color:#374151;font-size:16px;line-height:1.6;">
                <strong>${artisanName}</strong> has submitted a quote of <strong>${amount}</strong> for your request
                <strong>"${jobTitle}"</strong> (Ref: ${shortId}).
              </p>
              <p style="color:#374151;font-size:16px;line-height:1.6;">
                Log in to review the breakdown and accept or decline the quote.
              </p>
              ${btn("Review Quote", dashboardUrl)}
            `)
          );
        }
        break;
      }

      case "quote_accepted": {
        if (artisanEmail) {
          await sendEmail(
            resendKey,
            artisanEmail,
            "Your quote has been accepted — awaiting payment",
            baseTemplate(`
              <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${artisanName}</strong>,</p>
              <p style="color:#374151;font-size:16px;line-height:1.6;">
                The customer has accepted your quote for <strong>"${jobTitle}"</strong> (Ref: ${shortId}).
                They are now proceeding to payment. Work should only begin once payment is confirmed.
              </p>
              ${btn("View Job", artisanDashUrl)}
            `)
          );
        }
        break;
      }

      case "inspection_done": {
        if (customerEmail) {
          await sendEmail(
            resendKey,
            customerEmail,
            "Your artisan has completed the inspection",
            baseTemplate(`
              <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${customerName}</strong>,</p>
              <p style="color:#374151;font-size:16px;line-height:1.6;">
                <strong>${artisanName}</strong> has marked the inspection as done for
                <strong>"${jobTitle}"</strong> (Ref: ${shortId}).
              </p>
              <p style="color:#374151;font-size:16px;line-height:1.6;">
                Please log in and confirm the inspection so the artisan can submit a quote.
              </p>
              ${btn("Confirm Inspection", dashboardUrl)}
            `)
          );
        }
        break;
      }

      case "inspection_confirmed": {
        if (artisanEmail) {
          await sendEmail(
            resendKey,
            artisanEmail,
            "Inspection confirmed — submit your quote",
            baseTemplate(`
              <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${artisanName}</strong>,</p>
              <p style="color:#374151;font-size:16px;line-height:1.6;">
                The customer has confirmed the inspection for <strong>"${jobTitle}"</strong> (Ref: ${shortId}).
                You can now log in and submit your quote.
              </p>
              ${btn("Submit Quote", artisanDashUrl)}
            `)
          );
        }
        break;
      }

      case "job_completed": {
        if (customerEmail) {
          await sendEmail(
            resendKey,
            customerEmail,
            "Your job is complete — please confirm",
            baseTemplate(`
              <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${customerName}</strong>,</p>
              <p style="color:#374151;font-size:16px;line-height:1.6;">
                <strong>${artisanName}</strong> has submitted proof of completion for
                <strong>"${jobTitle}"</strong> (Ref: ${shortId}).
              </p>
              <p style="color:#374151;font-size:16px;line-height:1.6;">
                Please review the uploaded photos and confirm the job is done to release payment to the artisan.
              </p>
              ${btn("Confirm Completion", dashboardUrl)}
            `)
          );
        }
        break;
      }

      case "payment_released": {
        if (artisanEmail) {
          const amount = job.final_amount ?? job.quoted_amount;
          const amountStr = amount
            ? `₦${(amount / 100).toLocaleString()}`
            : "your earnings";
          await sendEmail(
            resendKey,
            artisanEmail,
            "Payment has been released to you",
            baseTemplate(`
              <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${artisanName}</strong>,</p>
              <p style="color:#374151;font-size:16px;line-height:1.6;">
                The customer has confirmed completion of <strong>"${jobTitle}"</strong> (Ref: ${shortId}).
                <strong>${amountStr}</strong> has been released to you.
              </p>
              <p style="color:#374151;font-size:16px;line-height:1.6;">
                If you haven't set up your bank account for direct transfers, please add your bank details in your profile.
              </p>
              ${btn("View Dashboard", artisanDashUrl)}
            `)
          );
        }
        break;
      }

      default:
        console.warn("Unknown event:", event);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("notify-job-event error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
