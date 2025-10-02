-- Create job positions table
CREATE TABLE public.job_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT[] NOT NULL DEFAULT '{}',
  responsibilities TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job applications table
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  position_id UUID REFERENCES public.job_positions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  linkedin_url TEXT NOT NULL,
  portfolio_url TEXT,
  cv_file_path TEXT NOT NULL,
  cover_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_positions
CREATE POLICY "Anyone can view active job positions"
  ON public.job_positions FOR SELECT
  USING (is_active = true);

-- RLS Policies for job_applications
CREATE POLICY "Users can create their own applications"
  ON public.job_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own applications"
  ON public.job_applications FOR SELECT
  USING (auth.uid() = user_id);

-- Create storage bucket for CVs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cv-uploads', 'cv-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for CV uploads
CREATE POLICY "Users can upload their own CVs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cv-uploads' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NULL)
  );

CREATE POLICY "Users can view their own CVs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cv-uploads' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NULL)
  );

-- Insert the 3 job positions
INSERT INTO public.job_positions (title, description, requirements, responsibilities) VALUES
(
  'Full Stack Developer',
  'We''re seeking a talented Full Stack Developer to join our growing team. You''ll work on cutting-edge projects using modern technologies and contribute to building innovative solutions.',
  ARRAY[
    '3+ years of experience with React and TypeScript',
    'Strong knowledge of Node.js and backend development',
    'Experience with Supabase or similar backend-as-a-service platforms',
    'Proficiency in modern web development practices',
    'Excellent problem-solving and communication skills'
  ],
  ARRAY[
    'Develop and maintain full-stack web applications',
    'Collaborate with designers and product managers',
    'Write clean, maintainable, and well-documented code',
    'Participate in code reviews and technical discussions',
    'Contribute to architectural decisions'
  ]
),
(
  'Growth Marketer',
  'Join us as a Growth Marketer and drive our user acquisition and retention strategies. You''ll be responsible for developing and executing innovative marketing campaigns that fuel our growth.',
  ARRAY[
    '2+ years of experience in growth marketing or digital marketing',
    'Proven track record of driving user acquisition and engagement',
    'Strong analytical skills and data-driven mindset',
    'Experience with marketing automation tools and analytics platforms',
    'Excellent content creation and copywriting skills'
  ],
  ARRAY[
    'Develop and execute growth marketing strategies',
    'Manage multi-channel marketing campaigns',
    'Analyze user data and optimize conversion funnels',
    'Create compelling content for various channels',
    'Collaborate with product and sales teams'
  ]
),
(
  'Sales Development Representative',
  'We''re looking for a motivated Sales Development Representative to join our sales team. You''ll be the first point of contact for potential customers and play a crucial role in our growth.',
  ARRAY[
    '1-2 years of B2B sales or SDR experience',
    'Excellent communication and interpersonal skills',
    'Experience with CRM systems (Salesforce, HubSpot, etc.)',
    'Strong research and lead qualification abilities',
    'Self-motivated with a competitive mindset'
  ],
  ARRAY[
    'Generate qualified leads through outbound prospecting',
    'Conduct initial discovery calls with potential customers',
    'Manage and maintain CRM database',
    'Collaborate with Account Executives on sales strategies',
    'Meet and exceed monthly lead generation targets'
  ]
);

-- Trigger for updating updated_at
CREATE TRIGGER update_job_positions_updated_at
  BEFORE UPDATE ON public.job_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();