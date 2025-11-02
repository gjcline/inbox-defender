#!/bin/bash

# Test webhook-from-make manually
# This simulates what Make.com should be sending

echo "🧪 Testing webhook-from-make with real email data..."
echo ""

# Real user_id from database
USER_ID="d8a1c6b4-a3b4-4c34-841f-d4a62285e866"

# Test with one of the pending emails
curl -X POST \
  https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/webhook-from-make \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhemV5eGdzZ29kaG53Y2t0dHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc3MzEwNTYsImV4cCI6MjA0MzMwNzA1Nn0.vEkCuffield2b8n9Cz3LqJFJeYqpT4eGQ8SPVZ5MHX1dI" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"results\": [
      {
        \"message_id\": \"19a421eb7d1a31d7\",
        \"classification\": \"personal\",
        \"ai_confidence_score\": 0.95,
        \"ai_reasoning\": \"Test email from known sender grant@kag.systems. Subject indicates this is a test message.\",
        \"action_taken\": \"classified\"
      }
    ]
  }"

echo ""
echo ""
echo "✅ Webhook test sent!"
echo ""
echo "📊 Check results:"
echo "1. Edge Function Logs: https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions/webhook-from-make/logs"
echo "2. Database query:"
echo "   SELECT classification, processed_at, moved_to_folder FROM emails WHERE gmail_message_id = '19a421eb7d1a31d7';"
echo "3. Dashboard: Check if email now shows 'Personal' instead of 'Pending'"
