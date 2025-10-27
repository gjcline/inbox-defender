import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OAuthCallbackRequest {
  code: string;
  userId: string;
}

interface OAuthState {
  userId: string;
  clientId: string;
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

function parseOAuthState(stateParam: string): OAuthState | null {
  try {
    const decoded = base64urlDecode(stateParam);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to parse OAuth state:', error);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const requestUrl = new URL(req.url);
  console.log("=== Gmail OAuth Callback Started ===");
  console.log("Method:", req.method);
  console.log("URL:", requestUrl.toString());
  console.log("Query Params:", Object.fromEntries(requestUrl.searchParams));

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://app.bliztic.com";

    // Single source of truth for redirect URI
    const REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI") ?? "https://app.bliztic.com/api/auth/google/callback";

    console.log("Environment check:");
    console.log("- Supabase URL:", supabaseUrl ? "✓" : "✗");
    console.log("- Service Key:", supabaseServiceKey ? "✓" : "✗");
    console.log("- Google Client ID:", googleClientId ? "✓" : "✗");
    console.log("- Google Client Secret:", googleClientSecret ? "✓" : "✗");
    console.log("- Frontend URL:", frontendUrl);

    if (!googleClientId || !googleClientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let code: string;
    let userId: string;

    console.log("Using redirect URI:", REDIRECT_URI);

    // Handle both GET (from Google OAuth) and POST (legacy/testing)
    if (req.method === "GET") {
      console.log("Processing GET request (OAuth callback from Google)");
      code = requestUrl.searchParams.get("code") || "";
      const stateParam = requestUrl.searchParams.get("state") || "";
      console.log("Extracted from query params:");
      console.log("- Code:", code ? `${code.substring(0, 20)}...` : "missing");
      console.log("- State:", stateParam ? `${stateParam.substring(0, 20)}...` : "missing");

      // Parse and verify state
      const state = parseOAuthState(stateParam);
      if (!state) {
        return new Response(
          JSON.stringify({
            ok: false,
            reason: "invalid_state",
            detail: "Failed to parse OAuth state parameter",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      userId = state.userId;

      // Sanity check: verify client ID suffix matches
      const edgeClientIdSuffix = googleClientId.split('-')[0].slice(-8);
      if (state.clientId !== edgeClientIdSuffix) {
        console.error("client_id_mismatch", {
          frontend_suffix: state.clientId,
          edge_suffix: edgeClientIdSuffix,
          state_param: stateParam,
        });

        return new Response(
          JSON.stringify({
            ok: false,
            reason: "client_id_mismatch",
            detail: `OAuth configuration mismatch. Frontend client ID suffix (${state.clientId}) does not match backend (${edgeClientIdSuffix}). Please check your environment variables.`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("✓ Client ID verification passed");
    } else if (req.method === "POST") {
      console.log("Processing POST request (legacy mode)");
      const body: OAuthCallbackRequest = await req.json();
      code = body.code;
      userId = body.userId;
      console.log("Extracted from POST body:");
      console.log("- Code:", code ? `${code.substring(0, 20)}...` : "missing");
      console.log("- User ID:", userId || "missing");
    } else {
      throw new Error(`Unsupported method: ${req.method}`);
    }

    if (!code || !userId) {
      console.error("Missing required parameters:", { code: !!code, userId: !!userId });
      throw new Error("Missing required parameters");
    }

    console.log("Step 1: Exchanging authorization code for tokens...");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errTxt = await tokenResponse.text();
      console.error("token_exchange_failed", {
        status: tokenResponse.status,
        body: errTxt,
        redirect_uri: REDIRECT_URI,
      });

      // Return error response for frontend toast
      return new Response(
        JSON.stringify({
          ok: false,
          reason: "token_exchange_failed",
          detail: errTxt.slice(0, 500),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;
    console.log("✓ Token exchange successful");
    console.log("- Access token:", access_token ? "received" : "missing");
    console.log("- Refresh token:", refresh_token ? "received" : "missing");
    console.log("- Expires in:", expires_in, "seconds");

    console.log("Step 2: Fetching Gmail user info...");
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error("Failed to fetch user info");
    }

    const userInfo = await userInfoResponse.json();
    const { email, id: googleUserId } = userInfo;
    console.log("✓ User info fetched");
    console.log("- Email:", email);
    console.log("- Google User ID:", googleUserId);

    console.log("Step 3: Checking for existing mailbox...");
    const { data: existingMailbox } = await supabase
      .from("mailboxes")
      .select("id")
      .eq("email_address", email)
      .maybeSingle();

    let mailboxId: string;

    if (existingMailbox) {
      mailboxId = existingMailbox.id;
      console.log("✓ Found existing mailbox:", mailboxId);

      console.log("Updating existing mailbox...");
      await supabase
        .from("mailboxes")
        .update({
          gmail_user_id: googleUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mailboxId);
      console.log("✓ Mailbox updated");
    } else {
      console.log("Creating new mailbox...");
      const { data: newMailbox, error: mailboxError } = await supabase
        .from("mailboxes")
        .insert({
          user_id: userId,
          email_address: email,
          gmail_user_id: googleUserId,
        })
        .select()
        .single();

      if (mailboxError) {
        console.error("Mailbox creation error:", mailboxError);
        throw mailboxError;
      }
      mailboxId = newMailbox.id;
      console.log("✓ New mailbox created:", mailboxId);
    }

    console.log("Step 4: Saving Gmail connection...");
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const { error: connectionError } = await supabase
      .from("gmail_connections")
      .upsert({
        user_id: userId,
        mailbox_id: mailboxId,
        access_token,
        refresh_token,
        token_expires_at: expiresAt,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,mailbox_id",
      });

    if (connectionError) {
      console.error("Connection save error:", connectionError);
      throw connectionError;
    }
    console.log("✓ Gmail connection saved");

    const { error: settingsError } = await supabase
      .from("user_settings")
      .upsert({
        user_id: userId,
      }, {
        onConflict: "user_id",
        ignoreDuplicates: true,
      });

    if (settingsError) {
      console.error("Settings creation error:", settingsError);
    }

    console.log("Step 5: Triggering initial sync...");
    // Trigger an immediate sync after successful connection
    try {
      const syncResponse = await fetch(`${supabaseUrl}/functions/v1/gmail-sync-cron`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "apikey": supabaseServiceKey,
        },
        body: JSON.stringify({
          triggered_by: "oauth_callback",
          user_id: userId,
        }),
      });

      if (syncResponse.ok) {
        console.log("✓ Initial sync triggered successfully");
      } else {
        console.error("Failed to trigger initial sync:", await syncResponse.text());
      }
    } catch (syncError) {
      console.error("Error triggering initial sync:", syncError);
      // Don't fail the OAuth flow if sync fails
    }

    console.log("=== OAuth Callback Completed Successfully ===");

    // For GET requests (OAuth callback), redirect to dashboard
    if (req.method === "GET") {
      const dashboardUrl = `${frontendUrl}/dashboard?gmail_connected=1`;
      console.log("Redirecting to:", dashboardUrl);
      return new Response(null, {
        status: 302,
        headers: {
          "Location": dashboardUrl,
        },
      });
    }

    // For POST requests (legacy), return JSON
    return new Response(
      JSON.stringify({
        success: true,
        message: "Gmail connected successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("=== OAuth Callback Error ===");
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }

    // For GET requests (OAuth callback), redirect to dashboard with error
    if (req.method === "GET") {
      const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://app.bliztic.com";
      const errorMessage = error instanceof Error ? error.message : "OAuth callback failed";
      const dashboardUrl = `${frontendUrl}/dashboard?gmail_error=${encodeURIComponent(errorMessage)}`;
      console.log("Redirecting to dashboard with error:", dashboardUrl);
      return new Response(null, {
        status: 302,
        headers: {
          "Location": dashboardUrl,
        },
      });
    }

    // For POST requests (legacy), return JSON error
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "OAuth callback failed",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});