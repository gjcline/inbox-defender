import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
    const googleRedirectUri = Deno.env.get("GOOGLE_REDIRECT_URI") || "";

    // Extract suffix (last 8 chars of first segment before dash)
    const clientIdSuffix = googleClientId.split('-')[0].slice(-8);

    // Return only safe, non-sensitive info
    return new Response(
      JSON.stringify({
        client_id_suffix: clientIdSuffix,
        redirect_uri: googleRedirectUri,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Debug env error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to retrieve environment info",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
