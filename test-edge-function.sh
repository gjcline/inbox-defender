#!/bin/bash

# Test Edge Function Connectivity
# This script helps verify that your edge function is deployed and accessible

echo "=========================================="
echo "Testing Gmail OAuth Callback Edge Function"
echo "=========================================="
echo ""

SUPABASE_URL="https://bazeyxgsgodhnwckttxi.supabase.co"
EDGE_FUNCTION_URL="${SUPABASE_URL}/functions/v1/gmail-oauth-callback"

echo "Testing edge function at: $EDGE_FUNCTION_URL"
echo ""

# Test 1: OPTIONS request (CORS preflight)
echo "Test 1: Testing CORS preflight (OPTIONS request)..."
CORS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$EDGE_FUNCTION_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization")

if [ "$CORS_RESPONSE" = "200" ]; then
  echo "✅ CORS preflight successful (Status: $CORS_RESPONSE)"
else
  echo "❌ CORS preflight failed (Status: $CORS_RESPONSE)"
  echo "   This might indicate the edge function is not deployed."
fi
echo ""

# Test 2: POST request without auth
echo "Test 2: Testing POST request (should fail with missing parameters)..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$EDGE_FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{}')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ -z "$HTTP_STATUS" ]; then
  echo "❌ No response from edge function"
  echo "   The function is likely not deployed."
  echo ""
  echo "ACTION REQUIRED:"
  echo "1. Go to: https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions"
  echo "2. Create function named: gmail-oauth-callback"
  echo "3. Copy code from: supabase/functions/gmail-oauth-callback/index.ts"
  echo "4. Deploy the function"
elif [ "$HTTP_STATUS" = "404" ]; then
  echo "❌ Edge function not found (404)"
  echo "   The function has not been deployed yet."
  echo ""
  echo "ACTION REQUIRED:"
  echo "1. Go to: https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions"
  echo "2. Create function named: gmail-oauth-callback"
  echo "3. Copy code from: supabase/functions/gmail-oauth-callback/index.ts"
  echo "4. Deploy the function"
elif [ "$HTTP_STATUS" = "400" ]; then
  echo "✅ Edge function is deployed (Status: $HTTP_STATUS)"
  echo "   Response: $BODY"
  echo ""
  echo "This is expected - the function correctly rejects requests without required parameters."
elif [ "$HTTP_STATUS" = "500" ]; then
  echo "⚠️  Edge function error (Status: $HTTP_STATUS)"
  echo "   Response: $BODY"
  echo ""
  echo "ACTION REQUIRED:"
  echo "1. Check if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set"
  echo "2. Go to: https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/settings/functions"
  echo "3. Add both secrets"
  echo "4. Redeploy the edge function"
else
  echo "⚠️  Unexpected status: $HTTP_STATUS"
  echo "   Response: $BODY"
fi
echo ""

echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Follow the steps in GMAIL_CONNECTION_FIX.md"
echo "2. Deploy the database schema (Step 1)"
echo "3. Deploy the edge function (Step 2)"
echo "4. Configure secrets (Step 3)"
echo "5. Test the connection in your app (Step 5)"
echo ""
echo "For detailed instructions, see: GMAIL_CONNECTION_FIX.md"
echo ""
