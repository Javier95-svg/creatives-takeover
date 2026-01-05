# Contact Form Email Troubleshooting - Not Receiving Emails

## 🚨 Issue: Emails Not Being Received

You've successfully created the database table and deployed the function, but emails are still not arriving at admin@creatives-takeover.com.

---

## 🔍 Step 1: Check Function Logs (MOST IMPORTANT)

1. **Go to Function Logs**:
   - https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/functions/contact-form-submission/logs

2. **Look for recent entries** from your test submission

3. **Check for specific errors**:
   - ❌ "RESEND_API_KEY is not defined"
   - ❌ "Failed to send admin email"
   - ❌ "Invalid API key"
   - ❌ "Unauthorized"
   - ❌ Any Resend-related errors

4. **Screenshot the error** and we can fix it together

---

## 🔧 Step 2: Verify ALL Environment Variables

Go to: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/settings/functions

**Check these EXACT variable names** (case-sensitive):

| Variable Name | Expected Value | Status |
|--------------|----------------|--------|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxx` (starts with "re_") | ❓ CHECK |
| `FROM_EMAIL` | `onboarding@resend.dev` OR your verified domain | ❓ CHECK |
| `FROM_NAME` | `Creatives Takeover` | ❓ CHECK |
| `CONTACT_ADMIN_EMAIL` | `admin@creatives-takeover.com` | ✅ SET |

**CRITICAL**: The variable names must be EXACTLY as shown above (including capitalization).

---

## 🔑 Step 3: Verify Resend API Key

### Check if RESEND_API_KEY is Valid:

1. **Log into Resend**: https://resend.com/api-keys

2. **Check your API keys**:
   - Is there an active API key?
   - Has it been deleted or expired?
   - Does it start with "re_"?

3. **If no API key exists or it's invalid**:
   - Click "Create API Key"
   - Name: "Creatives Takeover Contact Form"
   - Permissions: "Full Access" or "Send emails"
   - Copy the key (starts with "re_")

4. **Add/Update in Supabase**:
   - Go to: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/settings/functions
   - Find "Secrets" section
   - Add or update `RESEND_API_KEY` with your new key
   - Click "Save"

5. **Redeploy the function** after updating the key:
   ```bash
   npx supabase functions deploy contact-form-submission
   ```

---

## 📧 Step 4: Check FROM_EMAIL Configuration

### Option A: Use Resend's Default Sender (Easiest)

Set `FROM_EMAIL` to: `onboarding@resend.dev`

This works immediately without domain verification.

### Option B: Use Custom Domain (Requires Verification)

If you want to use `noreply@creatives-takeover.com`:

1. **Verify your domain in Resend**:
   - Go to: https://resend.com/domains
   - Add domain: `creatives-takeover.com`
   - Add the DNS records shown

2. **Wait for verification** (can take a few minutes to hours)

3. **Then set** `FROM_EMAIL` to: `noreply@creatives-takeover.com`

**RECOMMENDATION**: Start with `onboarding@resend.dev` to test first.

---

## 🧪 Step 5: Test Again

After verifying environment variables:

1. **Redeploy the function**:
   ```bash
   npx supabase functions deploy contact-form-submission
   ```

2. **Submit a test message** on your website

3. **Check THREE places**:
   - ✅ admin@creatives-takeover.com inbox
   - ✅ admin@creatives-takeover.com spam/junk folder
   - ✅ Supabase function logs: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/functions/contact-form-submission/logs

4. **Check database** to confirm submission was saved:
   - Go to: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/editor
   - Open `contact_submissions` table
   - Look for your test submission
   - Check `admin_email_sent` column (should be `true` if email was sent)

---

## 🔍 Step 6: Check Resend Dashboard

1. **Go to Resend Emails**: https://resend.com/emails

2. **Look for recent emails**:
   - Do you see any attempts to send emails?
   - What's their status (Delivered, Failed, Bounced)?
   - Click on an email to see error details

3. **Common Resend errors**:
   - "Invalid API key" → Need to update `RESEND_API_KEY`
   - "Unverified sender" → Need to use `onboarding@resend.dev` or verify domain
   - "Rate limit exceeded" → Wait or upgrade Resend plan

---

## 📊 Step 7: Check Database for Clues

Run this query in Supabase SQL Editor:

```sql
SELECT
  name,
  email,
  created_at,
  admin_email_sent,
  user_email_sent,
  error_message,
  admin_email_id,
  user_email_id
FROM contact_submissions
ORDER BY created_at DESC
LIMIT 5;
```

**What to look for**:
- Is `admin_email_sent` = `false`? → Email failed to send
- Is `error_message` populated? → Shows the exact error
- Is `admin_email_id` NULL? → Email was never sent to Resend

---

## 🚀 Quick Fix Checklist

Try these in order:

1. ✅ **Verify RESEND_API_KEY exists and is valid**
   - Go to: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/settings/functions
   - Check Secrets section for `RESEND_API_KEY`

2. ✅ **Set FROM_EMAIL to Resend's default**
   - Set `FROM_EMAIL` = `onboarding@resend.dev`

3. ✅ **Confirm CONTACT_ADMIN_EMAIL is set**
   - `CONTACT_ADMIN_EMAIL` = `admin@creatives-takeover.com`

4. ✅ **Redeploy the function**
   ```bash
   npx supabase functions deploy contact-form-submission
   ```

5. ✅ **Test again and check logs**
   - Submit form
   - Check function logs immediately
   - Look for success or error messages

---

## 💡 Most Common Issues:

### Issue #1: Missing RESEND_API_KEY
**Symptom**: "RESEND_API_KEY is not defined" in logs
**Fix**: Add the API key from Resend dashboard to Supabase secrets

### Issue #2: Invalid FROM_EMAIL
**Symptom**: "Unverified sender" or "Invalid from address"
**Fix**: Use `onboarding@resend.dev` instead of custom domain

### Issue #3: Wrong Variable Names
**Symptom**: No emails sent, no errors in logs
**Fix**: Ensure exact variable names (case-sensitive): `RESEND_API_KEY`, `FROM_EMAIL`, `CONTACT_ADMIN_EMAIL`

### Issue #4: Function Not Redeployed
**Symptom**: Changes not taking effect
**Fix**: Always run `npx supabase functions deploy contact-form-submission` after changing secrets

---

## 📝 What to Send Me:

If still not working, please share:

1. **Screenshot of function logs** (from the most recent test submission)
2. **Screenshot of environment variables** (blur sensitive values)
3. **What you see in the database** (`contact_submissions` table, latest row)
4. **Any error messages** from browser console

This will help me pinpoint the exact issue!

---

## 🎯 Expected Behavior When Working:

When everything is configured correctly:

1. User submits form → sees "Message sent successfully!" toast
2. Function logs show: "Admin notification sent: [email_id]"
3. Database shows: `admin_email_sent = true`
4. Resend dashboard shows: Email delivered
5. admin@creatives-takeover.com receives email within seconds

---

**Let's get this fixed! Check the function logs first - they'll tell us exactly what's wrong.**
