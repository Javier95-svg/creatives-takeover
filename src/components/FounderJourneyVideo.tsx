import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2, Image } from 'lucide-react';
import { toast } from 'sonner';

interface FounderJourneyVideoProps {
  className?: string;
  position?: number; // 0 for first row, 1 for second row, etc.
}

// One fixed frame shape for every row. This used to start at this value and
// then be replaced by each GIF's own ratio once it had downloaded, which meant
// the frame visibly reshaped mid-scroll and, until then, letterboxed the GIF
// inside a rectangle it did not match.
const FRAME_ASPECT_RATIO = 256 / 135;

const FounderJourneyVideo = ({ className = '', position = 0 }: FounderJourneyVideoProps) => {
  const { user } = useAuth();
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [shouldLoadMedia, setShouldLoadMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaHostRef = useRef<HTMLDivElement>(null);

  // Check if user is admin
  useEffect(() => {
    if (user?.email?.toLowerCase() === 'admin@creatives-takeover.com') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Load active GIF for this position
  useEffect(() => {
    const loadGif = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('founder_journey_gifs')
          .select('gif_url')
          .eq('is_active', true)
          .eq('position', position)
          .order('uploaded_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data?.gif_url) {
          setGifUrl(data.gif_url);
        }
      } catch (error: any) {
        console.error('Error loading GIF:', error);
        // Don't show error toast for missing GIFs (first time setup)
        if (error.code !== 'PGRST116') {
          toast.error('Failed to load GIF');
        }
      } finally {
        setLoading(false);
      }
    };

    void loadGif();
  }, [position]);

  // These founder-journey GIFs are large remote assets. Keep their layout
  // reserved, but do not download them until the corresponding card is close
  // to the viewport. Previously all seven GIFs (more than 140 MB combined)
  // downloaded during the homepage's critical loading window.
  useEffect(() => {
    if (!gifUrl) return;

    // Admins are NOT exempt. They used to be, which meant every admin page view
    // eagerly downloaded all seven GIFs (~141 MB) instead of the handful actually
    // on screen — making the whole platform feel broken while signed in as admin.
    // The upload affordance is a hover overlay on the frame and works regardless
    // of whether the GIF itself has been fetched yet.
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoadMedia(true);
      return;
    }

    const host = mediaHostRef.current;
    if (!host) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoadMedia(true);
        observer.disconnect();
      },
      // Generous margin so a GIF starts downloading well before it is scrolled
      // into view. The 150px it used to use meant the lower rows only began
      // fetching once they were almost on screen, and a multi-megabyte GIF
      // cannot arrive in that window.
      { rootMargin: '1200px 0px', threshold: 0.01 },
    );

    observer.observe(host);
    return () => observer.disconnect();
  }, [gifUrl]);

  const handleGifUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a GIF file.');
      return;
    }

    // Validate file size (50MB = 52428800 bytes)
    const maxSize = 52428800;
    if (file.size > maxSize) {
      toast.error('File size exceeds 50MB limit. Please upload a smaller GIF.');
      return;
    }

    try {
      setUploading(true);
      toast.loading('Uploading GIF...', { id: 'upload-gif' });

      // Check if bucket exists (with better error handling)
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      console.log('Available buckets:', buckets?.map(b => ({ id: b.id, name: b.name })));
      if (bucketError) {
        console.error('Error checking buckets:', bucketError);
        // Don't fail here - try to upload anyway, the upload will fail with a clearer error
      }

      // Check both id and name (like AdminHeroImages does)
      const bucketExists = buckets?.some(b => 
        b.id === 'founder-journey-gifs' || b.name === 'founder-journey-gifs'
      );
      console.log('founder-journey-gifs bucket exists:', bucketExists);

      // If bucket check fails, try to upload anyway - the upload error will be more informative
      if (!bucketExists && buckets && buckets.length > 0) {
        // Only throw if we got buckets back but ours isn't there
        // If listBuckets failed, we'll let the upload attempt show the real error
        throw new Error('Storage bucket "founder-journey-gifs" does not exist. Please run the SQL migration.');
      }

      // Upload to storage
      const fileExt = file.name.split('.').pop() || 'gif';
      const fileName = `${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('founder-journey-gifs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        toast.error(`Upload failed: ${uploadError.message}`, { id: 'upload-gif' });
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('founder-journey-gifs')
        .getPublicUrl(fileName);

      // Deactivate all existing GIFs for this position FIRST
      // This must happen before inserting the new one to avoid unique constraint violation
      const { data: deactivateData, error: deactivateError } = await supabase
        .from('founder_journey_gifs')
        .update({ is_active: false })
        .eq('is_active', true)
        .eq('position', position)
        .select();

      if (deactivateError) {
        console.error('Error deactivating existing GIFs:', deactivateError);
        console.error('Deactivate error details:', { 
          message: deactivateError.message, 
          code: deactivateError.code,
          details: deactivateError.details,
          hint: deactivateError.hint
        });
        toast.error(`Failed to deactivate existing GIF: ${deactivateError.message}`, { id: 'upload-gif' });
        throw deactivateError;
      }

      console.log('Deactivated existing GIFs:', deactivateData);

      // Save to database
      const { error: insertError } = await supabase
        .from('founder_journey_gifs')
        .insert({
          gif_url: publicUrl,
          storage_path: fileName,
          uploaded_by: user?.id,
          position: position,
          is_active: true
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        toast.error(`Failed to save GIF: ${insertError.message}`, { id: 'upload-gif' });
        throw insertError;
      }

      setGifUrl(publicUrl);
      toast.success('GIF uploaded successfully!', { id: 'upload-gif' });
      
      // Reload the GIF to ensure it displays correctly
      // This will trigger the useEffect to fetch the new GIF
      const { data: reloadData, error: reloadError } = await supabase
        .from('founder_journey_gifs')
        .select('gif_url')
        .eq('is_active', true)
        .eq('position', position)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!reloadError && reloadData?.gif_url) {
        setGifUrl(reloadData.gif_url);
      }
    } catch (error: any) {
      console.error('Error uploading GIF:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      toast.error(`Failed to upload GIF: ${errorMessage}`, { id: 'upload-gif' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleGifUpload(file);
    }
  };

  // Visitors never see an empty slot or a "coming soon" placeholder — the media
  // only appears once a real GIF exists (this also covers the loading window, so
  // there's no spinner flash). Admins still get the upload affordance below.
  if (!isAdmin && !gifUrl) {
    return null;
  }

  if (loading) {
    return (
      <div className={`founder-journey-gif flex items-center justify-center bg-muted/30 rounded-lg border border-border ${className}`} style={{ aspectRatio: FRAME_ASPECT_RATIO }}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      ref={mediaHostRef}
      className={`founder-journey-gif relative group ${className}`}
      style={{ aspectRatio: FRAME_ASPECT_RATIO }}
    >
      {/* GIF Frame */}
      <div className="founder-journey-gif__frame w-full h-full rounded-lg border-4 border-border bg-muted/30 overflow-hidden relative shadow-xl">
        {gifUrl && shouldLoadMedia ? (
          <>
            {/* object-cover, not object-contain: the frame is a fixed 256/135
                rectangle and the GIFs are not, so contain letterboxed them —
                visibly, until the download finished and the old code reshaped
                the frame around the GIF. Cover fills the rectangle from the
                first painted frame.
                No loading="lazy" or fetchPriority="low" either: the
                IntersectionObserver above already decides when this <img>
                mounts, so those only added a second and third deferral on top
                of it, which is why the lower rows lagged worst. */}
            <img
              src={gifUrl}
              alt="Founder journey GIF"
              className="founder-journey-gif__image w-full h-full object-cover"
              width={1152}
              height={648}
              decoding="async"
            />
            {/* Admin overlay on hover */}
            {isAdmin && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-white text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">Click to replace GIF</p>
                </div>
              </div>
            )}
          </>
        ) : gifUrl ? (
          <div className="h-full w-full animate-pulse bg-muted/20" aria-hidden="true" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {/* Only admins reach this empty state (visitors return null above). */}
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                <Image className="w-8 h-8 text-primary/50" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">No GIF uploaded</p>
              <p className="text-xs text-muted-foreground">Click to upload</p>
            </div>
          </div>
        )}
      </div>

      {/* Admin Upload Controls */}
      {isAdmin && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/gif"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          <button
            type="button"
            aria-label="Upload video"
            className="absolute inset-0 z-10"
            onClick={() => {
              if (!uploading && fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 rounded-lg">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Uploading GIF...</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FounderJourneyVideo;

