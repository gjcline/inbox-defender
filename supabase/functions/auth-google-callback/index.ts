import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GOOGLE_CLIENT_ID = "522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";
const REDIRECT_URI = "https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/auth-google-callback";
const APP_URL = "https://bazeyxgsgodhnwckttxi.netlify.app";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
      const errorRedirect = `${APP_URL}/connect?error=${encodeURIComponent("Missing authorization code")}`;
      return new Response(null, {
        status: 302,
        headers: { Location: errorRedirect },
      });
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokens = await tokenResponse.json();

    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error("Failed to fetch user info");
    }

    const userInfo = await userInfoResponse.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existingOrg } = await supabase
      .from("orgs")
      .select("id")
      .limit(1)
      .maybeSingle();

    let orgId: string;

    if (existingOrg) {
      orgId = existingOrg.id;
    } else {
      const { data: newOrg, error: orgError } = await supabase
        .from("orgs")
        .insert({ name: "My Organization", plan: "personal" })
        .select("id")
        .single();

      if (orgError) throw orgError;
      orgId = newOrg.id;
    }

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", userInfo.email)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({ email: userInfo.email, org_id: orgId })
        .select("id")
        .single();

      if (userError) throw userError;
      userId = newUser.id;
    }

    const { error: mailboxError } = await supabase
      .from("mailboxes")
      .upsert(
        {
          org_id: orgId,
          user_id: userId,
          provider: "gmail",
          email_address: userInfo.email,
          refresh_secret_key: tokens.refresh_token || "",
        },
        { onConflict: "email_address" }
      );

    if (mailboxError) throw mailboxError;

    const redirectUrl = `${APP_URL}/dashboard?success=true`;

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
      },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    const errorRedirect = `${APP_URL}/connect?error=${encodeURIComponent(error.message)}`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: errorRedirect,
      },
    });
  }
});