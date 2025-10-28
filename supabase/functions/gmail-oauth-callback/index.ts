import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
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

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Single source of truth for redirect URI
  const REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI") ?? "https://app.bliztic.com/api/auth/google/callback";

  console.log("using_redirect_uri", REDIRECT_URI);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    if (!googleClientId || !googleClientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let code: string = "";
    let userId: string = "";
    let stateParam: string = "";

    // Handle POST (from frontend callback page)
    if (req.method === "POST") {
      const body = await req.json();

      // Dry-run mode for testing
      if (body.dry_run === true) {
        console.log("dry_run", "short-circuit");
        return new Response(
          JSON.stringify({
            ok: true,
            mode: "dry_run",
            redirect_uri: REDIRECT_URI,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      code = body.code || "";
      stateParam = body.state || "";

      console.log("oauth_cb_begin", {
        hasCode: !!code,
        hasState: !!stateParam,
      });

      if (!code || !stateParam) {
        console.error("missing_params", { hasCode: !!code, hasState: !!stateParam });
        return new Response(
          JSON.stringify({
            ok: false,
            reason: "missing_params",
            detail: "Missing code or state parameter",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Parse and verify state
      const state = parseOAuthState(stateParam);
      if (!state) {
        console.error("invalid_state", stateParam?.slice(0, 50));
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
          fe: state.clientId,
          be: edgeClientIdSuffix,
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

      console.log("state_verified", { userId });
    } else {
      throw new Error(`Unsupported method: ${req.method}`);
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
        body: errTxt.slice(0, 400),
      });

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

    // Return JSON success
    return new Response(
      JSON.stringify({
        ok: true,
        message: "Gmail connected successfully",
      }),
      {
        status: 200,
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

    // Return JSON error
    return new Response(
      JSON.stringify({
        ok: false,
        reason: "callback_error",
        detail: error instanceof Error ? error.message : "OAuth callback failed",
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