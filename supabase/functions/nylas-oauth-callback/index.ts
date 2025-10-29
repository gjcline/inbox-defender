import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

interface NylasOAuthState {
  userId: string;
  provider: string;
  timestamp: number;
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

function parseOAuthState(stateParam: string): NylasOAuthState | null {
  try {
    const decoded = base64urlDecode(stateParam);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('state_parse_error', {
      stateLength: stateParam?.length || 0,
      stateSample: stateParam?.slice(0, 50),
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const reqId = crypto.randomUUID();
  console.log(`[${reqId}] nylas_oauth_cb_begin`, { method: req.method });

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const nylasClientId = Deno.env.get("NYLAS_CLIENT_ID")!;
    const nylasClientSecret = Deno.env.get("NYLAS_CLIENT_SECRET")!;
    const nylasApiKey = Deno.env.get("NYLAS_API_KEY")!;
    const nylasApiUri = Deno.env.get("NYLAS_API_URI") || "https://api.us.nylas.com";
    const redirectUri = Deno.env.get("NYLAS_REDIRECT_URI")!;

    if (!nylasClientId || !nylasClientSecret || !nylasApiKey) {
      throw new Error("Nylas credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log(`[${reqId}] db_client_initialized`);

    let code: string = "";
    let userId: string = "";
    let stateParam: string = "";

    if (req.method === "POST") {
      const body = await req.json();

      console.log(`[${reqId}] request_params`, {
        hasCode: !!(body.code),
        hasState: !!(body.state),
        codeLength: body.code?.length || 0,
        stateLength: body.state?.length || 0,
      });

      code = body.code || "";
      stateParam = body.state || "";

      if (!code || !stateParam) {
        console.error(`[${reqId}] missing_params`);
        return new Response(
          JSON.stringify({
            ok: false,
            reason: "missing_params",
            detail: "Missing code or state parameter",
            req_id: reqId,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Parse and verify state
      const state = parseOAuthState(stateParam);
      if (!state || state.provider !== 'nylas') {
        console.error(`[${reqId}] invalid_state`);
        return new Response(
          JSON.stringify({
            ok: false,
            reason: "invalid_state",
            detail: "Invalid OAuth state parameter",
            req_id: reqId,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      userId = state.userId;

      // Verify user exists
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !userData?.user) {
        console.error(`[${reqId}] unknown_user`, { userId });
        return new Response(
          JSON.stringify({
            ok: false,
            reason: "unknown_user",
            detail: `User not found: ${userId}`,
            req_id: reqId,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`[${reqId}] user_verified`, { userId, email: userData.user.email });
    } else {
      throw new Error(`Unsupported method: ${req.method}`);
    }

    console.log(`[${reqId}] nylas_token_exchange_begin`);

    // DEBUG: Log credentials being used
    console.log('=== DEBUG: Token Exchange Attempt ===');
    console.log('Client ID:', Deno.env.get('NYLAS_CLIENT_ID'));
    console.log('Client Secret exists:', !!Deno.env.get('NYLAS_CLIENT_SECRET'));
    console.log('Client Secret length:', Deno.env.get('NYLAS_CLIENT_SECRET')?.length);
    console.log('API URI:', Deno.env.get('NYLAS_API_URI'));
    console.log('Redirect URI:', redirectUri);
    console.log('Code received:', code.substring(0, 20) + '...');

    const clientId = Deno.env.get('NYLAS_CLIENT_ID');
    const clientSecret = Deno.env.get('NYLAS_CLIENT_SECRET');
    const apiKey = Deno.env.get('NYLAS_API_KEY');

    console.log('API Key exists:', !!apiKey);
    console.log('API Key length:', apiKey?.length);
    console.log('API Key (first 20 chars):', apiKey?.substring(0, 20) + '...');

    // TRY BEARER AUTH WITH API KEY FIRST (for Nylas sandbox)
    // According to error reports, Nylas sandbox might require Bearer auth instead of Basic
    console.log('=== ATTEMPT 1: Bearer Auth with API Key ===');

    let tokenResponse = await fetch(`${nylasApiUri}/v3/connect/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    console.log('Response status:', tokenResponse.status);
    let responseText = await tokenResponse.text();
    console.log('Response body:', responseText);

    // If Bearer auth fails, try Basic Auth as fallback
    if (!tokenResponse.ok) {
      console.log('=== Bearer auth failed, trying ATTEMPT 2: Basic Auth ===');

      const credentials = `${clientId}:${clientSecret}`;
      const basicAuth = btoa(credentials);

      console.log('Basic Auth (first 50 chars):', basicAuth.substring(0, 50) + '...');
      console.log('Authorization header:', `Basic ${basicAuth.substring(0, 50)}...`);

      tokenResponse = await fetch(`${nylasApiUri}/v3/connect/token`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      console.log('Response status:', tokenResponse.status);
      responseText = await tokenResponse.text();
      console.log('Response body:', responseText);
    }

    if (!tokenResponse.ok) {
      console.error(`[${reqId}] nylas_token_exchange_failed`, {
        status: tokenResponse.status,
        body: responseText.slice(0, 400),
      });

      throw new Error(`Token exchange failed: ${responseText}`);
    }

    let nylasTokenData;
    try {
      nylasTokenData = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[${reqId}] Failed to parse Nylas response:`, parseError);
      throw new Error(`Invalid JSON response from Nylas: ${responseText.slice(0, 200)}`);
    }

    const { grant_id, email, provider } = nylasTokenData;

    console.log(`[${reqId}] nylas_token_exchange_success`, {
      grant_id,
      email,
      provider,
    });

    // Get Nylas account ID
    // The grant_id is what we'll use for subsequent API calls
    // Nylas manages token refresh automatically

    console.log(`[${reqId}] Step 2: Checking for existing mailbox...`);
    const { data: existingMailbox } = await supabase
      .from("mailboxes")
      .select("id")
      .eq("email_address", email)
      .maybeSingle();

    let mailboxId: string;

    if (existingMailbox) {
      mailboxId = existingMailbox.id;
      console.log(`[${reqId}] existing_mailbox_found:`, mailboxId);

      await supabase
        .from("mailboxes")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", mailboxId);
    } else {
      console.log(`[${reqId}] creating_new_mailbox`);
      const { data: newMailbox, error: mailboxError } = await supabase
        .from("mailboxes")
        .insert({
          user_id: userId,
          email_address: email,
          provider: 'nylas',
        })
        .select()
        .single();

      if (mailboxError) {
        console.error(`[${reqId}] mailbox_creation_error:`, mailboxError);
        throw mailboxError;
      }
      mailboxId = newMailbox.id;
      console.log(`[${reqId}] new_mailbox_created:`, mailboxId);
    }

    console.log(`[${reqId}] Step 3: Saving Nylas connection...`);

    // For Nylas, we don't store access_token or refresh_token
    // Nylas manages tokens server-side using the grant_id
    const { error: connectionError } = await supabase
      .from("gmail_connections")
      .upsert({
        user_id: userId,
        mailbox_id: mailboxId,
        oauth_provider: 'nylas',
        nylas_grant_id: grant_id,
        email: email,
        is_active: true,
        access_token: grant_id, // Store grant_id as access_token for compatibility
        refresh_token: null, // Nylas handles refresh automatically
        token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,mailbox_id",
      });

    if (connectionError) {
      console.error(`[${reqId}] save_connection_failed`, {
        code: connectionError.code,
        message: connectionError.message,
      });

      return new Response(
        JSON.stringify({
          ok: false,
          reason: "save_connection_failed",
          hint: "Database error saving connection",
          detail: connectionError.message,
          req_id: reqId,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[${reqId}] nylas_connection_saved`, { userId, email, mailboxId, grant_id });

    // Create or update user settings
    const { error: settingsError } = await supabase
      .from("user_settings")
      .upsert({
        user_id: userId,
      }, {
        onConflict: "user_id",
        ignoreDuplicates: true,
      });

    if (settingsError) {
      console.error(`[${reqId}] settings_creation_error:`, settingsError);
    }

    console.log(`[${reqId}] nylas_oauth_callback_complete`, { userId, email, mailboxId });

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Nylas connection successful",
        email: email,
        provider: 'nylas',
        req_id: reqId,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`[${reqId}] nylas_oauth_callback_error`, {
      message: errorMessage,
      stack: errorStack?.split("\n").slice(0, 3).join("\n"),
    });

    return new Response(
      JSON.stringify({
        ok: false,
        reason: "callback_error",
        hint: "Nylas OAuth callback failed",
        detail: errorMessage,
        req_id: reqId,
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