# Migration Guide: CORS and Supabase Version Updates

This guide documents the pattern for updating all edge functions to use the shared CORS utility and standardize Supabase versions.

## Pattern to Follow

For each edge function in `supabase/functions/`, apply these changes:

### 1. Update Imports
**Before:**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"; // or any version

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

**After:**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0"; // Standardized to 2.55.0
import { corsHeaders, handleOptionsRequest, corsResponse } from "../_shared/cors.ts";
```

### 2. Update OPTIONS Handler
**Before:**
```typescript
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
```

**After:**
```typescript
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleOptionsRequest();
  }
```

### 3. Update Response Headers
**Before:**
```typescript
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, "Content-Type": "application/json" }
});
```

**After:**
```typescript
return corsResponse(data);
```

**For error responses:**
**Before:**
```typescript
return new Response(JSON.stringify({ error: "message" }), {
  status: 500,
  headers: { ...corsHeaders, "Content-Type": "application/json" }
});
```

**After:**
```typescript
return corsResponse({ error: "message" }, 500);
```

## Functions Updated
- ✅ `initialize-dashboard` - Complete
- ✅ `trends-analyzer` - Complete

## Functions Remaining (41+)
- `ai-model-router`
- `bizmap-analysis`
- `bizmap-assets`
- `bizmap-refine`
- `bizmap-research`
- `business-insights-generator`
- `chatbot-ai-engine`
- `chatbot-streaming`
- `check-subscription`
- `commitment-manager`
- `community-ai-moderator`
- `community-feedback-analyzer`
- `create-checkout`
- `credit-service`
- `customer-portal`
- `daily-challenge-generator`
- `daily-reminder-service`
- `embed-text`
- `generate-pdf-report`
- `generate-recommendations`
- `location-search`
- `market-data-aggregator`
- `market-intelligence-refresh`
- `market-validation-engine`
- `memory-manager`
- `news-aggregator`
- `notify-admin`
- `notify-job-application`
- `process-community-feedback`
- `roadmap-task-generator`
- `rss-article-fetcher`
- `send-welcome-email`
- `share-chatbot-report`
- `speech-to-text`
- `sprint-task-generator`
- `stripe-revenue-metrics`
- `task-reminder-service`
- `track-activity`

## Quick Search Patterns

To find all functions that need updating:

1. **Find CORS headers:**
   ```bash
   grep -r "corsHeaders = {" supabase/functions/
   ```

2. **Find old Supabase versions:**
   ```bash
   grep -r "@supabase/supabase-js@2\." supabase/functions/ | grep -v "2.55.0"
   ```

3. **Find OPTIONS handlers:**
   ```bash
   grep -r "OPTIONS" supabase/functions/
   ```

## Automated Update Script

You can create a script to automate some of these updates, but be careful with:
- Different quote styles (single vs double)
- Different response patterns
- Error handling variations

Manual review is recommended for each function.

