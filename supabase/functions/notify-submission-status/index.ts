import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyPayload {
  email: string;
  full_name: string;
  status: 'confirmed' | 'rejected';
  role: 'customer' | 'artisan';
  rejection_reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotifyPayload = await req.json();
    const { email, full_name, status, role, rejection_reason } = payload;

    const roleLabel = role === 'artisan' ? 'artisan' : 'customer';
    const firstName = full_name.split(' ')[0] || full_name;

    let subject: string;
    let htmlBody: string;

    if (status === 'confirmed') {
      subject = `🎉 Your NDZ Marketplace account has been approved!`;
      htmlBody = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family: Arial, sans-serif; background: #ffffff; margin: 0; padding: 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 24px;">
            <tr>
              <td>
                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                    <span style="font-size: 28px;">🔨</span>
                  </div>
                  <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">NDZ Marketplace</h1>
                </div>

                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                  <h2 style="color: #166534; font-size: 20px; margin: 0 0 8px 0;">✅ Account Approved!</h2>
                  <p style="color: #15803d; margin: 0; font-size: 15px;">Your ${roleLabel} account has been verified and is now active.</p>
                </div>

                <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi <strong>${firstName}</strong>,</p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  Great news! Our admin team has reviewed your application and your NDZ Marketplace ${roleLabel} account has been <strong>approved</strong>.
                </p>

                ${role === 'customer' ? `
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">You can now:</p>
                <ul style="color: #374151; font-size: 16px; line-height: 1.8; padding-left: 20px;">
                  <li>Request services from verified artisans</li>
                  <li>Post job requests and get quotes</li>
                  <li>Track your service requests in your dashboard</li>
                </ul>
                ` : `
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">You can now:</p>
                <ul style="color: #374151; font-size: 16px; line-height: 1.8; padding-left: 20px;">
                  <li>Receive job assignments from customers</li>
                  <li>Manage your service requests</li>
                  <li>Track your earnings in your dashboard</li>
                </ul>
                `}

                <div style="text-align: center; margin: 32px 0;">
                  <a href="https://nextdigitalzone.lovable.app/login"
                     style="background: #f97316; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
                    Go to My Dashboard →
                  </a>
                </div>

                <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                  If you have any questions, please don't hesitate to contact our support team.
                </p>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                  NDZ Marketplace · Nigeria's Trusted Artisan Marketplace
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
    } else {
      subject = `Your NDZ Marketplace application – Update`;
      htmlBody = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family: Arial, sans-serif; background: #ffffff; margin: 0; padding: 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 24px;">
            <tr>
              <td>
                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                    <span style="font-size: 28px;">🔨</span>
                  </div>
                  <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">NDZ Marketplace</h1>
                </div>

                <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                  <h2 style="color: #991b1b; font-size: 20px; margin: 0 0 8px 0;">Application Update</h2>
                  <p style="color: #dc2626; margin: 0; font-size: 15px;">Unfortunately, your ${roleLabel} application was not approved at this time.</p>
                </div>

                <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi <strong>${firstName}</strong>,</p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  Thank you for applying to join NDZ Marketplace as a ${roleLabel}. After reviewing your application, we were unable to approve it at this time.
                </p>

                ${rejection_reason ? `
                <div style="background: #f9fafb; border-left: 4px solid #e5e7eb; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                  <p style="color: #374151; font-size: 15px; margin: 0;"><strong>Reason provided:</strong></p>
                  <p style="color: #6b7280; font-size: 15px; margin: 8px 0 0 0;">${rejection_reason}</p>
                </div>
                ` : ''}

                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  You may address the issues above and re-apply. If you believe this decision was made in error, please contact our support team.
                </p>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                  NDZ Marketplace · Nigeria's Trusted Artisan Marketplace
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
    }

    // Use Lovable AI email sending API
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const emailResponse = await fetch('https://api.lovable.dev/v1/transactional-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        to: email,
        subject,
        html: htmlBody,
        purpose: 'transactional',
      }),
    });

    const responseText = await emailResponse.text();
    
    if (!emailResponse.ok) {
      console.error('Email send failed:', responseText);
      // Don't throw - email failure shouldn't block the approval action
      return new Response(JSON.stringify({ success: false, error: responseText }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Email sent successfully to:', email, 'status:', status);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('notify-submission-status error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
