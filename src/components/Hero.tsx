import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles, LayoutDashboard, Users, Zap, DollarSign, Play, Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useConversionTracking } from "@/hooks/useConversionTracking";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AnimatedBackground } from "@/components/hero/AnimatedBackground";
import { RGBParticles } from "@/components/hero/RGBParticles";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { PulseCTA } from "@/components/ui/PulseCTA";

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
  
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';

  // Fetch hero images from database
  useEffect(() => {
    const fetchHeroImages = async () => {
      try {
        console.log('🖼️ Fetching hero images from database...');
        const { data, error } = await supabase
          .from('hero_images')
          .select('position, image_url, alt_text')
          .eq('is_active', true)
          .order('position', { ascending: true });

        if (error) {
          console.error('❌ Error fetching hero images:', error);
          return;
        }

        console.log('✅ Hero images fetched:', data);
        if (data && data.length > 0) {
          console.log(`📸 Found ${data.length} active hero images:`, data);
          setHeroImages(data);
        } else {
          console.log('⚠️ No active hero images found in database');
        }
      } catch (error) {
        console.error('❌ Error fetching hero images:', error);
      }
    };

    fetchHeroImages();
  }, []);

  // Preload critical hero images (top row - positions 1 and 2) for faster loading
  useEffect(() => {
    const topRowImages = heroImages.filter(img => img.position <= 2 && img.image_url);
    if (topRowImages.length === 0) return;

    // Extract storage domain from first image URL for preconnect
    try {
      const firstImageUrl = topRowImages[0]?.image_url;
      if (firstImageUrl) {
        const imageUrl = new URL(firstImageUrl);
        const storageDomain = imageUrl.origin;
        
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
  // RGB colored particles for brand identity
  const creativeParticles = [
    { top: "18%", left: "16%", size: 8, color: "hsl(var(--blue-primary))", delay: "0s" },
    { top: "64%", left: "20%", size: 7, color: "hsl(var(--red-primary))", delay: "1.6s" },
    { top: "42%", left: "75%", size: 6, color: "hsl(var(--green-primary))", delay: "2.4s" },
  ];
  const techNodes = [
    { top: "18%", right: "16%" },
    { top: "30%", right: "24%" },
    { top: "44%", right: "14%" },
    { top: "58%", right: "26%" },
    { top: "70%", right: "18%" },
  ];

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
      className="scroll-mt-24 relative min-h-screen flex items-center justify-center overflow-hidden pt-24 px-4 sm:px-6 bg-gradient-to-br from-background via-background to-muted/30"
    >
      {/* New Animated Background System */}
      <AnimatedBackground />

      {/* Interactive RGB Particles */}
      <RGBParticles />

      {/* Gradient overlay for content readability */}
      <div className="absolute inset-0 bg-gradient-to-b dark:from-background/50 dark:via-background/35 dark:to-background/75 from-background/90 via-background/95 to-background/90" />

      <div className="container mx-auto relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Section - All existing content */}
          <div className="text-center flex flex-col justify-center">
            {/* Main Headline */}
            <h1 className="text-headline-lg sm:text-headline-xl font-bold mb-6 takeover-title creatives-font leading-[1.1]">
              <span className="gradient-unified animate-fade-in animate-flicker">
                The Zero to One Platform
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-body sm:text-body-lg text-foreground/85 mb-6 max-w-2xl mx-auto leading-relaxed animate-fade-in">
              We blend technology, strategy and community to democratize startup formation, empowering pre-seed founders with AI-driven planning, community support, and fundraising tools.
            </p>
            
            {/* Platform-Specific Trust Indicators - Linked to Main Tools */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8 sm:mb-10">
            {/* Community - Meet Founders & Mentors */}
            <Link 
              to="/community" 
              className="flex items-center gap-2 text-xs sm:text-sm hover:scale-105 transition-transform duration-200 group cursor-pointer"
            >
              <Users className="w-4 h-4 text-growth group-hover:text-growth/80 transition-colors" />
              <span className="text-muted-foreground group-hover:text-foreground/80 transition-colors">Meet Founders & Mentors</span>
            </Link>
            
            {/* Dashboard - Measure your progress */}
            <Link 
              to="/dashboard" 
              className="flex items-center gap-2 text-xs sm:text-sm hover:scale-105 transition-transform duration-200 group cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-action group-hover:text-action/80 transition-colors" />
              <span className="text-muted-foreground group-hover:text-foreground/80 transition-colors">Measure your progress</span>
            </Link>
            
            {/* BizMap AI - Business Plan in 3 Minutes */}
            <Link 
              to="/bizmap-ai" 
              className="flex items-center gap-2 text-xs sm:text-sm hover:scale-105 transition-transform duration-200 group cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-planning group-hover:text-planning/80 transition-colors" />
              <span className="text-muted-foreground group-hover:text-foreground/80 transition-colors">Business Plan in 3 Minutes</span>
            </Link>
            
            {/* Insighta - Discover Funding Opportunities */}
            <Link 
              to="/insighta" 
              className="flex items-center gap-2 text-xs sm:text-sm hover:scale-105 transition-transform duration-200 group cursor-pointer"
            >
              <DollarSign className="w-4 h-4 text-growth group-hover:text-growth/80 transition-colors" />
              <span className="text-muted-foreground group-hover:text-foreground/80 transition-colors">Discover Funding Opportunities</span>
            </Link>
          </div>

            {/* Enhanced CTA Section */}
            <div className="mb-8 sm:mb-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {isAuthenticated ? (
                /* Authenticated User CTA: Open Dashboard Only */
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center justify-center">
                {/* Primary CTA - Open Dashboard with Pulse Animation */}
                <PulseCTA
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 sm:px-12 py-5 sm:py-6 text-lg sm:text-xl font-bold relative overflow-hidden group w-full sm:w-auto shadow-xl transition-all duration-300"
                  asChild
                  pulseColor="hsl(217 91% 60%)"
                  magneticStrength={0.35}
                >
                  <Link to="/dashboard" onClick={handleDashboardCTAClick}>
                    <div className="flex flex-col items-center sm:flex-row sm:items-center gap-2">
                      <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                      <span className="relative z-10">Open Dashboard</span>
                      <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Link>
                </PulseCTA>
              </div>
            ) : (
              /* Unauthenticated User CTAs: Design Your Plan + Explore Features + Join */
              <>
                {/* Primary CTA - Value-Focused with Pulse Effect */}
                <div className="mb-4 sm:mb-6">
                  <PulseCTA
                    size="lg"
                    className="bg-gradient-unified hover:opacity-90 text-primary-foreground px-8 sm:px-12 py-5 sm:py-6 text-lg sm:text-xl font-bold relative overflow-hidden group w-full sm:w-auto shadow-xl hover:shadow-2xl transition-all duration-300 mb-2"
                    asChild
                    magneticStrength={0.4}
                  >
                    <Link to="/bizmap-ai" onClick={handlePrimaryCTAClick}>
                      <div className="flex flex-col items-center sm:flex-row sm:items-center gap-2">
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                        <span className="relative z-10">Design Your Plan in 3 Minutes</span>
                        <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-unified opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                    </Link>
                  </PulseCTA>
                </div>

                  {/* Secondary & Tertiary CTAs with Magnetic Effect */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center">
                  {/* Secondary CTA - Exploration */}
                  <MagneticButton
                    variant="outline"
                    size="lg"
                    className="border-2 hover:bg-primary/10 text-foreground px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSecondaryCTAClick(e as any);
                    }}
                    magneticStrength={0.25}
                  >
                    <Play className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                    Explore Features
                  </MagneticButton>

                  {/* Tertiary CTA - Sign-up */}
                  <MagneticButton
                    variant="ghost"
                    size="lg"
                    className="text-muted-foreground hover:text-foreground px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium w-full sm:w-auto transition-all duration-300 underline-offset-4 hover:underline"
                    asChild
                    magneticStrength={0.2}
                  >
                    <Link to="/signup" className="flex items-center" onClick={handleTertiaryCTAClick}>
                      Join 1,000+ Founders
                      <ArrowRight className="ml-1.5 w-4 h-4" />
                    </Link>
                  </MagneticButton>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Section - 4-Pic Grid Layout */}
          <div className="hidden md:flex md:items-center md:justify-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-lg lg:max-w-2xl">
              {[1, 2, 3, 4].map((position) => {
                // Use optimistic preview if available (instant rendering), otherwise use database image
                const optimisticPreview = optimisticPreviews[position];
                const image = heroImages.find(img => img.position === position);
                // Top row (positions 1 and 2) - no default fallback images, must be uploaded
                const imageSrc = optimisticPreview || image?.image_url || '';
                const altText = image?.alt_text || `Hero image ${position}`;
                const isUploadingPosition = uploading === position;
                // Top row loads immediately, bottom row can lazy load
                const shouldLoadEagerly = position <= 2 || !!optimisticPreview;

                if (!imageSrc) {
                  return (
                    <div
                      key={position}
                      className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border border-border bg-muted/30 aspect-square flex flex-col items-center justify-center gap-3 p-4"
                    >
                      <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
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
                    className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border border-border bg-muted/30 group"
                  >
                    <img
                      src={imageSrc}
                      alt={altText}
                      className="w-full h-auto object-cover aspect-square"
                      style={{
                        filter: 'saturate(1.15) brightness(0.97) contrast(1.08)',
                      }}
                      loading={shouldLoadEagerly ? "eager" : "lazy"}
                      fetchPriority={shouldLoadEagerly ? "high" : "auto"}
                      decoding="async"
                      width="800"
                      height="800"
                      key={optimisticPreview ? `optimistic-${position}-${Date.now()}` : `stable-${position}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
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
    </section>
  );
};

export default Hero;