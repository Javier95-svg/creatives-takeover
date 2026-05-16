import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass, Image as ImageIcon, LayoutDashboard, Loader2, Upload, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useConversionTracking } from "@/hooks/useConversionTracking";
import { supabase } from "@/integrations/supabase/client";
import {
  buildHeroImageSrcSet,
  buildHeroImageUrl,
  extractHeroStoragePath,
  HERO_IMAGE_ALLOWED_TYPES,
  HERO_IMAGE_MAX_SIZE_BYTES,
  readCachedHeroImages,
  shouldReplaceCachedHeroImages,
  type HeroImageRecord,
  writeCachedHeroImages,
} from "@/lib/heroImages";

const Hero = () => {
  const { isAuthenticated, user } = useAuth();
  const { trackTriggerView, trackEngagement } = useConversionTracking();
  const heroRef = useRef<HTMLElement>(null);
  const hasTrackedView = useRef(false);
  const [heroImages, setHeroImages] = useState<HeroImageRecord[]>(() => readCachedHeroImages());
  const [uploading, setUploading] = useState<number | null>(null);
  const [optimisticPreviews, setOptimisticPreviews] = useState<Record<number, string>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const isAdmin = user?.email?.toLowerCase() === "admin@creatives-takeover.com";

  const [userUsername, setUserUsername] = useState<string | null>(null);
  useEffect(() => {
    const fetchUsername = async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("username").eq("id", user.id).single();
      if (data?.username) {
        setUserUsername(data.username);
      }
    };
    void fetchUsername();
  }, [user]);

  useEffect(() => {
    const fetchHeroImages = async () => {
      try {
        const { data, error } = await supabase
          .from("hero_images")
          .select("position, image_url, alt_text, storage_path, updated_at")
          .eq("is_active", true)
          .order("position", { ascending: true });

        if (error) {
          console.error("Error fetching hero images:", error);
          return;
        }

        if (data && data.length > 0) {
          const normalizedImages = data.map((image) => ({
            ...image,
            storage_path: image.storage_path ?? extractHeroStoragePath(image.image_url),
          }));

          setHeroImages((currentImages) => {
            if (!shouldReplaceCachedHeroImages(currentImages, normalizedImages)) {
              return currentImages;
            }
            writeCachedHeroImages(normalizedImages);
            return normalizedImages;
          });
        }
      } catch (error) {
        console.error("Error fetching hero images:", error);
      }
    };

    void fetchHeroImages();
  }, []);

  useEffect(() => {
    if (heroImages.length > 0 && heroImages.every((image) => !image.image_url.startsWith("data:"))) {
      writeCachedHeroImages(heroImages);
    }
  }, [heroImages]);

  const handleImageUpload = async (position: number, file: File, event?: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      toast.error("Only admins can upload hero images");
      return;
    }

    if (!HERO_IMAGE_ALLOWED_TYPES.includes(file.type as (typeof HERO_IMAGE_ALLOWED_TYPES)[number])) {
      toast.error("Invalid file type. Please upload a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > HERO_IMAGE_MAX_SIZE_BYTES) {
      toast.error("File size exceeds 5MB limit. Please upload a smaller image.");
      return;
    }

    const previousImages = [...heroImages];
    const previousImage = previousImages.find((image) => image.position === position);

    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result as string;
      setOptimisticPreviews((currentPreviews) => ({ ...currentPreviews, [position]: previewUrl }));
      setHeroImages((currentImages) => {
        const updatedImages = [...currentImages];
        const existingIndex = updatedImages.findIndex((image) => image.position === position);
        const nextImage = {
          alt_text: `Hero image ${position}`,
          image_url: previewUrl,
          position,
          storage_path: previousImage?.storage_path ?? null,
          updated_at: previousImage?.updated_at ?? null,
        };

        if (existingIndex >= 0) {
          updatedImages[existingIndex] = { ...updatedImages[existingIndex], ...nextImage };
        } else {
          updatedImages.push(nextImage);
        }

        return updatedImages.sort((left, right) => left.position - right.position);
      });
    };
    reader.readAsDataURL(file);

    try {
      setUploading(position);
      toast.loading("Uploading image...", { id: `upload-hero-${position}` });

      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${position}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("hero-images").upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message || "Storage error"}`, { id: `upload-hero-${position}` });
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("hero-images").getPublicUrl(fileName);

      setOptimisticPreviews((currentPreviews) => ({ ...currentPreviews, [position]: publicUrl }));

      setHeroImages((currentImages) => {
        const updatedImages = [...currentImages];
        const existingIndex = updatedImages.findIndex((image) => image.position === position);
        const nextImage = {
          alt_text: `Hero image ${position}`,
          image_url: publicUrl,
          position,
          storage_path: fileName,
          updated_at: new Date().toISOString(),
        };

        if (existingIndex >= 0) {
          updatedImages[existingIndex] = { ...updatedImages[existingIndex], ...nextImage };
        } else {
          updatedImages.push(nextImage);
        }

        return updatedImages.sort((left, right) => left.position - right.position);
      });

      const imageData = {
        position,
        image_url: publicUrl,
        storage_path: fileName,
        alt_text: `Hero image ${position}`,
        is_active: true,
      };

      const { data: existingData, error: fetchError } = await supabase
        .from("hero_images")
        .select("id")
        .eq("position", position)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (existingData?.id) {
        const { error: updateError } = await supabase.from("hero_images").update(imageData).eq("id", existingData.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("hero_images").insert(imageData);
        if (insertError) throw insertError;
      }

      toast.success(`Image ${position} uploaded successfully!`, { id: `upload-hero-${position}` });
    } catch (error: unknown) {
      console.error("Error uploading image:", error);

      setOptimisticPreviews((currentPreviews) => {
        const updatedPreviews = { ...currentPreviews };
        delete updatedPreviews[position];
        return updatedPreviews;
      });

      if (previousImage) {
        setHeroImages((currentImages) => {
          const updatedImages = [...currentImages];
          const existingIndex = updatedImages.findIndex((image) => image.position === position);
          if (existingIndex >= 0) {
            updatedImages[existingIndex] = previousImage;
          } else {
            updatedImages.push(previousImage);
          }
          return updatedImages.sort((left, right) => left.position - right.position);
        });
      } else {
        setHeroImages((currentImages) => currentImages.filter((image) => image.position !== position));
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to upload image: ${message}`, { id: `upload-hero-${position}` });
    } finally {
      setUploading(null);
      if (event?.target) {
        event.target.value = "";
      }
    }
  };

  useEffect(() => {
    if (hasTrackedView.current) return;

    const heroElement = heroRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView.current) {
            hasTrackedView.current = true;
            trackTriggerView("hero-primary-cta", {
              ctaType: "primary",
              authenticated: isAuthenticated,
            });
          }
        });
      },
      { threshold: 0.5 },
    );

    if (heroElement) {
      observer.observe(heroElement);
    }

    return () => {
      if (heroElement) {
        observer.unobserve(heroElement);
      }
    };
  }, [trackTriggerView, isAuthenticated]);

  const handlePrimaryCTAClick = () => {
    trackEngagement("hero-primary-cta", 85);
  };

  const handleDashboardCTAClick = () => {
    trackEngagement("hero-dashboard-cta", 90);
  };

  return (
    <section
      ref={heroRef}
      id="overview"
      className="homepage-section scroll-mt-24 relative pt-[calc(var(--mobile-nav-offset,0px)+0.75rem)] sm:pt-[calc(var(--mobile-nav-offset,0px)+1.25rem)] md:pt-24 pb-12 sm:pb-18 md:pb-24 px-4 sm:px-6"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.035] to-transparent pointer-events-none" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-14 xl:gap-20 items-center">
          <div className="homepage-hero__content text-center flex flex-col items-center justify-center max-w-2xl lg:max-w-[34rem] mx-auto lg:pt-6 xl:pt-8">
            <h1 className="homepage-hero__title font-space-grotesk text-[2rem] sm:text-[2.55rem] md:text-[3.25rem] lg:text-[3.85rem] font-semibold mb-5 sm:mb-6 leading-[1.12] tracking-tight text-center">
              <span className="text-primary block [text-shadow:0_0_22px_rgba(59,130,246,0.28)]">
                The Founders&rsquo;
              </span>
              <span className="mt-1 inline-flex items-center justify-center gap-3 text-white [text-shadow:0_0_24px_rgba(255,255,255,0.18),0_2px_10px_rgba(15,23,42,0.28)]">
                <span>Compass</span>
                <Compass className="h-[0.95em] w-[0.95em] shrink-0 text-white" aria-hidden="true" />
              </span>
            </h1>

            <div className="homepage-hero__copy font-sans text-[15px] sm:text-base md:text-lg text-muted-foreground text-center mb-6 sm:mb-9 max-w-[34rem] mx-auto leading-[1.8] px-2 sm:px-0 space-y-4">
              {isAuthenticated ? (
                <p>
                  Set up your profile, then head to your dashboard to see what matters now, plan your next steps, and keep moving forward one task at a time.
                </p>
              ) : (
                <>
                  <p>
                    Creatives Takeover gives you the structure of a top-tier accelerator without applications, cohorts, rejection, or giving up equity.
                  </p>
                  <p>
                    Grow your startup at your own pace with personalized guidance that adapts to your industry, development stage, and target market.
                  </p>
                </>
              )}
            </div>

            <div className="mb-4 sm:mb-8 md:mb-10">
              {isAuthenticated ? (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center lg:items-start justify-center lg:justify-start px-4 sm:px-0">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto min-w-[180px] min-h-[44px] touch-manipulation" asChild>
                    <Link to={userUsername ? `/profile/${userUsername}` : "/dashboard"}>
                      <User className="w-5 h-5" />
                      Your Profile
                    </Link>
                  </Button>
                  <Button size="lg" className="w-full sm:w-auto min-w-[180px] min-h-[44px] touch-manipulation" asChild>
                    <Link to="/dashboard" onClick={handleDashboardCTAClick}>
                      <LayoutDashboard className="w-5 h-5" />
                      Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 items-center justify-center px-4 sm:px-0">
                  <div className="flex w-full justify-center px-4 sm:px-0">
                    <Button
                      size="lg"
                      className="group w-full sm:w-auto min-h-[48px] touch-manipulation border border-blue-300/40 bg-slate-950 px-6 text-white shadow-[0_0_28px_rgba(59,130,246,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300/70 hover:bg-slate-900 hover:shadow-[0_0_42px_rgba(99,102,241,0.34)] focus-visible:ring-blue-300/60"
                      asChild
                    >
                      <Link to="/icp-builder" onClick={handlePrimaryCTAClick}>
                        <Compass className="w-4 h-4 text-blue-200 transition-transform duration-300 group-hover:rotate-12" />
                        Build My ICP Free
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="homepage-hero__media w-full max-w-[22rem] sm:max-w-[30rem] lg:max-w-[640px] mx-auto lg:pt-6 xl:pt-8 lg:ml-auto">
            <div className="rounded-[28px] sm:rounded-[30px] border border-border/80 bg-card/90 shadow-[0_32px_80px_-52px_rgba(15,23,42,0.32)] p-2.5 sm:p-4 md:p-5 backdrop-blur-sm">
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 w-full">
                {[1, 2, 3, 4].map((position) => {
                  const optimisticPreview = optimisticPreviews[position];
                  const image = heroImages.find((candidate) => candidate.position === position);
                  const imageSrc = optimisticPreview || (image?.storage_path ? buildHeroImageUrl(image.storage_path, 480) : image?.image_url || "");
                  const srcSet = !optimisticPreview && image?.storage_path ? buildHeroImageSrcSet(image.storage_path) : undefined;
                  const altText = image?.alt_text || `Hero image ${position}`;
                  const isUploadingPosition = uploading === position;
                  const shouldLoadEagerly = position <= 2;

                  if (!imageSrc) {
                    return (
                      <div
                        key={position}
                        className="relative rounded-xl border border-dashed border-border/40 bg-muted/30 aspect-square flex flex-col items-center justify-center gap-3 p-4"
                      >
                        <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                        {isAdmin ? (
                          <div className="w-full space-y-2">
                            <Input
                              ref={(element) => {
                                fileInputRefs.current[position] = element;
                              }}
                              type="file"
                              accept={HERO_IMAGE_ALLOWED_TYPES.join(",")}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                  void handleImageUpload(position, file, event);
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
                                fileInputRefs.current[position]?.click();
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
                        ) : null}
                      </div>
                    );
                  }

                  return (
                    <div key={position} className="relative rounded-xl overflow-hidden border border-border/40 bg-muted/30 group">
                      <img
                        src={imageSrc}
                        srcSet={srcSet}
                        alt={altText}
                        className="w-full h-auto object-cover aspect-square"
                        loading={shouldLoadEagerly ? "eager" : "lazy"}
                        fetchPriority={shouldLoadEagerly ? "high" : "auto"}
                        decoding="async"
                        width="640"
                        height="640"
                        sizes="(max-width: 640px) calc((100vw - 3rem) / 2), (max-width: 1024px) 240px, 320px"
                      />
                      {isAdmin ? (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                          <div className="space-y-2 w-full px-4">
                            <Input
                              ref={(element) => {
                                fileInputRefs.current[position] = element;
                              }}
                              type="file"
                              accept={HERO_IMAGE_ALLOWED_TYPES.join(",")}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                  void handleImageUpload(position, file, event);
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
                                fileInputRefs.current[position]?.click();
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
                      ) : null}
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
