import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, AlertTriangle, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface HeroImage {
  id: string;
  position: number;
  image_url: string;
  alt_text: string | null;
  is_active: boolean;
}

const AdminHeroImages = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<number | null>(null);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    const checkAdminStatus = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:35',message:'checkAdminStatus called',data:{authLoading,hasUser:!!user,userEmail:user?.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      if (authLoading) return;
      
      if (!user) {
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:40',message:'No user, redirecting to login',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        navigate('/login');
        return;
      }

      const adminCheck = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:44',message:'Admin check result',data:{userEmail:user?.email,adminCheck},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      setIsAdmin(adminCheck);
      setChecking(false);

      if (adminCheck) {
        loadHeroImages();
      }
    };

    checkAdminStatus();
  }, [user, authLoading, navigate]);

  const loadHeroImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hero_images')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;

      // Initialize with 4 positions if empty
      const images: HeroImage[] = data || [];
      const positions = [1, 2, 3, 4];
      
      const fullImages = positions.map(pos => {
        const existing = images.find(img => img.position === pos);
        return existing || {
          id: '',
          position: pos,
          image_url: '',
          alt_text: `Hero image ${pos}`,
          is_active: false
        };
      });

      setHeroImages(fullImages);
      
      // Load previews
      const previewMap: Record<number, string> = {};
      fullImages.forEach(img => {
        if (img.image_url) {
          previewMap[img.position] = img.image_url;
        }
      });
      setPreviews(previewMap);
    } catch (error: any) {
      console.error('Error loading hero images:', error);
      toast.error('Failed to load hero images');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (position: number, file: File, event?: React.ChangeEvent<HTMLInputElement>) => {
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:98',message:'handleImageUpload called',data:{position,fileName:file.name,fileType:file.type,fileSize:file.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    // Validate file type - only JPG and PNG
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:102',message:'File type validation failed',data:{fileType:file.type,allowedTypes},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      toast.error('Invalid file type. Please upload a JPG or PNG image.');
      return;
    }

    // Validate file size (5MB = 5242880 bytes)
    const maxSize = 5242880;
    if (file.size > maxSize) {
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:109',message:'File size validation failed',data:{fileSize:file.size,maxSize},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      toast.error('File size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    try {
      setUploading(position);
      toast.loading('Uploading image...', { id: `upload-image-${position}` });
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:114',message:'Starting upload process',data:{position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion

      // Show immediate preview using FileReader (base64)
      const reader = new FileReader();
      reader.onloadend = () => {
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:120',message:'Preview loaded',data:{position,hasPreview:!!reader.result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
        setPreviews(prev => ({
          ...prev,
          [position]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);

      // Check if bucket exists first
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      console.log('Available buckets:', buckets?.map(b => b.id));
      if (bucketError) {
        console.error('Error checking buckets:', bucketError);
      }
      const bucketExists = buckets?.some(b => b.id === 'hero-images' || b.name === 'hero-images');
      console.log('hero-images bucket exists:', bucketExists);
      if (!bucketExists) {
        const errorMsg = 'Storage bucket "hero-images" does not exist. Please run the SQL migration to create it.';
        console.error(errorMsg);
        toast.error(errorMsg, { id: `upload-image-${position}` });
        throw new Error(errorMsg);
      }

      // Upload to storage with folder structure: {position}/{timestamp}.{ext}
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${position}/${Date.now()}.${fileExt}`;

      console.log('Uploading to storage', { 
        fileName, 
        bucket: 'hero-images',
        position,
        fileSize: file.size,
        fileType: file.type
      });
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:131',message:'Before storage upload',data:{fileName,bucket:'hero-images',position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6'})}).catch(()=>{});
      // #endregion

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('hero-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:147',message:'Storage upload error',data:{error:uploadError.message,code:uploadError.statusCode,errorDetails:uploadError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6'})}).catch(()=>{});
        // #endregion
        toast.error(`Upload failed: ${uploadError.message || 'Storage error'}`, { id: `upload-image-${position}` });
        throw uploadError;
      }

      console.log('File uploaded to storage', { path: uploadData.path });
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:153',message:'Storage upload success',data:{path:uploadData.path},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6'})}).catch(()=>{});
      // #endregion

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('hero-images')
        .getPublicUrl(fileName);

      console.log('Public URL generated', { publicUrl });
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:156',message:'Public URL generated',data:{publicUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H7'})}).catch(()=>{});
      // #endregion

      // Update preview with public URL (replaces base64 preview)
      setPreviews(prev => ({
        ...prev,
        [position]: publicUrl
      }));

      // Save to database
      const existingImage = heroImages.find(img => img.position === position);
      const imageData = {
        position,
        image_url: publicUrl,
        alt_text: `Hero image ${position}`,
        is_active: true
      };
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:169',message:'Before database save',data:{position,hasExistingImage:!!existingImage?.id,existingImageId:existingImage?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H8'})}).catch(()=>{});
      // #endregion

      if (existingImage?.id) {
        // Update existing
        const { error: updateError } = await supabase
          .from('hero_images')
          .update(imageData)
          .eq('id', existingImage.id);

        if (updateError) {
          console.error('Database update error:', updateError);
          // #region agent log
          fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:179',message:'Database update error',data:{error:updateError.message,code:updateError.code,errorDetails:updateError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H8'})}).catch(()=>{});
          // #endregion
          toast.error(`Failed to save image: ${updateError.message || 'Database error'}`, { id: `upload-image-${position}` });
          throw updateError;
        }

        console.log('Image saved to database', { position, imageId: existingImage.id });
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:190',message:'Database update success',data:{position,imageId:existingImage.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H8'})}).catch(()=>{});
        // #endregion
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('hero_images')
          .insert(imageData);

        if (insertError) {
          console.error('Database insert error:', insertError);
          // #region agent log
          fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:197',message:'Database insert error',data:{error:insertError.message,code:insertError.code,errorDetails:insertError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H8'})}).catch(()=>{});
          // #endregion
          toast.error(`Failed to save image: ${insertError.message || 'Database error'}`, { id: `upload-image-${position}` });
          throw insertError;
        }

        console.log('Image inserted to database', { position });
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:203',message:'Database insert success',data:{position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H8'})}).catch(()=>{});
        // #endregion
      }

      toast.success(`Image ${position} uploaded successfully!`, { id: `upload-image-${position}` });
      console.log('✅ Upload complete! Reloading images...', { position, publicUrl, imageData });
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:206',message:'Upload complete, reloading images',data:{position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H9'})}).catch(()=>{});
      // #endregion
      await loadHeroImages();
      
      // Verify the image was saved correctly
      const { data: verifyData, error: verifyError } = await supabase
        .from('hero_images')
        .select('*')
        .eq('position', position)
        .eq('is_active', true)
        .single();
      
      console.log('Verification query result:', { verifyData, verifyError });
      if (verifyData) {
        console.log('✅ Image verified in database:', verifyData);
      } else if (verifyError) {
        console.error('❌ Verification failed:', verifyError);
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:208',message:'Upload catch error',data:{error:error?.message,errorType:error?.constructor?.name,errorStack:error?.stack,position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H10'})}).catch(()=>{});
      // #endregion
      const errorMessage = error?.message || 'Unknown error occurred';
      toast.error(`Failed to upload image: ${errorMessage}`, { id: `upload-image-${position}` });
      
      // Reset preview on error
      const existingImage = heroImages.find(img => img.position === position);
      if (existingImage?.image_url) {
        setPreviews(prev => ({
          ...prev,
          [position]: existingImage.image_url
        }));
      } else {
        setPreviews(prev => {
          const newPreviews = { ...prev };
          delete newPreviews[position];
          return newPreviews;
        });
      }
    } finally {
      setUploading(null);
      // Clear the file input
      if (event?.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemoveImage = async (position: number) => {
    const image = heroImages.find(img => img.position === position);
    if (!image?.id) {
      // If no image in database, just clear preview
      setPreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[position];
        return newPreviews;
      });
      toast.success('Preview removed');
      return;
    }

    try {
      toast.loading('Removing image...', { id: `remove-image-${position}` });

      const { error } = await supabase
        .from('hero_images')
        .update({ is_active: false })
        .eq('id', image.id);

      if (error) {
        console.error('Error removing image:', error);
        toast.error(`Failed to remove image: ${error.message}`, { id: `remove-image-${position}` });
        throw error;
      }

      // Clear preview state
      setPreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[position];
        return newPreviews;
      });

      toast.success(`Image ${position} removed`, { id: `remove-image-${position}` });
      await loadHeroImages();
    } catch (error: any) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image');
    }
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl flex items-center justify-center">
          <Card className="w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
              <h2 className="text-2xl font-bold">Access Denied</h2>
              <p className="text-muted-foreground">
                You don't have permission to access this page. Admin privileges are required.
              </p>
              <Button onClick={() => navigate('/')} variant="outline">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-primary/5">
      <Navigation />
      <ScrollToTop />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
                Manage Hero Images
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload and manage the 4 images displayed in the hero section grid
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((position) => {
                const image = heroImages.find(img => img.position === position);
                const preview = previews[position];
                const isUploading = uploading === position;

                return (
                  <Card key={position} className="overflow-hidden">
                    <CardHeader>
                      <CardTitle>Image {position}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Preview - Matching Hero.tsx styling */}
                      {preview ? (
                        <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border border-border bg-muted/30 aspect-square">
                          <img
                            src={preview}
                            alt={`Hero image ${position} preview`}
                            className="w-full h-full object-cover"
                            style={{
                              filter: 'saturate(1.15) brightness(0.97) contrast(1.08)',
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
                          {/* Remove button overlay */}
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => handleRemoveImage(position)}
                            disabled={isUploading}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border border-border bg-muted/30 aspect-square flex items-center justify-center">
                          <div className="text-center p-6">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-primary/50" />
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                              No image uploaded
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Upload Area - Matching Stories banner pattern */}
                      <div className="space-y-2">
                        <Label htmlFor={`upload-${position}`} className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          Upload Picture
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`upload-${position}`}
                            ref={(el) => {
                              fileInputRefs.current[position] = el;
                            }}
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={(e) => {
                              // #region agent log
                              fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:400',message:'File input onChange triggered',data:{position,hasFile:!!e.target.files?.[0],fileName:e.target.files?.[0]?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
                              // #endregion
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(position, file, e);
                              }
                            }}
                            disabled={isUploading}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              // #region agent log
                              fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminHeroImages.tsx:409',message:'Upload button clicked',data:{position,hasFileInput:!!fileInputRefs.current[position]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
                              // #endregion
                              fileInputRefs.current[position]?.click();
                            }}
                            disabled={isUploading}
                            className="flex-1"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Picture
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Upload a hero image (max 5MB). Supported formats: JPG, PNG.
                        </p>
                      </div>

                      {/* Alt Text */}
                      {image?.id && (
                        <div className="space-y-2">
                          <Label htmlFor={`alt-${position}`}>Alt Text</Label>
                          <Input
                            id={`alt-${position}`}
                            value={image.alt_text || ''}
                            onChange={async (e) => {
                              const newAltText = e.target.value;
                              try {
                                const { error } = await supabase
                                  .from('hero_images')
                                  .update({ alt_text: newAltText })
                                  .eq('id', image.id);

                                if (error) throw error;
                                await loadHeroImages();
                              } catch (error: any) {
                                toast.error('Failed to update alt text');
                              }
                            }}
                            placeholder={`Description for image ${position}`}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminHeroImages;

