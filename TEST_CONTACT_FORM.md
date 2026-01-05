# Contact Form Testing & Troubleshooting Guide

## Issue: No emails received at admin@creatives-takeover.com

### Quick Diagnosis Checklist:

1. **✅ Edge Function Deployed**: `contact-form-submission` is ACTIVE (deployed on 2026-01-05)
2. **❓ Environment Variables**: Need to verify in Supabase Dashboard
3. **❓ Email Service**: Need to verify Resend API key is working
4. **❓ Function Logs**: Need to check for errors during submission

---

## Step 1: Verify Environment Variables in Supabase

Go to: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/settings/functions

**Required Environment Variables:**

| Variable Name | Expected Value | Purpose |
|--------------|----------------|---------|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxx` | Email delivery service |
| `FROM_EMAIL` | `onboarding@resend.dev` or verified domain | Sender email |
| `FROM_NAME` | `Creatives Takeover` | Sender name |
| `CONTACT_ADMIN_EMAIL` | `admin@creatives-takeover.com` | **WHERE EMAILS ARE SENT** |

**CRITICAL:** If `CONTACT_ADMIN_EMAIL` is not set, emails won't be delivered!

---

## Step 2: Check Function Logs for Errors

1. Go to: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/functions/contact-form-submission
2. Click on **"Logs"** tab
3. Look for recent entries when you submitted the form
4. Check for error messages like:
   - "RESEND_API_KEY is not defined"
   - "Failed to send email"
   - "Network error"
   - "Invalid API key"

---

## Step 3: Test the Function Directly

You can test the function using this curl command:

```bash
curl -X POST 'https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/contact-form-submission' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "role": "founder",
    "reason": "general",
    "message": "This is a test message from the contact form"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Your message has been sent successfully!",
  "adminEmailId": "xxxxx",
  "userEmailId": "xxxxx"
}
```

---

## Step 4: Verify Resend Account

1. Go to: https://resend.com/emails
2. Check if emails are being sent (even if bouncing/failing)
3. Look for:
   - Delivery status
   - Bounce reasons
   - API key validity

---

## Common Issues & Solutions:

### Issue 1: `CONTACT_ADMIN_EMAIL` Not Set
**Solution:** Add the environment variable in Supabase Dashboard
```
Name: CONTACT_ADMIN_EMAIL
Value: admin@creatives-takeover.com
```

### Issue 2: Resend API Key Invalid/Expired
**Solution:**
1. Generate new API key in Resend dashboard
2. Update `RESEND_API_KEY` in Supabase
3. Redeploy function: `npx supabase functions deploy contact-form-submission`

### Issue 3: Emails Going to Spam
**Solution:**
- Check admin@creatives-takeover.com spam folder
- Add sender to safe senders list
- Set up custom domain in Resend for better deliverability

### Issue 4: FROM_EMAIL Not Verified
**Solution:**
- Use `onboarding@resend.dev` (Resend's default sender)
- OR verify your custom domain in Resend

---

## Step 5: Enable Debug Mode

Add console.log statements to see what's happening:

1. Check browser console when submitting form
2. Look for success/error messages
3. Check Network tab for function response

---

## Immediate Action Items:

1. **FIRST**: Go to Supabase Dashboard and verify `CONTACT_ADMIN_EMAIL` is set to `admin@creatives-takeover.com`

2. **SECOND**: Check Supabase function logs for errors from your test submission

3. **THIRD**: Check your spam folder at admin@creatives-takeover.com

4. **FOURTH**: Verify Resend API key is valid by logging into https://resend.com

---

## Testing Procedure:

1. Submit a test message through the contact form on /about page
2. Check browser console for errors
3. Check Supabase function logs immediately
4. Check admin@creatives-takeover.com inbox (and spam)
5. Check Resend dashboard for delivery status

---

## If All Else Fails:

**Temporary Workaround:**
The form already has error handling that shows:
```
"Please email us directly at admin@creatives-takeover.com"
```

This ensures you don't miss messages even if the automated system fails.

---

## Support Contacts:

- Supabase Support: https://supabase.com/dashboard/support
- Resend Support: https://resend.com/support

---

**Last Updated:** 2026-01-05
**Function Version:** 1 (deployed 2026-01-05 03:13:35)
