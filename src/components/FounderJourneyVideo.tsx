import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2, Image } from 'lucide-react';
import { toast } from 'sonner';

interface FounderJourneyVideoProps {
  className?: string;
  position?: number; // 0 for first row, 1 for second row, etc.
}

const FounderJourneyVideo = ({ className = '', position = 0 }: FounderJourneyVideoProps) => {
  const { user } = useAuth();
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [gifAspectRatio, setGifAspectRatio] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user is admin
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7258/ingest/99ab3382-ad71-4976-bc21-281a5fd09888',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FounderJourneyVideo.tsx:21',message:'Admin check',data:{hasUser:!!user,userId:user?.id,userEmail:user?.email,emailMatch:user?.email?.toLowerCase() === 'admin@creatives-takeover.com'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
          // Reset aspect ratio when loading new GIF
          setGifAspectRatio(null);
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

    loadGif();
  }, [position]);

  const handleGifUpload = async (file: File) => {
    // #region agent log
    fetch('http://127.0.0.1:7258/ingest/99ab3382-ad71-4976-bc21-281a5fd09888',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FounderJourneyVideo.tsx:62',message:'handleGifUpload called',data:{hasUser:!!user,userId:user?.id,userEmail:user?.email,isAdmin,position,fileSize:file.size,fileType:file.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
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
      
      // #region agent log
      fetch('http://127.0.0.1:7258/ingest/99ab3382-ad71-4976-bc21-281a5fd09888',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FounderJourneyVideo.tsx:77',message:'Before upload - checking auth state',data:{userId:user?.id,userEmail:user?.email,position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

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
      
      // #region agent log
      fetch('http://127.0.0.1:7258/ingest/99ab3382-ad71-4976-bc21-281a5fd09888',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FounderJourneyVideo.tsx:148',message:'Before insert - payload details',data:{userId:user?.id,userEmail:user?.email,position,publicUrl,fileName,uploaded_by:user?.id,is_active:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

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
      
      // #region agent log
      fetch('http://127.0.0.1:7258/ingest/99ab3382-ad71-4976-bc21-281a5fd09888',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FounderJourneyVideo.tsx:160',message:'Insert result',data:{hasError:!!insertError,errorMessage:insertError?.message,errorCode:insertError?.code,errorDetails:insertError?.details,errorHint:insertError?.hint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      if (insertError) {
        console.error('Database insert error:', insertError);
        // #region agent log
        fetch('http://127.0.0.1:7258/ingest/99ab3382-ad71-4976-bc21-281a5fd09888',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FounderJourneyVideo.tsx:163',message:'Insert error details',data:{errorMessage:insertError.message,errorCode:insertError.code,errorDetails:insertError.details,errorHint:insertError.hint,userId:user?.id,userEmail:user?.email,position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
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
        // Reset aspect ratio when loading new GIF
        setGifAspectRatio(null);
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
      handleGifUpload(file);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      setGifAspectRatio(aspectRatio);
    }
  };

  // Use calculated aspect ratio or fallback to 256/135
  const containerAspectRatio = gifAspectRatio || 256/135;

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted/30 rounded-lg border border-border ${className}`} style={{ aspectRatio: containerAspectRatio }}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`} style={{ aspectRatio: containerAspectRatio }}>
      {/* GIF Frame */}
      <div className="w-full h-full rounded-lg border-4 border-border bg-muted/30 overflow-hidden relative shadow-xl">
        {gifUrl ? (
          <>
            <img
              src={gifUrl}
              alt="Founder journey GIF"
              className="w-full h-full object-contain"
              onLoad={handleImageLoad}
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
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isAdmin ? (
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Image className="w-8 h-8 text-primary/50" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">No GIF uploaded</p>
                <p className="text-xs text-muted-foreground">Click to upload</p>
              </div>
            ) : (
              <div className="text-center p-6">
                <Image className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">GIF coming soon</p>
              </div>
            )}
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
          <div
            className="absolute inset-0 cursor-pointer z-10"
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

