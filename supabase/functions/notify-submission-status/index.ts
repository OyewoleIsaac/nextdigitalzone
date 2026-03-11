import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
      subject = `🎉 Your NDZ Services 360 account has been approved!`;
      htmlBody = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family: Arial, sans-serif; background: #ffffff; margin: 0; padding: 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 24px;">
            <tr><td>
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #f97316; font-size: 24px; margin: 0;">NDZ Services 360</h1>
              </div>
              <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="color: #166534; font-size: 20px; margin: 0 0 8px 0;">✅ Account Approved!</h2>
                <p style="color: #15803d; margin: 0; font-size: 15px;">Your ${roleLabel} account has been verified and is now active.</p>
              </div>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi <strong>${firstName}</strong>,</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Our admin team has reviewed your application and your NDZ Services 360 ${roleLabel} account has been <strong>approved</strong>. You can now log in and start using the platform.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${Deno.env.get('SITE_URL') || 'https://ndzservices360.com'}/login"
                   style="background: #f97316; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
                  Go to My Dashboard →
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">NDZ Services 360 · Nigeria's Trusted Artisan Platform</p>
            </td></tr>
          </table>
        </body></html>
      `;
    } else {
      subject = `Your NDZ Services 360 application – Update`;
      htmlBody = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family: Arial, sans-serif; background: #ffffff; margin: 0; padding: 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 24px;">
            <tr><td>
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #f97316; font-size: 24px; margin: 0;">NDZ Services 360</h1>
              </div>
              <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="color: #991b1b; font-size: 20px; margin: 0 0 8px 0;">Application Update</h2>
                <p style="color: #dc2626; margin: 0; font-size: 15px;">Unfortunately, your ${roleLabel} application was not approved at this time.</p>
              </div>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi <strong>${firstName}</strong>,</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Thank you for applying to join NDZ Services 360 as a ${roleLabel}. After reviewing your application, we were unable to approve it at this time.
              </p>
              ${rejection_reason ? `
              <div style="background: #f9fafb; border-left: 4px solid #e5e7eb; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <p style="color: #374151; font-size: 15px; margin: 0;"><strong>Reason:</strong></p>
                <p style="color: #6b7280; font-size: 15px; margin: 8px 0 0 0;">${rejection_reason}</p>
              </div>
              ` : ''}
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                You may address the issues above and re-apply. If you believe this was an error, please contact support.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">NDZ Services 360 · Nigeria's Trusted Artisan Platform</p>
            </td></tr>
          </table>
        </body></html>
      `;
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'NDZ Services 360 <no-reply@ndzservices360.com>',
        to: [email],
        subject,
        html: htmlBody,
      }),
    });

    const responseText = await emailResponse.text();
    console.log('Email API response:', emailResponse.status, responseText);

    if (!emailResponse.ok) {
      // Fallback: log to admin_logs for audit trail
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      await adminClient.from('admin_logs').insert({
        action: `email_notification_${status}`,
        target_type: `${role}_submission`,
        details: { email, full_name, status, role, rejection_reason, email_error: responseText },
      });

      console.warn('Email delivery failed, logged to admin_logs');
      return new Response(JSON.stringify({ success: false, logged: true, error: responseText }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
