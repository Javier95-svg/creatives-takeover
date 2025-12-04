-- Create the mentor-pictures storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('mentor-pictures', 'mentor-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload mentor pictures
CREATE POLICY "Admins can upload mentor pictures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mentor-pictures' 
  AND has_role(auth.uid(), 'admin')
);

-- Allow admins to update mentor pictures
CREATE POLICY "Admins can update mentor pictures"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'mentor-pictures' 
  AND has_role(auth.uid(), 'admin')
);

-- Allow admins to delete mentor pictures
CREATE POLICY "Admins can delete mentor pictures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mentor-pictures' 
  AND has_role(auth.uid(), 'admin')
);

-- Allow public read access to mentor pictures
CREATE POLICY "Public can view mentor pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'mentor-pictures');