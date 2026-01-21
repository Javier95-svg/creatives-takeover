import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles, LayoutDashboard, Users, DollarSign, Play, Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useConversionTracking } from "@/hooks/useConversionTracking";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HeroImage {
  position: number;
  image_url: string;
  alt_text: string | null;
}

const Hero = () => {
  const { isAuthenticated, user } = useAuth();
  const { trackTriggerView, trackEngagement, trackSignupStarted } = useConversionTracking();
  const heroRef = useRef<HTMLElement>(null);
  const hasTrackedView = useRef(false);
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [uploading, setUploading] = useState<number | null>(null);
  const [optimisticPreviews, setOptimisticPreviews] = useState<Record<number, string>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const imageLoadStartTimes = useRef<Map<number, number>>(new Map());
  
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';

  // Fetch hero images from database
  useEffect(() => {
    const fetchHeroImages = async () => {
      // #region agent log
      const dbFetchStart = performance.now();
      fetch('http://127.0.0.1:7260/ingest/44592efc-c57d-4c3c-82fe-1d199ab0c561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:32',message:'Database fetch started',data:{timestamp:dbFetchStart},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      try {
        console.log('🖼️ Fetching hero images from database...');
        const { data, error } = await supabase
          .from('hero_images')
          .select('position, image_url, alt_text')
          .eq('is_active', true)
          .order('position', { ascending: true });

        // #region agent log
        const dbFetchEnd = performance.now();
        const dbFetchDuration = dbFetchEnd - dbFetchStart;
        fetch('http://127.0.0.1:7260/ingest/44592efc-c57d-4c3c-82fe-1d199ab0c561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:40',message:'Database fetch completed',data:{hasError:!!error,errorMessage:error?.message,dataCount:data?.length||0,dbFetchDuration:dbFetchDuration.toFixed(2),imageUrls:data?.map(img=>({position:img.position,urlLength:img.image_url?.length||0}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion

        if (error) {
          console.error('❌ Error fetching hero images:', error);
          return;
        }

        console.log('✅ Hero images fetched:', data);
        if (data && data.length > 0) {
          console.log(`📸 Found ${data.length} active hero images:`, data);
          // #region agent log
          fetch('http://127.0.0.1:7260/ingest/44592efc-c57d-4c3c-82fe-1d199ab0c561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:48',message:'Setting hero images state',data:{imageCount:data.length,positions:data.map(img=>img.position),urlsAvailable:data.map(img=>!!img.image_url)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
          // #endregion
          setHeroImages(data);
        } else {
          console.log('⚠️ No active hero images found in database');
        }
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7260/ingest/44592efc-c57d-4c3c-82fe-1d199ab0c561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:53',message:'Database fetch error',data:{errorMessage:error instanceof Error?error.message:String(error),errorType:error?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        console.error('❌ Error fetching hero images:', error);
      }
    };

    fetchHeroImages();
  }, []);

  // Preload critical hero images (top row - positions 1 and 2) for faster loading
  useEffect(() => {
    // #region agent log
    const preloadStart = performance.now();
    fetch('http://127.0.0.1:7260/ingest/44592efc-c57d-4c3c-82fe-1d199ab0c561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:62',message:'Preload effect triggered',data:{heroImagesCount:heroImages.length,preloadStart},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    const topRowImages = heroImages.filter(img => img.position <= 2 && img.image_url);
    const bottomRowImages = heroImages.filter(img => img.position > 2 && img.image_url);
    
    // #region agent log
    fetch('http://127.0.0.1:7260/ingest/44592efc-c57d-4c3c-82fe-1d199ab0c561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:66',message:'Image filtering result',data:{topRowCount:topRowImages.length,bottomRowCount:bottomRowImages.length,topRowPositions:topRowImages.map(img=>img.position),bottomRowPositions:bottomRowImages.map(img=>img.position)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    
    if (topRowImages.length === 0) return;

    // Extract storage domain from first image URL for preconnect
    try {
      const firstImageUrl = topRowImages[0]?.image_url;
      if (firstImageUrl) {
        const imageUrl = new URL(firstImageUrl);
        const storageDomain = imageUrl.origin;
        
        // #region agent log
        fetch('http://127.0.0.1:7260/ingest/44592efc-c57d-4c3c-82fe-1d199ab0c561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:76',message:'Preconnect setup',data:{storageDomain,hasPreconnect:!!document.querySelector(`link[rel="preconnect"][href="${storageDomain}"]`)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        
        // Add preconnect link if it doesn't exist
        let preconnectLink = document.querySelector(`link[rel="preconnect"][href="${storageDomain}"]`);
        if (!preconnectLink) {
          preconnectLink = document.createElement('link');
          preconnectLink.setAttribute('rel', 'preconnect');
          preconnectLink.setAttribute('href', storageDomain);
          preconnectLink.setAttribute('crossorigin', 'anonymous');
          document.head.appendChild(preconnectLink);
        }
      }
    } catch (e) {
      // If URL parsing fails, skip preconnect
      console.warn('Could not parse image URL for preconnect:', e);
    }

    // Preload top row images
    topRowImages.forEach((image) => {
      // #region agent log
      const imgPreloadStart = performance.now();
      fetch('http://127.0.0.1:7260/ingest/44592efc-c57d-4c3c-82fe-1d199ab0c561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:95',message:'Creating preload link',data:{position:image.position,urlLength:image.image_url.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3,H5'})}).catch(()=>{});
      // #endregion
      const linkId = `hero-preload-${image.position}`;
      let preloadLink = document.getElementById(linkId) as HTMLLinkElement;
      
      if (!preloadLink) {
        preloadLink = document.createElement('link');
        preloadLink.id = linkId;
        preloadLink.setAttribute('rel', 'preload');
        preloadLink.setAttribute('as', 'image');
        document.head.appendChild(preloadLink);
      }
      
      preloadLink.setAttribute('href', image.image_url);
      // Add fetchpriority for critical images
      if (image.position <= 2) {
        preloadLink.setAttribute('fetchpriority', 'high');
      }
    });
    
    // #region agent log
    const preloadEnd = performance.now();
    fetch('http://127.0.0.1:7260/ingest/44592efc-c57d-4c3c-82fe-1d199ab0c561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:108',message:'Preload setup complete',data:{preloadDuration:(preloadEnd-preloadStart).toFixed(2),preloadedCount:topRowImages.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

    // Cleanup function to remove preload links when component unmounts or images change
    return () => {
      topRowImages.forEach((image) => {
        const linkId = `hero-preload-${image.position}`;
        const preloadLink = document.getElementById(linkId);
        if (preloadLink) {
          preloadLink.remove();
        }
      });
    };
  }, [heroImages]);

  // Handle image upload for admin
  const handleImageUpload = async (position: number, file: File, event?: React.ChangeEvent<HTMLInputElement>) => {
    // #region agent log
    fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:62',message:'handleImageUpload called',data:{position,fileName:file.name,fileType:file.type,fileSize:file.size,isAdmin,userEmail:user?.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    if (!isAdmin) {
      toast.error('Only admins can upload hero images');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    // Validate file size (5MB = 5242880 bytes)
    const maxSize = 5242880;
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    // Capture current state for error rollback
    const previousImages = [...heroImages];
    const previousImage = previousImages.find(img => img.position === position);

    // OPTIMISTIC UI: Show preview immediately using FileReader
    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result as string;
      setOptimisticPreviews(prev => ({ ...prev, [position]: previewUrl }));
      // Also update heroImages state immediately for instant rendering
      setHeroImages(prev => {
        const updated = [...prev];
        const existingIndex = updated.findIndex(img => img.position === position);
        if (existingIndex >= 0) {
          updated[existingIndex] = { ...updated[existingIndex], image_url: previewUrl };
        } else {
          updated.push({ position, image_url: previewUrl, alt_text: `Hero image ${position}` });
        }
        return updated;
      });
    };
    reader.readAsDataURL(file);

    try {
      setUploading(position);
      toast.loading('Uploading image...', { id: `upload-hero-${position}` });

      // Upload to storage with folder structure: {position}/{timestamp}.{ext}
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${position}/${Date.now()}.${fileExt}`;

      // #region agent log
      fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:90',message:'Before storage upload',data:{fileName,bucket:'hero-images',position,userEmail:user?.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('hero-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      // #region agent log
      fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:98',message:'Storage upload result',data:{hasError:!!uploadError,errorMessage:uploadError?.message,errorCode:uploadError?.statusCode,errorDetails:uploadError,hasData:!!uploadData,uploadPath:uploadData?.path},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        toast.error(`Upload failed: ${uploadError.message || 'Storage error'}`, { id: `upload-hero-${position}` });
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('hero-images')
        .getPublicUrl(fileName);

      // #region agent log
      fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:108',message:'Public URL generated',data:{publicUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion

      // OPTIMISTIC UI: Update state immediately with public URL (replaces preview)
      setOptimisticPreviews(prev => {
        const updated = { ...prev };
        updated[position] = publicUrl;
        return updated;
      });
      
      // Update heroImages state immediately for instant rendering
      setHeroImages(prev => {
        const updated = [...prev];
        const existingIndex = updated.findIndex(img => img.position === position);
        if (existingIndex >= 0) {
          updated[existingIndex] = { ...updated[existingIndex], image_url: publicUrl };
        } else {
          updated.push({ position, image_url: publicUrl, alt_text: `Hero image ${position}` });
        }
        return updated;
      });

      // Save to database (async, doesn't block UI)
      const existingImage = heroImages.find(img => img.position === position);
      const imageData = {
        position,
        image_url: publicUrl,
        alt_text: `Hero image ${position}`,
        is_active: true
      };

      // #region agent log
      fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:118',message:'Before database operation',data:{position,hasExistingImage:!!existingImage,existingImageId:existingImage?.id,imageData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion

      if (existingImage) {
        // Update existing - need to fetch the ID first
        const { data: existingData, error: fetchError } = await supabase
          .from('hero_images')
          .select('id')
          .eq('position', position)
          .single();

        // #region agent log
        fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:125',message:'Fetch existing image result',data:{hasError:!!fetchError,errorMessage:fetchError?.message,errorCode:fetchError?.code,hasData:!!existingData,existingId:existingData?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (existingData?.id) {
          // #region agent log
          fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:133',message:'Before database update',data:{id:existingData.id,imageData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
          // #endregion
          const { error: updateError } = await supabase
            .from('hero_images')
            .update(imageData)
            .eq('id', existingData.id);

          // #region agent log
          fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:137',message:'Database update result',data:{hasError:!!updateError,errorMessage:updateError?.message,errorCode:updateError?.code,errorDetails:updateError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
          // #endregion

          if (updateError) {
            throw updateError;
          }
        } else {
          // Insert if no existing record found
          // #region agent log
          fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:145',message:'Before database insert (no existing)',data:{imageData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
          // #endregion
          const { error: insertError } = await supabase
            .from('hero_images')
            .insert(imageData);

          // #region agent log
          fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:149',message:'Database insert result (no existing)',data:{hasError:!!insertError,errorMessage:insertError?.message,errorCode:insertError?.code,errorDetails:insertError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
          // #endregion

          if (insertError) {
            throw insertError;
          }
        }
      } else {
        // Insert new
        // #region agent log
        fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:157',message:'Before database insert (new)',data:{imageData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        const { error: insertError } = await supabase
          .from('hero_images')
          .insert(imageData);

        // #region agent log
        fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:161',message:'Database insert result (new)',data:{hasError:!!insertError,errorMessage:insertError?.message,errorCode:insertError?.code,errorDetails:insertError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion

        if (insertError) {
          throw insertError;
        }
      }

      toast.success(`Image ${position} uploaded successfully!`, { id: `upload-hero-${position}` });
      
      // #region agent log
      fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:167',message:'Upload success, database saved',data:{position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      
      // Note: State already updated optimistically above, no need to reload from database
    } catch (error: any) {
      console.error('Error uploading image:', error);
      // #region agent log
      fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:179',message:'Upload catch error',data:{errorMessage:error?.message,errorCode:error?.code,errorStatus:error?.statusCode,errorDetails:error,position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1,H2'})}).catch(()=>{});
      // #endregion
      
      // Revert optimistic update on error
      setOptimisticPreviews(prev => {
        const updated = { ...prev };
        delete updated[position];
        return updated;
      });
      
      // Revert heroImages state to previous value
      if (previousImage) {
        setHeroImages(prev => {
          const updated = [...prev];
          const existingIndex = updated.findIndex(img => img.position === position);
          if (existingIndex >= 0) {
            updated[existingIndex] = previousImage;
          } else {
            updated.push(previousImage);
          }
          return updated;
        });
      } else {
        // Remove if it was a new image
        setHeroImages(prev => prev.filter(img => img.position !== position));
      }
      
      toast.error(`Failed to upload image: ${error?.message || 'Unknown error'}`, { id: `upload-hero-${position}` });
    } finally {
      setUploading(null);
      // Reset file input
      if (event?.target) {
        event.target.value = '';
      }
    }
  };

  // Track hero CTA view when component is visible
  useEffect(() => {
    if (hasTrackedView.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView.current) {
            hasTrackedView.current = true;
            trackTriggerView('hero-primary-cta', {
              ctaType: 'primary',
              authenticated: isAuthenticated,
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => {
      if (heroRef.current) {
        observer.unobserve(heroRef.current);
      }
    };
  }, [trackTriggerView, isAuthenticated]);

  // Handle CTA clicks
  const handlePrimaryCTAClick = () => {
    trackEngagement('hero-primary-cta', 85);
  };

  const handleDashboardCTAClick = () => {
    trackEngagement('hero-dashboard-cta', 90);
  };

  const handleSecondaryCTAClick = (e: React.MouseEvent) => {
    e.preventDefault();
    trackEngagement('hero-secondary-cta', 70);
    
    // Small delay to ensure tracking is logged
    setTimeout(() => {
      // Find the target section
      const targetSection = document.getElementById('what-you-get');
      if (targetSection) {
        // Get the navigation bar height (typically 64px for h-16)
        const navHeight = 64;
        const targetPosition = targetSection.getBoundingClientRect().top + window.pageYOffset - navHeight;
        
        // Smooth scroll to the section
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      } else {
        // Fallback: try scrolling after a short delay in case component hasn't rendered
        setTimeout(() => {
          const targetSection = document.getElementById('what-you-get');
          if (targetSection) {
            const navHeight = 64;
            const targetPosition = targetSection.getBoundingClientRect().top + window.pageYOffset - navHeight;
            window.scrollTo({
              top: targetPosition,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    }, 10);
  };

  const handleTertiaryCTAClick = () => {
    trackSignupStarted('hero-tertiary-cta');
  };
  
  return (
    <section
      ref={heroRef}
      id="overview"
      className="scroll-mt-24 relative pt-24 pb-20 px-4 sm:px-6 font-poppins"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/40 to-transparent pointer-events-none" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Section - All existing content */}
          <div className="text-center md:text-left flex flex-col justify-center">
            {/* Main Headline */}
            <h1 className="font-space-grotesk text-4xl sm:text-5xl lg:text-6xl font-semibold mb-6 leading-tight tracking-tight">
              The <span className="text-primary">Zero to One</span> Platform
            </h1>

            {/* Subheadline - Improved readability */}
            <p className="font-poppins text-base sm:text-lg text-muted-foreground mb-8 max-w-xl mx-auto md:mx-0 leading-relaxed">
              We blend technology, strategy and community to democratize startup formation, empowering founders with AI-driven planning, community support, and fundraising tools.
            </p>
            
            {/* Enhanced CTA Section */}
            <div className="mb-8 sm:mb-10">
              {isAuthenticated ? (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center md:justify-start">
                  <Button size="lg" className="w-full sm:w-auto" asChild>
                    <Link to="/dashboard" onClick={handleDashboardCTAClick}>
                      <LayoutDashboard className="w-5 h-5" />
                      Open Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center md:justify-start">
                <Button size="lg" className="w-full sm:w-auto" asChild>
                  <Link to="/signup" onClick={handlePrimaryCTAClick}>
                    Join Today
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>

                <Button 
                  variant="outline"
                  size="lg" 
                  className="w-full sm:w-auto" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleSecondaryCTAClick(e as any);
                  }}
                >
                  <Play className="w-4 h-4" />
                  Explore Features
                </Button>
              </div>
              )}
            </div>
          </div>

          {/* Right Section - 4-Pic Grid Layout */}
          <div className="hidden md:block">
            <div className="rounded-2xl border border-border/70 bg-card shadow-lg p-4">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
                {[1, 2, 3, 4].map((position) => {
                // Use optimistic preview if available (instant rendering), otherwise use database image
                const optimisticPreview = optimisticPreviews[position];
                const image = heroImages.find(img => img.position === position);
                // Top row (positions 1 and 2) - no default fallback images, must be uploaded
                const imageSrc = optimisticPreview || image?.image_url || '';
                const altText = image?.alt_text || `Hero image ${position}`;
                const isUploadingPosition = uploading === position;
                // Load all images eagerly for faster display
                const shouldLoadEagerly = true;
                
                // #region agent log
                if (imageSrc) {
                  fetch('http://127.0.0.1:7260/ingest/44592efc-c57d-4c3c-82fe-1d199ab0c561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:556',message:'Image rendering in grid',data:{position,hasOptimisticPreview:!!optimisticPreview,hasDbImage:!!image,shouldLoadEagerly,renderTime:performance.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1,H3'})}).catch(()=>{});
                }
                // #endregion

                if (!imageSrc) {
                  return (
                    <div
                      key={position}
                      className="relative rounded-xl border border-dashed border-border/70 bg-muted/30 aspect-square flex flex-col items-center justify-center gap-3 p-4"
                    >
                      <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                      {isAdmin && (
                        <div className="w-full space-y-2">
                          <Input
                            ref={(el) => {
                              fileInputRefs.current[position] = el;
                            }}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(position, file, e);
                              }
                            }}
                            disabled={isUploadingPosition}
                            className="hidden"
                            id={`hero-upload-${position}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const fileInput = fileInputRefs.current[position];
                              if (fileInput) {
                                fileInput.click();
                              }
                            }}
                            disabled={isUploadingPosition}
                            className="w-full"
                          >
                            {isUploadingPosition ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Choose File
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={position}
                    className="relative rounded-xl overflow-hidden border border-border/60 bg-muted/30 group"
                  >
                    <img
                      src={imageSrc}
                      alt={altText}
                      className="w-full h-auto object-cover aspect-square"
                      loading={shouldLoadEagerly ? "eager" : "lazy"}
                      fetchPriority={shouldLoadEagerly ? "high" : "auto"}
                      decoding="async"
                      width="800"
                      height="800"
                      key={optimisticPreview ? `optimistic-${position}-${Date.now()}` : `stable-${position}`}
                      onLoadStart={(e) => {
                        // #region agent log
                        const img = e.currentTarget;
                        const loadStartTime = performance.now();
                        imageLoadStartTimes.current.set(position, loadStartTime);
                        fetch('http://127.0.0.1:7260/ingest/44592efc-c57d-4c3c-82fe-1d199ab0c561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:679',message:'Image load started',data:{position,imageSrc:imageSrc.substring(0,100),shouldLoadEagerly,loadStartTime,imgWidth:img.naturalWidth||0,imgHeight:img.naturalHeight||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4,H5'})}).catch(()=>{});
                        // #endregion
                      }}
                      onLoad={(e) => {
                        // #region agent log
                        const img = e.currentTarget;
                        const loadEndTime = performance.now();
                        const loadStartTime = imageLoadStartTimes.current.get(position) || loadEndTime;
                        const loadDuration = loadEndTime - loadStartTime;
                        imageLoadStartTimes.current.delete(position);
                        fetch('http://127.0.0.1:7260/ingest/44592efc-c57d-4c3c-82fe-1d199ab0c561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:688',message:'Image load completed',data:{position,loadEndTime,loadDuration:loadDuration.toFixed(2),imgWidth:img.naturalWidth,imgHeight:img.naturalHeight,imgComplete:img.complete,shouldLoadEagerly,urlLength:imageSrc.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2,H4,H5'})}).catch(()=>{});
                        // #endregion
                      }}
                      onError={(e) => {
                        // #region agent log
                        imageLoadStartTimes.current.delete(position);
                        fetch('http://127.0.0.1:7260/ingest/44592efc-c57d-4c3c-82fe-1d199ab0c561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:695',message:'Image load error',data:{position,imageSrc:imageSrc.substring(0,100),shouldLoadEagerly},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
                        // #endregion
                      }}
                    />
                    {isAdmin && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <div className="space-y-2 w-full px-4">
                          <Input
                            ref={(el) => {
                              fileInputRefs.current[position] = el;
                            }}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(position, file, e);
                              }
                            }}
                            disabled={isUploadingPosition}
                            className="hidden"
                            id={`hero-upload-${position}`}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const fileInput = fileInputRefs.current[position];
                              if (fileInput) {
                                fileInput.click();
                              }
                            }}
                            disabled={isUploadingPosition}
                            className="w-full"
                          >
                            {isUploadingPosition ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Choose File
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
