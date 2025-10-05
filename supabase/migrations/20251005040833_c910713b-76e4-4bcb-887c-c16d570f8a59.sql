-- Enable RLS on trends table
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to active trends
CREATE POLICY "Public can view active trends"
ON public.trends
FOR SELECT
TO public
USING (
  is_active = true 
  AND expires_at > now()
);

-- Create policy for authenticated users to view all trends
CREATE POLICY "Authenticated users can view all trends"
ON public.trends
FOR SELECT
TO authenticated
USING (true);