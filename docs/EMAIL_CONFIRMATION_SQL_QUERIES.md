# Email Confirmation - SQL Verification Queries

## ⚠️ Important: No SQL Migrations Needed!

The email confirmation fixes are **frontend-only changes**. No database migrations or SQL code is required!

Supabase handles email confirmation internally through the `auth.users` table, which you cannot modify directly via SQL.

---

## 📊 Optional: Verification Queries

If you want to **check** email confirmation status or troubleshoot issues, here are some useful queries:

### **1. Check Users Who Haven't Confirmed Email**

```sql
-- Find users who signed up but haven't confirmed their email
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN 'Not Confirmed'
    ELSE 'Confirmed'
  END as confirmation_status
FROM auth.users
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC
LIMIT 50;
```

---

### **2. Check Specific User's Email Confirmation Status**

```sql
-- Check if a specific user has confirmed their email
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  confirmed_at IS NOT NULL as account_confirmed,
  created_at,
  email_confirmed_at,
  confirmed_at
FROM auth.users
WHERE email = 'user@example.com';
```

---

### **3. Count Unconfirmed Users**

```sql
-- Count how many users haven't confirmed their email
SELECT 
  COUNT(*) as total_users,
  COUNT(email_confirmed_at) as confirmed_users,
  COUNT(*) - COUNT(email_confirmed_at) as unconfirmed_users,
  ROUND(
    (COUNT(email_confirmed_at)::numeric / COUNT(*)::numeric) * 100, 
    2
  ) as confirmation_rate_percent
FROM auth.users
WHERE created_at > NOW() - INTERVAL '30 days';  -- Last 30 days
```

---

### **4. Check Recent Signups and Confirmation Status**

```sql
-- See recent signups and their confirmation status
SELECT 
  email,
  created_at as signup_date,
  email_confirmed_at as confirmation_date,
  CASE 
    WHEN email_confirmed_at IS NULL THEN 'Pending'
    WHEN email_confirmed_at IS NOT NULL THEN 'Confirmed'
  END as status,
  CASE 
    WHEN email_confirmed_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (email_confirmed_at - created_at)) / 60
    ELSE NULL
  END as minutes_to_confirm
FROM auth.users
WHERE created_at > NOW() - INTERVAL '7 days'  -- Last 7 days
ORDER BY created_at DESC;
```

---

### **5. Find Users Who Signed Up But Never Confirmed**

```sql
-- Users who signed up more than 24 hours ago but haven't confirmed
SELECT 
  id,
  email,
  created_at,
  NOW() - created_at as time_since_signup,
  email_confirmed_at
FROM auth.users
WHERE email_confirmed_at IS NULL
  AND created_at < NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

### **6. Check Email Confirmation Rate Over Time**

```sql
-- Daily confirmation rate for the last 30 days
SELECT 
  DATE(created_at) as signup_date,
  COUNT(*) as total_signups,
  COUNT(email_confirmed_at) as confirmed_signups,
  COUNT(*) - COUNT(email_confirmed_at) as unconfirmed_signups,
  ROUND(
    (COUNT(email_confirmed_at)::numeric / COUNT(*)::numeric) * 100, 
    2
  ) as confirmation_rate_percent
FROM auth.users
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;
```

---

### **7. Verify User Can Sign In (Complete Check)**

```sql
-- Complete check for a specific user's sign-in readiness
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  u.confirmed_at IS NOT NULL as account_confirmed,
  u.banned_until IS NULL as not_banned,
  p.subscription_tier as profile_tier,
  uc.balance as credits,
  CASE 
    WHEN u.email_confirmed_at IS NULL THEN '❌ Cannot sign in - Email not confirmed'
    WHEN u.banned_until IS NOT NULL THEN '❌ Cannot sign in - Account banned'
    WHEN p.id IS NULL THEN '⚠️ Can sign in but profile missing'
    ELSE '✅ Can sign in'
  END as signin_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_credits uc ON uc.user_id = u.id
WHERE u.email = 'user@example.com';
```

---

## 🔧 Manual Email Confirmation (Admin Only)

If you need to manually confirm a user's email (for testing or support), you **cannot** do this via SQL. You must use the Supabase Dashboard:

1. Go to: **Supabase Dashboard → Authentication → Users**
2. Find the user
3. Click **"Confirm Email"** button

**Note:** Direct SQL updates to `auth.users` are not allowed for security reasons.

---

## 📋 What Changed (No SQL Needed)

### **Frontend Changes Only:**
- ✅ Updated redirect URLs to `/auth/callback`
- ✅ Added email confirmation handling in AuthCallback
- ✅ Added resend confirmation email feature
- ✅ Improved user feedback and error messages

### **No Database Changes:**
- ❌ No new tables created
- ❌ No migrations needed
- ❌ No SQL code required
- ❌ No schema changes

---

## ✅ Summary

**You do NOT need to run any SQL code!**

The email confirmation fixes are purely frontend changes. Supabase handles all email confirmation logic internally.

The queries above are **optional** - use them only if you want to:
- Monitor email confirmation rates
- Troubleshoot specific user issues
- Generate reports on confirmation status

All fixes are ready to use immediately - just deploy the frontend changes! 🚀
