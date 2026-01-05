# Contact Form Database Setup

## Overview
This guide will help you create the `contact_submissions` table in Supabase to store all contact form submissions.

---

## 🗄️ Database Table: `contact_submissions`

This table stores every contact form submission with the following information:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Unique identifier (auto-generated) |
| `created_at` | Timestamp | When the submission was received |
| `name` | Text | Full name of the person |
| `email` | Text | Email address |
| `role` | Text | Their role (founder, angel_investor, vc, etc.) |
| `reason` | Text | Reason for contact (general, partnership, investment, etc.) |
| `message` | Text | Their message content |
| `admin_email_sent` | Boolean | Whether admin notification email was sent |
| `user_email_sent` | Boolean | Whether user confirmation email was sent |
| `admin_email_id` | Text | Resend email ID for admin notification (for tracking) |
| `user_email_id` | Text | Resend email ID for user confirmation (for tracking) |
| `error_message` | Text | Any error messages if email delivery failed |
| `user_agent` | Text | Browser/device information |
| `ip_address` | Text | IP address of submitter |

---

## 📋 Setup Steps

### Option 1: Using Supabase SQL Editor (Recommended)

1. **Go to Supabase SQL Editor**:
   - Navigate to: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/sql/new

2. **Copy and paste this SQL code**:

```sql
-- Create contact_submissions table to store all contact form submissions
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Contact Information
  name TEXT NOT NULL,
  email TEXT NOT NULL,

  -- Categorization
  role TEXT NOT NULL,
  reason TEXT NOT NULL,

  -- Message Content
  message TEXT NOT NULL,

  -- Email Delivery Status
  admin_email_sent BOOLEAN DEFAULT false,
  user_email_sent BOOLEAN DEFAULT false,
  admin_email_id TEXT,
  user_email_id TEXT,

  -- Error Tracking
  error_message TEXT,

  -- Metadata
  user_agent TEXT,
  ip_address TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON public.contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON public.contact_submissions(email);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_role ON public.contact_submissions(role);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_reason ON public.contact_submissions(reason);

-- Enable Row Level Security
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Create policy: Only authenticated users (admins) can read submissions
CREATE POLICY "Admins can view all contact submissions" ON public.contact_submissions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create policy: Allow the edge function to insert submissions (using service role)
CREATE POLICY "Service role can insert contact submissions" ON public.contact_submissions
  FOR INSERT
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE public.contact_submissions IS 'Stores all contact form submissions from the website';
```

3. **Click "Run"** to execute the SQL

4. **Verify the table was created**:
   - Go to: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/editor
   - You should see a new table called `contact_submissions`

### Option 2: Using Supabase CLI (Alternative)

If you prefer using the CLI:

```bash
# Apply the migration
npx supabase db push

# Or run the specific migration file
npx supabase migration up
```

---

## 🚀 Deploy Updated Edge Function

After creating the table, you need to redeploy the edge function to use the database:

```bash
npx supabase functions deploy contact-form-submission
```

---

## 📊 Viewing Submissions

### Via Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/editor
2. Click on the `contact_submissions` table
3. You'll see all submissions with full details

### Via SQL Query:

```sql
-- View all submissions (most recent first)
SELECT * FROM contact_submissions ORDER BY created_at DESC;

-- View submissions by role
SELECT * FROM contact_submissions WHERE role = 'founder' ORDER BY created_at DESC;

-- View submissions by reason
SELECT * FROM contact_submissions WHERE reason = 'investment' ORDER BY created_at DESC;

-- Check email delivery status
SELECT
  name,
  email,
  created_at,
  admin_email_sent,
  user_email_sent,
  error_message
FROM contact_submissions
WHERE admin_email_sent = false OR user_email_sent = false;
```

---

## 🔍 How It Works

### 1. User Submits Form
- User fills out the contact form on `/about` page
- Clicks "Send Message"

### 2. Edge Function Processes Submission
- Validates all required fields
- Tries to send admin notification email
- Tries to send user confirmation email
- **ALWAYS saves to database** (even if emails fail)
- Tracks email delivery status

### 3. You Get Notified
- **Email**: Receive admin notification at `admin@creatives-takeover.com`
- **Database**: View all submissions in Supabase dashboard
- **Logs**: Check function logs for errors

### 4. Data Stored Forever
- Even if email fails, the submission is saved in the database
- You can always go back and respond to missed inquiries
- Full audit trail of all contact attempts

---

## 🛡️ Benefits of Database Storage

1. **No Lost Messages**: Even if email fails, data is saved
2. **Historical Record**: Complete archive of all inquiries
3. **Analytics**: Track which roles and reasons are most common
4. **Backup**: Multiple ways to access contact information
5. **Audit Trail**: See email delivery status for each submission
6. **Searchable**: Query by email, role, reason, date, etc.

---

## 🧪 Testing

After setup, test the contact form:

1. Go to: https://creatives-takeover.com/about
2. Fill out and submit the form
3. Check your email at `admin@creatives-takeover.com`
4. Check the database:
   - Go to Supabase Editor
   - Open `contact_submissions` table
   - You should see your test submission

---

## 📈 Sample Queries for Analytics

```sql
-- Count submissions by role
SELECT role, COUNT(*) as count
FROM contact_submissions
GROUP BY role
ORDER BY count DESC;

-- Count submissions by reason
SELECT reason, COUNT(*) as count
FROM contact_submissions
GROUP BY reason
ORDER BY count DESC;

-- Submissions in the last 7 days
SELECT * FROM contact_submissions
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Failed email deliveries
SELECT * FROM contact_submissions
WHERE admin_email_sent = false OR user_email_sent = false;
```

---

## ✅ Next Steps

1. ✅ Create the `contact_submissions` table using SQL Editor
2. ✅ Redeploy the edge function: `npx supabase functions deploy contact-form-submission`
3. ✅ Test the contact form on your website
4. ✅ Check both email and database for the test submission
5. ✅ Set up regular checks of the database for new submissions

---

**Your contact form now has bulletproof data storage! 🎉**

Every submission is permanently saved, giving you a reliable backup even if email delivery has issues.
