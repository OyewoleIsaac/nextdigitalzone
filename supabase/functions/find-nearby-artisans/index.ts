import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { latitude, longitude, category_id, limit = 10 } = await req.json();

    if (!latitude || !longitude) {
      return new Response(JSON.stringify({ error: "latitude and longitude required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let query = supabase
      .from("artisan_profiles")
      .select("*, profile:profiles!artisan_profiles_user_id_fkey(full_name, phone, address, is_verified)")
      .eq("is_available", true);

    if (category_id) {
      query = query.eq("category_id", category_id);
    }

    const { data: artisans, error } = await query;

    if (error) throw error;

    // Calculate distances and filter by service radius
    const withDistance = (artisans || [])
      .map((a: any) => ({
        ...a,
        distance_km: haversineDistance(latitude, longitude, a.latitude, a.longitude),
      }))
      .filter((a: any) => a.distance_km <= a.service_radius_km)
      .sort((a: any, b: any) => a.distance_km - b.distance_km)
      .slice(0, limit);

    return new Response(JSON.stringify({ artisans: withDistance }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
