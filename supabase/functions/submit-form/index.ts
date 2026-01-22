import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting configuration
const RATE_LIMIT_MAX_ATTEMPTS = 10; // Max submissions per IP per hour
const RATE_LIMIT_WINDOW_MINUTES = 60;

// NIN encryption key - stored securely as env variable
const ENCRYPTION_KEY = Deno.env.get("NIN_ENCRYPTION_KEY") || "default-key-change-in-production";

interface ClientSubmissionData {
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  nin: string;
  service_description?: string;
  category_id?: string;
  metadata?: Record<string, unknown>;
  honeypot?: string; // Hidden field to catch bots
}

interface ArtisanSubmissionData {
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  category_id?: string;
  custom_category?: string;
  years_experience?: number;
  metadata?: Record<string, unknown>;
  honeypot?: string;
}

interface AttachmentData {
  file_name: string;
  file_path: string;
  file_type?: string;
}

interface RateLimitRecord {
  id: string;
  ip_address: string;
  endpoint: string;
  attempt_count: number;
  window_start: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role client for database operations
    // deno-lint-ignore no-explicit-any
    const supabase: SupabaseClient<any> = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP for rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    const body = await req.json();
    const { type, data, attachments } = body as {
      type: "client" | "artisan";
      data: ClientSubmissionData | ArtisanSubmissionData;
      attachments?: AttachmentData[];
    };

    console.log(`[submit-form] Received ${type} submission from IP: ${clientIp}`);

    // 1. Check honeypot field - if filled, it's a bot
    if (data.honeypot && data.honeypot.trim() !== "") {
      console.log(`[submit-form] Honeypot triggered from IP: ${clientIp}`);
      // Return success to avoid alerting bots, but don't save
      return new Response(
        JSON.stringify({ success: true, id: "00000000-0000-0000-0000-000000000000" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check rate limit
    const rateLimitCheck = await checkRateLimit(supabase, clientIp, type);
    if (!rateLimitCheck.allowed) {
      console.log(`[submit-form] Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ 
          error: "Too many submissions. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED" 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 3. Validate required fields
    if (!data.full_name || !data.email) {
      return new Response(
        JSON.stringify({ error: "Full name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(data.email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;

    if (type === "client") {
      const clientData = data as ClientSubmissionData;
      
      // Validate NIN for client submissions
      if (!clientData.nin || clientData.nin.length !== 11) {
        return new Response(
          JSON.stringify({ error: "NIN must be exactly 11 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 4. Encrypt NIN using database function
      const { data: encryptedNin, error: encryptError } = await supabase.rpc(
        "encrypt_nin",
        { nin_value: clientData.nin, encryption_key: ENCRYPTION_KEY }
      );

      if (encryptError) {
        console.error("[submit-form] NIN encryption error:", encryptError);
      }

      // Remove honeypot from data and prepare submission
      const { honeypot, nin, ...cleanData } = clientData;
      
      const { data: insertResult, error } = await supabase
        .from("client_submissions")
        .insert([{
          ...cleanData,
          nin: maskNin(nin), // Store masked version for display
          nin_encrypted: encryptedNin || null, // Store encrypted version
          status: "pending",
        }])
        .select()
        .single();

      if (error) {
        console.error("[submit-form] Client submission error:", error);
        if (error.code === "23505") { // Unique violation
          return new Response(
            JSON.stringify({ error: "A submission with this email already exists" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw error;
      }

      result = insertResult;
      console.log(`[submit-form] Client submission created: ${result.id}`);

    } else if (type === "artisan") {
      const artisanData = data as ArtisanSubmissionData;
      
      // Remove honeypot from data
      const { honeypot, ...cleanData } = artisanData;

      const { data: insertResult, error } = await supabase
        .from("artisan_submissions")
        .insert([{
          ...cleanData,
          status: "pending",
        }])
        .select()
        .single();

      if (error) {
        console.error("[submit-form] Artisan submission error:", error);
        if (error.code === "23505") {
          return new Response(
            JSON.stringify({ error: "A submission with this email already exists" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw error;
      }

      result = insertResult;
      console.log(`[submit-form] Artisan submission created: ${result.id}`);
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid submission type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Save attachments if any
    if (attachments && attachments.length > 0 && result?.id) {
      const attachmentRecords = attachments.map((att) => ({
        submission_id: result.id,
        submission_type: type,
        file_name: att.file_name,
        file_path: att.file_path,
        file_type: att.file_type || null,
      }));

      const { error: attError } = await supabase
        .from("submission_attachments")
        .insert(attachmentRecords);

      if (attError) {
        console.error("[submit-form] Attachment save error:", attError);
        // Don't fail the whole submission for attachment errors
      }
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[submit-form] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Rate limiting helper
// deno-lint-ignore no-explicit-any
async function checkRateLimit(
  supabase: SupabaseClient<any>,
  ipAddress: string,
  endpoint: string
): Promise<{ allowed: boolean }> {
  try {
    // Clean old entries
    const cutoffTime = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    await supabase
      .from("submission_rate_limits")
      .delete()
      .lt("window_start", cutoffTime);

    // Check current count
    const { data: existing, error: selectError } = await supabase
      .from("submission_rate_limits")
      .select("*")
      .eq("ip_address", ipAddress)
      .eq("endpoint", endpoint)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is fine
      console.error("[submit-form] Rate limit check error:", selectError);
      return { allowed: true };
    }

    const record = existing as RateLimitRecord | null;

    if (!record) {
      // First submission from this IP
      await supabase
        .from("submission_rate_limits")
        .insert([{ ip_address: ipAddress, endpoint, attempt_count: 1 }]);
      return { allowed: true };
    }

    if (record.attempt_count >= RATE_LIMIT_MAX_ATTEMPTS) {
      return { allowed: false };
    }

    // Increment counter
    await supabase
      .from("submission_rate_limits")
      .update({ attempt_count: record.attempt_count + 1 })
      .eq("ip_address", ipAddress)
      .eq("endpoint", endpoint);

    return { allowed: true };
  } catch (error) {
    console.error("[submit-form] Rate limit check error:", error);
    // Allow submission if rate limiting fails (fail open for usability)
    return { allowed: true };
  }
}

// Mask NIN for display (show only last 4 digits)
function maskNin(nin: string): string {
  if (nin.length <= 4) return nin;
  return "*".repeat(nin.length - 4) + nin.slice(-4);
}