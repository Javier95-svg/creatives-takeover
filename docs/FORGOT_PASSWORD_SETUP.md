# Forgot Password Feature - Setup Guide

## ✅ Frontend Changes (Already Done)
The "Forgot Password" link has been added to both sign-in pages:
- `/auth` page (Auth.tsx)
- `/login` page (Login.tsx)

**No SQL code needed for this feature!**

## 🔧 Backend Configuration (Supabase Dashboard)

The password reset feature uses Supabase's built-in `resetPasswordForEmail` function. Configure these in **Supabase Dashboard** (not SQL Editor):

### 1. Email Templates
Go to: **Authentication → Email Templates → Reset Password**
- Customize the email template if needed
- Ensure redirect URL is set correctly

### 2. Site URL Configuration
Go to: **Project Settings → API → Site URL**
- Set to your production domain (e.g., `https://yourdomain.com`)
- This is used for password reset redirects

### 3. Redirect URLs
Go to: **Authentication → URL Configuration**
- Add your reset password page URL: `https://yourdomain.com/reset-password`
- Or for local dev: `http://localhost:5173/reset-password`

## 📊 Optional: Verification Queries

If you want to check email-related settings or user email status, you can run these queries:

### Check if user email is confirmed
```sql
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  created_at
FROM auth.users
WHERE email = 'does@elevatedynamics.pt';
```

### Check password reset requests (if you have a logs table)
```sql
-- This query checks recent auth log events (if available)
SELECT 
  id,
  instance_id,
  created_at,
  event_type
FROM auth.audit_log_entries
WHERE event_type = 'password_recovery_requested'
ORDER BY created_at DESC
LIMIT 10;
```

### Verify user can receive emails
```sql
-- Check user account status
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  u.banned_until IS NULL as not_banned,
  u.confirmed_at IS NOT NULL as account_confirmed
FROM auth.users u
WHERE u.email = 'does@elevatedynamics.pt';
```

## 🚀 How It Works

1. User clicks "Forgot password?" on sign-in page
2. User enters email on `/forgot-password` page
3. Supabase sends password reset email automatically
4. User clicks link in email → redirected to `/reset-password`
5. User sets new password
6. User can sign in with new password

## ⚠️ Important Notes

- **No SQL migrations needed** - Supabase handles password reset internally
- Email configuration is done in **Supabase Dashboard**, not SQL Editor
- Make sure your **Site URL** and **Redirect URLs** are configured correctly
- Password reset links expire after 1 hour (default Supabase setting)

## 🧪 Testing

To test the forgot password flow:
1. Go to `/auth` or `/login`
2. Click "Forgot password?"
3. Enter a valid user email
4. Check email inbox for reset link
5. Click link and set new password
