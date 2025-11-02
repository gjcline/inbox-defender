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
  const requestUrl = new URL(req.url);

  console.log(`[${reqId}] oauth_cb_begin`, { method: req.method });

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Single source of truth for redirect URI
  const REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI") ?? "https://app.bliztic.com/api/auth/google/callback";

  console.log(`[${reqId}] using_redirect_uri`, REDIRECT_URI);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    console.log(`[${reqId}] ═══════════════════════════════════════════════════════════`);
    console.log(`[${reqId}] 🔐 BACKEND OAuth Configuration Check`);
    console.log(`[${reqId}] ═══════════════════════════════════════════════════════════`);
    console.log(`[${reqId}] `);
    console.log(`[${reqId}] 📋 Client ID Configuration:`);
    if (googleClientId) {
      console.log(`[${reqId}]    Full Client ID: ${googleClientId}`);
      console.log(`[${reqId}]    First 30 chars: ${googleClientId.substring(0, 30)}...`);
      console.log(`[${reqId}]    Last 20 chars: ...${googleClientId.substring(googleClientId.length - 20)}`);
    } else {
      console.log(`[${reqId}]    ❌ GOOGLE_CLIENT_ID is NOT SET in Supabase secrets!`);
    }
    console.log(`[${reqId}] `);
    console.log(`[${reqId}] 🔄 Redirect URI Configuration:`);
    console.log(`[${reqId}]    Full Redirect URI: ${REDIRECT_URI}`);
    console.log(`[${reqId}]    Source: ${Deno.env.get("GOOGLE_REDIRECT_URI") ? 'GOOGLE_REDIRECT_URI env var' : 'DEFAULT FALLBACK'}`);
    console.log(`[${reqId}] `);
    console.log(`[${reqId}] 🔐 Client Secret:`);
    console.log(`[${reqId}]    ${googleClientSecret ? '✓ Set (length: ' + googleClientSecret.length + ')' : '❌ NOT SET'}`);
    console.log(`[${reqId}] `);
    console.log(`[${reqId}] ⚠️  CRITICAL: These MUST match frontend values exactly!`);
    const expectedClientId = '522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav.apps.googleusercontent.com';
    const expectedRedirectUri = 'https://app.bliztic.com/api/auth/google/callback';
    console.log(`[${reqId}]    Expected Client ID from frontend: ${expectedClientId}`);
    console.log(`[${reqId}]    Expected Redirect URI from frontend: ${expectedRedirectUri}`);
    console.log(`[${reqId}] `);
    console.log(`[${reqId}] 🔍 Configuration Match Check:`);
    const clientIdMatches = googleClientId === expectedClientId;
    const redirectUriMatches = REDIRECT_URI === expectedRedirectUri;
    console.log(`[${reqId}]    Client ID Match: ${clientIdMatches ? '✅ YES' : '❌ NO - MISMATCH!'}`);
    console.log(`[${reqId}]    Redirect URI Match: ${redirectUriMatches ? '✅ YES' : '❌ NO - MISMATCH!'}`);
    if (!clientIdMatches || !redirectUriMatches) {
      console.log(`[${reqId}] `);
      console.log(`[${reqId}] ❌❌❌ CONFIGURATION MISMATCH DETECTED ❌❌❌`);
      console.log(`[${reqId}]    OAuth will fail with "invalid_grant" or "redirect_uri_mismatch"`);
      console.log(`[${reqId}]    Action: Update Supabase secrets to match frontend .env values`);
    }
    console.log(`[${reqId}] ═══════════════════════════════════════════════════════════`);

    if (!googleClientId || !googleClientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }

    // Use service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log(`[${reqId}] db_client_initialized`, { usingServiceRole: true });

    let code: string = "";
    let userId: string = "";
    let stateParam: string = "";
    let forceError: string | undefined;

    // Handle POST (from frontend callback page)
    if (req.method === "POST") {
      const body = await req.json();

      console.log(`[${reqId}] oauth_cb_params`, {
        hasCode: !!(body.code),
        hasState: !!(body.state),
        hasDryRun: !!(body.dry_run),
        codeLength: body.code?.length || 0,
        stateLength: body.state?.length || 0,
      });

      // Dry-run mode for testing
      if (body.dry_run === true) {
        console.log(`[${reqId}] dry_run`, "short-circuit");
        return new Response(
          JSON.stringify({
            ok: true,
            mode: "dry_run",
            redirect_uri: REDIRECT_URI,
            req_id: reqId,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Probe mode: test token exchange without DB writes
      if (body.probe) {
        console.log(`[${reqId}] probe_mode`, "testing token exchange");
        const probeCode = body.probe.code;
        const probeState = body.probe.state;

        if (!probeCode || !probeState) {
          return new Response(
            JSON.stringify({
              ok: false,
              reason: "probe_missing_params",
              using_redirect_uri: REDIRECT_URI,
              req_id: reqId,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Decode and validate state
        const state = parseOAuthState(probeState);
        if (!state) {
          return new Response(
            JSON.stringify({
              ok: false,
              reason: "probe_state_invalid",
              using_redirect_uri: REDIRECT_URI,
              req_id: reqId,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log(`[${reqId}] probe_state_ok`, {
          userId: state.userId,
          clientIdSuffix: state.clientId
        });

        // Perform real token exchange with Google
        try {
          console.log(`[${reqId}] 🔍 PROBE MODE - Token exchange request:`);
          console.log(`   📍 URL: https://oauth2.googleapis.com/token`);
          console.log(`   🔑 Client ID (first 30 chars): ${googleClientId.substring(0, 30)}...`);
          console.log(`   🔄 Redirect URI: ${REDIRECT_URI}`);
          console.log(`   📝 Auth Code (first 15 chars): ${probeCode.substring(0, 15)}...`);
          console.log(`   📝 Auth Code (last 10 chars): ...${probeCode.substring(probeCode.length - 10)}`);
          console.log(`   📏 Code length: ${probeCode.length} characters`);

          const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              code: probeCode,
              client_id: googleClientId,
              client_secret: googleClientSecret,
              redirect_uri: REDIRECT_URI,
              grant_type: "authorization_code",
            }),
          });

          const responseText = await tokenResponse.text();

          console.log(`[${reqId}] 📥 PROBE - Token exchange response: ${tokenResponse.status} ${tokenResponse.statusText}`);

          if (!tokenResponse.ok) {
            // Try to parse as JSON for better error details
            let errorDetail = responseText;
            try {
              const errorJson = JSON.parse(responseText);
              console.error(`[${reqId}] ❌ PROBE - Full error response:`, JSON.stringify(errorJson, null, 2));
              if (errorJson.error) console.error(`[${reqId}]   Error: ${errorJson.error}`);
              if (errorJson.error_description) console.error(`[${reqId}]   Description: ${errorJson.error_description}`);
              errorDetail = JSON.stringify(errorJson, null, 2);
            } catch {
              console.error(`[${reqId}] ❌ PROBE - Error (raw):`, responseText);
            }

            return new Response(
              JSON.stringify({
                ok: false,
                reason: "token_exchange_failed",
                status: tokenResponse.status,
                statusText: tokenResponse.statusText,
                detail_raw: errorDetail.slice(0, 1000),
                using_redirect_uri: REDIRECT_URI,
                req_id: reqId,
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          // Success - return token response
          return new Response(
            JSON.stringify({
              ok: true,
              reason: "probe_token_exchange_success",
              status: tokenResponse.status,
              detail_raw: responseText.slice(0, 800),
              using_redirect_uri: REDIRECT_URI,
              req_id: reqId,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              ok: false,
              reason: "probe_exception",
              detail_raw: error instanceof Error ? error.message : String(error),
              using_redirect_uri: REDIRECT_URI,
              req_id: reqId,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      // Synthetic error probes (non-prod only)
      forceError = body.force_error;
      if (forceError) {
        console.log(`[${reqId}] synthetic_probe_requested`, { forceError });
      }

      code = body.code || "";
      stateParam = body.state || "";

      console.log(`[${reqId}] 🔍 Received auth code from Google:`, code.substring(0, 10) + '...' + code.substring(code.length - 5));
      console.log(`[${reqId}] 🔍 Auth code length:`, code.length);
      console.log(`[${reqId}] 🔍 State parameter (first 30 chars):`, stateParam.substring(0, 30) + '...');

      console.log(`[${reqId}] oauth_cb_params_validated`, {
        hasCode: !!code,
        hasState: !!stateParam,
      });

      if (!code || !stateParam) {
        console.error(`[${reqId}] missing_params`, { hasCode: !!code, hasState: !!stateParam });
        return new Response(
          JSON.stringify({
            ok: false,
            reason: "missing_params",
            detail: "Missing code or state parameter",
            using_redirect_uri: REDIRECT_URI,
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
      if (!state) {
        console.error(`[${reqId}] invalid_state`, stateParam?.slice(0, 50));
        return new Response(
          JSON.stringify({
            ok: false,
            reason: "invalid_state",
            detail: "Failed to parse OAuth state parameter",
            using_redirect_uri: REDIRECT_URI,
            req_id: reqId,
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
        console.error(`[${reqId}] client_id_mismatch`, {
          feSuffix: state.clientId,
          beSuffix: edgeClientIdSuffix,
        });

        return new Response(
          JSON.stringify({
            ok: false,
            reason: "client_id_mismatch",
            detail: `OAuth configuration mismatch. Frontend client ID suffix (${state.clientId}) does not match backend (${edgeClientIdSuffix}). Please check your environment variables.`,
            using_redirect_uri: REDIRECT_URI,
            req_id: reqId,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`[${reqId}] state_verified`, {
        userId,
        clientIdSuffix: state.clientId,
      });

      // Verify user exists in Supabase Auth (server-side check)
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !userData?.user) {
        console.error(`[${reqId}] unknown_user`, { userId, error: userError?.message });
        return new Response(
          JSON.stringify({
            ok: false,
            reason: "unknown_user",
            using_redirect_uri: REDIRECT_URI,
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

    console.log(`[${reqId}] token_exchange_begin`, { hasCode: !!code, redirectUri: REDIRECT_URI });

    // Apply synthetic error mutations for testing
    let actualClientId = googleClientId;
    let actualRedirectUri = REDIRECT_URI;
    let actualCode = code;

    if (forceError === "invalid_client") {
      actualClientId = "FAKE_CLIENT_ID_123.apps.googleusercontent.com";
      console.log(`[${reqId}] synthetic_probe_active`, { forceError, mutation: "invalid_client_id" });
    } else if (forceError === "redirect_mismatch") {
      actualRedirectUri = "https://wrong-domain.com/callback";
      console.log(`[${reqId}] synthetic_probe_active`, { forceError, mutation: "wrong_redirect_uri" });
    } else if (forceError === "bad_code") {
      actualCode = "FAKE_CODE_123";
      console.log(`[${reqId}] synthetic_probe_active`, { forceError, mutation: "fake_code" });
    }

    // ═══════════════════════════════════════════════════════════
    // COMPREHENSIVE TOKEN EXCHANGE LOGGING
    // ═══════════════════════════════════════════════════════════
    console.log(`[${reqId}] ═══════════════════════════════════════════════════════════`);
    console.log(`[${reqId}] 🔐 DETAILED TOKEN EXCHANGE REQUEST`);
    console.log(`[${reqId}] ═══════════════════════════════════════════════════════════`);
    console.log(`[${reqId}] `);
    console.log(`[${reqId}] 📍 Request URL:`);
    console.log(`[${reqId}]    https://oauth2.googleapis.com/token`);
    console.log(`[${reqId}] `);
    console.log(`[${reqId}] 📋 Request Method:`);
    console.log(`[${reqId}]    POST`);
    console.log(`[${reqId}] `);
    console.log(`[${reqId}] 📋 Request Headers:`);
    console.log(`[${reqId}]    Content-Type: application/x-www-form-urlencoded`);
    console.log(`[${reqId}] `);
    console.log(`[${reqId}] 📦 Request Body Parameters:`);
    console.log(`[${reqId}]    grant_type: authorization_code`);
    console.log(`[${reqId}]    client_id: ${actualClientId}`);
    console.log(`[${reqId}]    client_secret: [REDACTED - Length: ${googleClientSecret.length}]`);
    console.log(`[${reqId}]    redirect_uri: ${actualRedirectUri}`);
    console.log(`[${reqId}]    code: (see details below)`);
    console.log(`[${reqId}] `);
    console.log(`[${reqId}] 🔍 Authorization Code Analysis:`);
    console.log(`[${reqId}]    Full length: ${actualCode.length} characters`);
    console.log(`[${reqId}]    Expected length: ~70-120 characters`);
    console.log(`[${reqId}]    First 20 chars: ${actualCode.substring(0, 20)}...`);
    console.log(`[${reqId}]    Last 20 chars: ...${actualCode.substring(actualCode.length - 20)}`);
    console.log(`[${reqId}]    Contains spaces: ${actualCode.includes(' ') ? '❌ YES (INVALID!)' : '✅ NO'}`);
    console.log(`[${reqId}]    Contains newlines: ${(actualCode.includes('\n') || actualCode.includes('\r')) ? '❌ YES (INVALID!)' : '✅ NO'}`);
    console.log(`[${reqId}]    Contains tabs: ${actualCode.includes('\t') ? '❌ YES (INVALID!)' : '✅ NO'}`);
    console.log(`[${reqId}]    Trimmed matches original: ${actualCode.trim() === actualCode ? '✅ YES' : '❌ NO (has whitespace!)'}`);

    // Check for common code issues
    const codeIssues = [];
    if (actualCode.length < 50) codeIssues.push('Code too short');
    if (actualCode.length > 200) codeIssues.push('Code too long');
    if (actualCode.includes(' ')) codeIssues.push('Contains spaces');
    if (actualCode.includes('\n') || actualCode.includes('\r')) codeIssues.push('Contains newlines');
    if (actualCode.trim() !== actualCode) codeIssues.push('Has leading/trailing whitespace');

    if (codeIssues.length > 0) {
      console.log(`[${reqId}]    ⚠️  ISSUES DETECTED: ${codeIssues.join(', ')}`);
    } else {
      console.log(`[${reqId}]    ✅ Code appears valid (no obvious issues)`);
    }
    console.log(`[${reqId}] ═══════════════════════════════════════════════════════════`);

    const tokenParams = {
      code: actualCode,
      client_id: actualClientId,
      client_secret: googleClientSecret,
      redirect_uri: actualRedirectUri,
      grant_type: "authorization_code",
    };

    console.log(`[${reqId}] 🚀 Sending token exchange request to Google...`);

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(tokenParams),
    });

    console.log(`[${reqId}] ═══════════════════════════════════════════════════════════`);
    console.log(`[${reqId}] 📥 GOOGLE TOKEN EXCHANGE RESPONSE`);
    console.log(`[${reqId}] ═══════════════════════════════════════════════════════════`);
    console.log(`[${reqId}] `);
    console.log(`[${reqId}] 📊 Response Status:`);
    console.log(`[${reqId}]    Status Code: ${tokenResponse.status}`);
    console.log(`[${reqId}]    Status Text: ${tokenResponse.statusText}`);
    console.log(`[${reqId}]    Success: ${tokenResponse.ok ? '✅ YES' : '❌ NO'}`);
    console.log(`[${reqId}] `);
    console.log(`[${reqId}] 📋 Response Headers:`);
    tokenResponse.headers.forEach((value, key) => {
      console.log(`[${reqId}]    ${key}: ${value}`);
    });
    console.log(`[${reqId}] `);

    if (!tokenResponse.ok) {
      const errTxt = await tokenResponse.text();

      console.log(`[${reqId}] 📄 Response Body (Raw Text):`);
      console.log(`[${reqId}]    ${errTxt.substring(0, 500)}${errTxt.length > 500 ? '...' : ''}`);
      console.log(`[${reqId}] `);

      // Parse error if JSON
      let errorDetail = errTxt;
      let errorJson: any = null;

      try {
        errorJson = JSON.parse(errTxt);
        console.log(`[${reqId}] 📋 Parsed Error Response (JSON):`);
        console.log(`[${reqId}] ${JSON.stringify(errorJson, null, 2).split('\n').map(line => `[${reqId}]    ${line}`).join('\n')}`);
        console.log(`[${reqId}] `);
        errorDetail = JSON.stringify(errorJson, null, 2);

        // Log specific error fields with emphasis
        console.log(`[${reqId}] ❌❌❌ ERROR DETAILS ❌❌❌`);
        if (errorJson.error) {
          console.error(`[${reqId}]    Error Type: ${errorJson.error}`);
        }
        if (errorJson.error_description) {
          console.error(`[${reqId}]    Description: ${errorJson.error_description}`);
        }
        if (errorJson.error_uri) {
          console.error(`[${reqId}]    Documentation: ${errorJson.error_uri}`);
        }

        // Add contextual hints based on error type
        if (errorJson.error === 'invalid_grant') {
          console.error(`[${reqId}] `);
          console.error(`[${reqId}]    💡 COMMON CAUSES OF invalid_grant:`);
          console.error(`[${reqId}]       1. Authorization code already used (codes are single-use)`);
          console.error(`[${reqId}]       2. Authorization code expired (valid for ~10 minutes)`);
          console.error(`[${reqId}]       3. Client ID mismatch between auth URL and token exchange`);
          console.error(`[${reqId}]       4. Redirect URI mismatch between auth URL and token exchange`);
          console.error(`[${reqId}]       5. User not authorized in OAuth consent screen (Testing mode)`);
          console.error(`[${reqId}]       6. Code contains whitespace or special characters`);
        } else if (errorJson.error === 'invalid_client') {
          console.error(`[${reqId}] `);
          console.error(`[${reqId}]    💡 INVALID_CLIENT means:`);
          console.error(`[${reqId}]       - Client ID and/or Client Secret are incorrect`);
          console.error(`[${reqId}]       - Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Supabase secrets`);
        } else if (errorJson.error === 'redirect_uri_mismatch') {
          console.error(`[${reqId}] `);
          console.error(`[${reqId}]    💡 REDIRECT_URI_MISMATCH means:`);
          console.error(`[${reqId}]       - The redirect_uri used here doesn't match what was used in auth URL`);
          console.error(`[${reqId}]       - Or it's not registered in Google Cloud Console`);
        }
      } catch (parseError) {
        console.error(`[${reqId}] ⚠️  Failed to parse error response as JSON`);
        console.error(`[${reqId}]    Raw error text: ${errTxt}`);
        console.error(`[${reqId}]    Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      console.log(`[${reqId}] ═══════════════════════════════════════════════════════════`);

      console.error(`[${reqId}] token_exchange_failed`, {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errTxt.slice(0, 400),
      });

      return new Response(
        JSON.stringify({
          ok: false,
          reason: "token_exchange_failed",
          hint: "Google rejected the authorization code",
          detail: errorDetail.slice(0, 1000),
          error_type: errorJson?.error || 'unknown',
          error_description: errorJson?.error_description || 'No description provided',
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          using_redirect_uri: REDIRECT_URI,
          req_id: reqId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Success case
    console.log(`[${reqId}] 📄 Response Body:`);
    console.log(`[${reqId}]    ✅ Token exchange successful!`);

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;
    console.log(`[${reqId}] token_exchange_success`, {
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      expiresIn: expires_in,
    });

    console.log(`[${reqId}] Step 2: Fetching Gmail user info...`);
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      const errTxt = await userInfoResponse.text();
      console.error(`[${reqId}] gmail_profile_failed`, {
        status: userInfoResponse.status,
        body: errTxt.slice(0, 400),
      });

      return new Response(
        JSON.stringify({
          ok: false,
          reason: "gmail_profile_failed",
          hint: "Could not fetch Gmail profile",
          detail: errTxt.slice(0, 500),
          using_redirect_uri: REDIRECT_URI,
          req_id: reqId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userInfo = await userInfoResponse.json();
    const { email, id: googleUserId } = userInfo;
    console.log(`[${reqId}] gmail_profile_ok`, { email, googleUserId });

    console.log(`[${reqId}] Step 3: Checking for existing mailbox...`);
    const { data: existingMailbox } = await supabase
      .from("mailboxes")
      .select("id")
      .eq("email_address", email)
      .maybeSingle();

    let mailboxId: string;

    if (existingMailbox) {
      mailboxId = existingMailbox.id;
      console.log(`[${reqId}] ✓ Found existing mailbox:`, mailboxId);

      console.log(`[${reqId}] Updating existing mailbox...`);
      await supabase
        .from("mailboxes")
        .update({
          gmail_user_id: googleUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mailboxId);
      console.log(`[${reqId}] ✓ Mailbox updated`);
    } else {
      console.log(`[${reqId}] Creating new mailbox...`);
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
        console.error(`[${reqId}] Mailbox creation error:`, mailboxError);
        throw mailboxError;
      }
      mailboxId = newMailbox.id;
      console.log(`[${reqId}] ✓ New mailbox created:`, mailboxId);
    }

    console.log(`[${reqId}] Step 4: Saving Gmail connection...`);
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
      console.error(`[${reqId}] save_connection_failed`, {
        code: connectionError.code,
        message: connectionError.message,
        details: connectionError.details,
        hint: "Check RLS policies and schema",
      });

      return new Response(
        JSON.stringify({
          ok: false,
          reason: "save_connection_failed",
          hint: "Database error saving connection",
          detail: connectionError.message,
          using_redirect_uri: REDIRECT_URI,
          req_id: reqId,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    console.log(`[${reqId}] connection_saved`, { userId, email, mailboxId });

    const { error: settingsError } = await supabase
      .from("user_settings")
      .upsert({
        user_id: userId,
      }, {
        onConflict: "user_id",
        ignoreDuplicates: true,
      });

    if (settingsError) {
      console.error(`[${reqId}] Settings creation error:`, settingsError);
    }

    console.log(`[${reqId}] Step 5: Triggering initial sync...`);
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
        console.log(`[${reqId}] ✓ Initial sync triggered successfully`);
      } else {
        console.error(`[${reqId}] Failed to trigger initial sync:`, await syncResponse.text());
      }
    } catch (syncError) {
      console.error(`[${reqId}] Error triggering initial sync:`, syncError);
      // Don't fail the OAuth flow if sync fails
    }

    console.log(`[${reqId}] oauth_callback_complete`, { userId, email, mailboxId });

    // For GET requests (OAuth callback), redirect to dashboard
    if (req.method === "GET") {
      const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://app.bliztic.com";
      const dashboardUrl = `${frontendUrl}/dashboard?gmail_connected=1`;
      console.log(`[${reqId}] redirecting_to_dashboard`, dashboardUrl);
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
        using_redirect_uri: REDIRECT_URI,
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

    console.error(`[${reqId}] oauth_callback_error`, {
      message: errorMessage,
      stack: errorStack?.split("\n").slice(0, 3).join("\n"),
    });

    // For GET requests (OAuth callback), redirect to dashboard with error
    if (req.method === "GET") {
      const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://app.bliztic.com";
      const dashboardUrl = `${frontendUrl}/dashboard?gmail_error=${encodeURIComponent(errorMessage)}`;
      console.log(`[${reqId}] redirecting_with_error`, dashboardUrl);
      return new Response(null, {
        status: 302,
        headers: {
          "Location": dashboardUrl,
        },
      });
    }

    // Return structured JSON error
    return new Response(
      JSON.stringify({
        ok: false,
        reason: "callback_error",
        hint: "OAuth callback failed",
        detail: errorMessage,
        using_redirect_uri: REDIRECT_URI,
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