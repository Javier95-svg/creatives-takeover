# Contact Form Email Setup Guide

## Overview
The contact form is now fully functional and will send immediate email notifications to your team whenever someone submits a message. This guide will help you configure the final email settings.

---

## 🚀 Quick Setup Checklist

- [ ] Configure `CONTACT_ADMIN_EMAIL` environment variable in Supabase
- [ ] Verify `RESEND_API_KEY` is set
- [ ] Verify `FROM_EMAIL` is configured
- [ ] Test the contact form
- [ ] Check spam folder for test emails
- [ ] Confirm emails are arriving

---

## 📧 Email Configuration

### Step 1: Set Environment Variables in Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa
2. Navigate to **Settings** → **Edge Functions** → **Environment Variables**
3. Add/verify the following variables:

| Variable Name | Value | Purpose |
|--------------|-------|---------|
| `CONTACT_ADMIN_EMAIL` | `admin@creatives-takeover.com` | Where contact form submissions are sent |
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxx` | Your Resend API key for email delivery |
| `FROM_EMAIL` | `onboarding@resend.dev` or your verified domain | Sender email address |
| `FROM_NAME` | `Creatives Takeover` | Sender name displayed in emails |

### Step 2: Verify Resend Configuration

If you haven't already set up Resend:

1. Go to https://resend.com/
2. Create an account or sign in
3. Get your API key from the dashboard
4. Add your domain (optional, but recommended for better deliverability)
5. Copy the API key to `RESEND_API_KEY` in Supabase

---

## 📬 What Happens When Someone Submits the Form

### 1. **Admin Notification Email** (to `admin@creatives-takeover.com`)

You'll receive an email with:
- ✅ Full contact details (name, email, role, reason)
- ✅ Complete message content
- ✅ Timestamp of submission
- ✅ Quick "Reply" button (pre-fills their email)
- ✅ Professional branded template

**Subject Line:** `📬 New Contact: [Reason] from [Name]`

Example: `📬 New Contact: Partnership Opportunity from John Smith`

### 2. **User Confirmation Email** (to the person who submitted)

They receive:
- ✅ Personalized greeting
- ✅ Submission summary
- ✅ Copy of their message
- ✅ 24-hour response commitment
- ✅ Links to explore the platform
- ✅ Your direct contact email

**Subject Line:** `Thank you for contacting Creatives Takeover!`

---

## 🛡️ Fallback & Error Handling

### If Email Service Fails:

1. **User sees a friendly error message** with your fallback email:
   - "Please email us directly at admin@creatives-takeover.com"

2. **Error is logged** in Supabase Functions logs for debugging

3. **Form doesn't lose data** - user can copy their message before trying again

### Monitoring Email Delivery:

- Check Supabase Functions logs: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/functions/contact-form-submission
- Check Resend dashboard for delivery status: https://resend.com/emails
- Monitor your email inbox for notifications

---

## 🧪 Testing the Contact Form

### Test Submission Steps:

1. Go to your website: https://creatives-takeover.com/about
2. Scroll to the "Contact Us" section
3. Fill out the form with test data:
   - Name: Test User
   - Email: your-test-email@example.com
   - Role: Founder / Entrepreneur
   - Reason: General Inquiry
   - Message: "This is a test submission"
4. Click "Send Message"

### Expected Results:

✅ Success toast notification appears
✅ Form resets to empty fields
✅ You receive admin notification email within seconds
✅ Test email address receives confirmation email

### Troubleshooting:

**Problem:** No emails received
- Check spam/junk folder
- Verify `CONTACT_ADMIN_EMAIL` is set correctly
- Check Supabase Functions logs for errors
- Verify `RESEND_API_KEY` is valid

**Problem:** Form shows error
- Check browser console for error details
- Verify edge function is deployed: `npx supabase functions list`
- Check Supabase Functions logs

**Problem:** Emails go to spam
- Set up a custom domain in Resend (improves deliverability)
- Add SPF/DKIM records to your domain
- Mark emails as "Not Spam" in your email client

---

## 📊 Form Analytics & Monitoring

### View Submission Logs:

1. Go to Supabase Dashboard
2. Navigate to **Functions** → `contact-form-submission`
3. Click **Logs** to see all submissions

### Email Delivery Analytics:

1. Go to Resend Dashboard: https://resend.com/emails
2. View delivery status, open rates, etc.

---

## 🔐 Security Features

✅ **CORS Protection** - Only your domain can submit forms
✅ **Input Validation** - All fields are validated server-side
✅ **Rate Limiting** - Supabase functions have built-in rate limits
✅ **Secure Email Delivery** - Uses Resend's secure API
✅ **No Exposed Credentials** - API keys stored in environment variables

---

## 🎨 Customization Options

### Change Admin Email:

Update `CONTACT_ADMIN_EMAIL` environment variable in Supabase Dashboard

### Add Multiple Recipients:

Modify the edge function to send to multiple emails:

```typescript
const adminEmails = [
  "admin@creatives-takeover.com",
  "support@creatives-takeover.com"
];

await resend.emails.send({
  from: `${fromName} <${fromEmail}>`,
  to: adminEmails, // Array of emails
  subject: `...`,
  html: adminEmailHtml,
});
```

### Customize Email Templates:

Edit the HTML templates in:
`supabase/functions/contact-form-submission/index.ts`

Look for `adminEmailHtml` and `userEmailHtml` variables.

---

## 📞 Support

If you encounter any issues:

1. Check Supabase Functions logs
2. Check Resend email logs
3. Verify environment variables are set
4. Test with a different email address
5. Check browser console for errors

---

## ✅ Final Checklist

- [ ] Environment variables configured in Supabase
- [ ] Resend API key is valid
- [ ] Test submission completed successfully
- [ ] Admin email received
- [ ] User confirmation email received
- [ ] Error handling tested (try submitting with invalid data)
- [ ] Form is accessible on production site

---

**Your contact form is now live and ready to receive messages! 🎉**

Every submission will trigger immediate email notifications with full details, ensuring you never miss an opportunity to connect with founders, investors, mentors, or partners.
