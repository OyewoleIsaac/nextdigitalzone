import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NIN encryption key - must match the one used for encryption
const ENCRYPTION_KEY = Deno.env.get("NIN_ENCRYPTION_KEY") || "default-key-change-in-production";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth token to verify identity
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("[decrypt-nin] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for database operations
    // deno-lint-ignore no-explicit-any
    const supabase: SupabaseClient<any> = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (adminError || !adminUser) {
      console.error("[decrypt-nin] Admin check failed:", adminError);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { submission_id, reason } = body as {
      submission_id: string;
      reason?: string;
    };

    if (!submission_id) {
      return new Response(
        JSON.stringify({ error: "submission_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[decrypt-nin] Admin ${user.id} requesting NIN for submission ${submission_id}`);

    // Get the encrypted NIN from the submission
    const { data: submission, error: subError } = await supabase
      .from("client_submissions")
      .select("id, nin_encrypted, full_name")
      .eq("id", submission_id)
      .single();

    if (subError || !submission) {
      console.error("[decrypt-nin] Submission not found:", subError);
      return new Response(
        JSON.stringify({ error: "Submission not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!submission.nin_encrypted) {
      return new Response(
        JSON.stringify({ error: "No encrypted NIN found for this submission" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt the NIN using the database function
    const { data: decryptedNin, error: decryptError } = await supabase.rpc(
      "decrypt_nin",
      { encrypted_nin: submission.nin_encrypted, encryption_key: ENCRYPTION_KEY }
    );

    if (decryptError) {
      console.error("[decrypt-nin] Decryption error:", decryptError);
      return new Response(
        JSON.stringify({ error: "Failed to decrypt NIN" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the access for audit purposes
    const { error: logError } = await supabase
      .from("admin_logs")
      .insert([{
        admin_user_id: adminUser.id,
        action: "view_nin",
        target_type: "client_submission",
        target_id: submission_id,
        details: {
          client_name: submission.full_name,
          reason: reason || "Verification",
          timestamp: new Date().toISOString(),
          ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
        },
      }]);

    if (logError) {
      console.error("[decrypt-nin] Audit log error:", logError);
      // Don't fail the request for logging errors, but log it
    }

    console.log(`[decrypt-nin] NIN decrypted and access logged for submission ${submission_id}`);

    return new Response(
      JSON.stringify({ success: true, nin: decryptedNin }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[decrypt-nin] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});