-- Create contact_submissions table to store all contact form submissions
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Contact Information
  name TEXT NOT NULL,
  email TEXT NOT NULL,

  -- Categorization
  role TEXT NOT NULL, -- founder, angel_investor, vc, accelerator, mentor, partner, media, other
  reason TEXT NOT NULL, -- general, partnership, investment, mentorship, support, feedback, media, collaboration

  -- Message Content
  message TEXT NOT NULL,

  -- Email Delivery Status
  admin_email_sent BOOLEAN DEFAULT false,
  user_email_sent BOOLEAN DEFAULT false,
  admin_email_id TEXT, -- Resend email ID for tracking
  user_email_id TEXT, -- Resend email ID for tracking

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
