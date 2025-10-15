import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Gmail sends push notifications as POST with a JSON body
    const notification = await req.json();
    
    console.log("Received Gmail push notification:", notification);

    // Gmail notification format:
    // {
    //   "message": {
    //     "data": "base64-encoded-json",
    //     "messageId": "...",
    //     "message_id": "...",
    //     "publishTime": "...",
    //     "publish_time": "..."
    //   },
    //   "subscription": "..."
    // }

    if (!notification.message || !notification.message.data) {
      console.warn("Invalid notification format");
      return new Response(JSON.stringify({ error: "Invalid notification" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode the base64 data
    const decodedData = JSON.parse(atob(notification.message.data));
    console.log("Decoded notification data:", decodedData);

    // decodedData format:
    // {
    //   "emailAddress": "user@gmail.com",
    //   "historyId": "12345"
    // }

    const emailAddress = decodedData.emailAddress;
    const historyId = decodedData.historyId;

    // Find the gmail connection for this email address
    const { data: mailbox, error: mailboxError } = await supabase
      .from("mailboxes")
      .select("id")
      .eq("email_address", emailAddress)
      .maybeSingle();

    if (mailboxError || !mailbox) {
      console.error("Mailbox not found for email:", emailAddress);
      return new Response(JSON.stringify({ error: "Mailbox not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: connection, error: connectionError } = await supabase
      .from("gmail_connections")
      .select("*")
      .eq("mailbox_id", mailbox.id)
      .eq("is_active", true)
      .maybeSingle();

    if (connectionError || !connection) {
      console.error("Active connection not found");
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the push notification
    await supabase
      .from("gmail_push_logs")
      .insert({
        user_id: connection.user_id,
        gmail_connection_id: connection.id,
        notification_data: notification,
        history_id: historyId,
        processed: false,
      });

    // Trigger the sync for this specific user
    const syncUrl = `${supabaseUrl}/functions/v1/gmail-sync-cron`;
    const syncResponse = await fetch(syncUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "apikey": supabaseServiceKey,
      },
      body: JSON.stringify({
        triggered_by: "push",
        user_id: connection.user_id,
        history_id: historyId,
      }),
    });

    if (syncResponse.ok) {
      // Mark as processed
      await supabase
        .from("gmail_push_logs")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("history_id", historyId)
        .eq("gmail_connection_id", connection.id);

      console.log("Successfully triggered sync for user:", connection.user_id);
    } else {
      const errorText = await syncResponse.text();
      console.error("Failed to trigger sync:", errorText);
      
      await supabase
        .from("gmail_push_logs")
        .update({ 
          processed: true, 
          processed_at: new Date().toISOString(),
          error_message: errorText 
        })
        .eq("history_id", historyId)
        .eq("gmail_connection_id", connection.id);
    }

    // Always return 200 to acknowledge receipt
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in gmail-push-notification:", error);
    // Return 200 even on error to prevent Gmail from retrying
    return new Response(
      JSON.stringify({ error: "Internal error", details: error.message }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});