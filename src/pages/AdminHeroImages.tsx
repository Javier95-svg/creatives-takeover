import { useEffect, useState } from "react";
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
import { Loader2, Shield, AlertTriangle, Upload, X, Image as ImageIcon } from "lucide-react";
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

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (authLoading) return;
      
      if (!user) {
        navigate('/login');
        return;
      }

      const adminCheck = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';
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

  const handleImageUpload = async (position: number, file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, WebP, GIF, or SVG image.');
      return;
    }

    // Validate file size (5MB = 5242880 bytes)
    const maxSize = 5242880;
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    try {
      setUploading(position);
      
      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({
          ...prev,
          [position]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);

      // Upload to storage
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `hero-${position}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('hero-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('hero-images')
        .getPublicUrl(fileName);

      // Save to database
      const existingImage = heroImages.find(img => img.position === position);
      const imageData = {
        position,
        image_url: publicUrl,
        alt_text: `Hero image ${position}`,
        is_active: true
      };

      if (existingImage?.id) {
        // Update existing
        const { error: updateError } = await supabase
          .from('hero_images')
          .update(imageData)
          .eq('id', existingImage.id);

        if (updateError) throw updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('hero_images')
          .insert(imageData);

        if (insertError) throw insertError;
      }

      toast.success(`Image ${position} uploaded successfully`);
      await loadHeroImages();
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(`Failed to upload image: ${error.message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = async (position: number) => {
    const image = heroImages.find(img => img.position === position);
    if (!image?.id) return;

    try {
      const { error } = await supabase
        .from('hero_images')
        .update({ is_active: false, image_url: '' })
        .eq('id', image.id);

      if (error) throw error;

      setPreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[position];
        return newPreviews;
      });

      toast.success(`Image ${position} removed`);
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
                      <CardTitle className="flex items-center justify-between">
                        <span>Image {position}</span>
                        {preview && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveImage(position)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Preview */}
                      {preview && (
                        <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-border bg-muted">
                          <img
                            src={preview}
                            alt={`Hero image ${position} preview`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Upload Area */}
                      <div className="space-y-2">
                        <Label htmlFor={`upload-${position}`}>Upload Image</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`upload-${position}`}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(position, file);
                              }
                            }}
                            disabled={isUploading}
                            className="flex-1"
                          />
                          {isUploading && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Max 5MB • JPEG, PNG, WebP, GIF, or SVG
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

