# Troubleshooting Contact Form Email Issue

## Issue
Emails are not being received at admin@creatives-takeover.com when the contact form is submitted.

## Recent Changes Made

1. **Fixed email format**: Changed `to: adminEmail` to `to: [adminEmail]` (array format matching working functions)
2. **Fixed reply-to format**: Changed `replyTo` to `reply_to` (underscore format matching Resend API)
3. **Added Resend error checking**: Now checks for `response.error` which is how Resend SDK returns errors
4. **Enhanced logging**: Added detailed logging at every step

## Step-by-Step Diagnosis

### Step 1: Check Supabase Function Logs

1. Go to: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/functions/contact-form-submission
2. Click on **"Logs"** tab
3. Submit the form again
4. Look for these log entries:
   - `[CONTACT-FORM] Function started`
   - `[CONTACT-FORM] Environment check:` - This shows which env vars are set
   - `[CONTACT-FORM] Resend client initialized successfully`
   - `[CONTACT-FORM] Attempting to send admin email to:`
   - `[CONTACT-FORM] Resend API response:` - This shows the actual Resend response

**What to look for:**
- If you see `hasResendApiKey: false` → RESEND_API_KEY is not set
- If you see `Failed to send admin email` → Check the error details
- If you see `Resend API response:` with an `error` field → That's the Resend API error

### Step 2: Verify Environment Variables

Go to: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/settings/functions

**Required variables:**
- `RESEND_API_KEY` - Must start with `re_`
- `CONTACT_ADMIN_EMAIL` - Should be `admin@creatives-takeover.com`
- `FROM_EMAIL` - Should be `onboarding@resend.dev` or your verified domain
- `FROM_NAME` - Optional, defaults to "Creatives Takeover"

**To verify RESEND_API_KEY:**
1. Go to https://resend.com/api-keys
2. Make sure the API key exists and is active
3. Copy it exactly (including the `re_` prefix)
4. Paste it into Supabase environment variables

### Step 3: Test Resend API Key Directly

You can test if the API key works by making a direct API call:

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_RESEND_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "Creatives Takeover <onboarding@resend.dev>",
    "to": ["admin@creatives-takeover.com"],
    "subject": "Test Email",
    "html": "<p>This is a test email</p>"
  }'
```

**Expected response:**
```json
{
  "id": "re_xxxxxxxxxxxxx"
}
```

If you get an error, the API key is invalid or expired.

### Step 4: Check Resend Dashboard

1. Go to: https://resend.com/emails
2. Look for recent email attempts
3. Check the status:
   - ✅ **Sent** - Email was sent successfully (check spam folder)
   - ❌ **Bounced** - Email address is invalid or blocked
   - ⏳ **Pending** - Email is queued
   - ❌ **Failed** - Check the error message

### Step 5: Check Email Inbox

1. Check **inbox** at admin@creatives-takeover.com
2. Check **spam/junk folder**
3. Check **all mail** (Gmail shows all emails)
4. Search for subject: `📬 New Contact:`

### Step 6: Verify Function is Deployed

1. Go to: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/functions
2. Find `contact-form-submission`
3. Check if it shows as **"Active"**
4. If not, redeploy:
   ```bash
   npx supabase functions deploy contact-form-submission
   ```

## Common Issues & Solutions

### Issue 1: "RESEND_API_KEY is not configured"
**Solution:** 
- Go to Supabase Dashboard → Settings → Edge Functions → Environment Variables
- Add `RESEND_API_KEY` with your Resend API key
- Make sure it starts with `re_`

### Issue 2: "Invalid API key" or "Unauthorized"
**Solution:**
- Generate a new API key in Resend dashboard
- Update `RESEND_API_KEY` in Supabase
- Redeploy the function

### Issue 3: "Domain not verified"
**Solution:**
- If using a custom `FROM_EMAIL`, verify the domain in Resend
- OR use `onboarding@resend.dev` (pre-verified by Resend)

### Issue 4: Emails sent but not received
**Solution:**
- Check spam folder
- Check Resend dashboard for bounce/spam reports
- Verify admin@creatives-takeover.com is a valid email address
- Try sending to a different email address to test

### Issue 5: Function returns success but no email
**Solution:**
- Check Supabase logs for `Resend API response:` 
- Look for `error` field in the response
- The function now only returns success if email is actually sent

## Testing the Fix

After deploying the updated function:

1. Submit the contact form
2. Check browser console for any errors
3. Check Supabase function logs immediately
4. Look for these specific log entries:
   ```
   [CONTACT-FORM] Environment check: { hasResendApiKey: true, ... }
   [CONTACT-FORM] Resend client initialized successfully
   [CONTACT-FORM] Resend API response: { "data": { "id": "..." } }
   ```
5. If you see an error, copy the full error message from logs

## Next Steps

If emails still don't work after checking all the above:

1. **Share the Supabase function logs** - Copy the log output from a test submission
2. **Share the Resend dashboard status** - Screenshot of the email attempt
3. **Verify the email address** - Make sure admin@creatives-takeover.com is a valid, active email

## Code Changes Summary

The following changes were made to fix potential issues:

1. **Email format**: Changed to array format `to: [adminEmail]` (matches working functions)
2. **Reply-to format**: Changed to `reply_to: email` (underscore, matches Resend API)
3. **Error handling**: Now checks `response.error` from Resend SDK
4. **Logging**: Added comprehensive logging at every step
5. **Validation**: Only returns success if admin email is actually sent

