import { useState, useCallback, useEffect, useRef, type ChangeEvent } from "react";
import { Code2, FlaskConical, Loader2, Megaphone, Presentation, Search, TrendingUp, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface ValueCardImage {
  position: number;
  image_url: string;
  alt_text: string | null;
}

const ValuePropositionCards = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const carouselContentRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const [cardImages, setCardImages] = useState<ValueCardImage[]>([]);
  const [uploading, setUploading] = useState<number | null>(null);
  const [optimisticPreviews, setOptimisticPreviews] = useState<Record<number, string>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';
  const prefersReducedMotion = usePrefersReducedMotion();

  // Core value propositions - 6 outcome-driven selling points
  const allCards = [
    {
      position: 1,
      icon: Search,
      title: "Decide exactly whom to serve first",
      subtitle: "ICP Builder",
      buttonLabel: "Decide Customer",
      description: "Finish with a Customer Decision Brief that names one primary segment and one non fit segment, ranks the pains that matter, and identifies the buying trigger, current alternative, and reachable channels.\n\nEvery conclusion carries cited evidence, a confidence level, and a five interview plan for validating the assumptions that still matter.",
      cta: "Draft your ICP",
      link: "/icp-builder",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "Business development planning with strategy notes"
    },
    {
      position: 2,
      icon: Presentation,
      title: "Publish proof people can experience",
      subtitle: "Demo Studio",
      buttonLabel: "Publish Proof",
      description: "Turn screenshots, a product URL, or a one line description into an interactive product story before the full product exists.\n\nThe finished proof page is public and mobile ready, with a narrated demo, one clear call to action, lead capture, analytics, and no unresolved placeholders or broken interactions.",
      cta: "Launch a live demo",
      link: "/demo-studio/try",
      image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "Startup accelerator program session"
    },
    {
      position: 3,
      icon: FlaskConical,
      title: "Make a defensible product decision",
      subtitle: "PMF Lab",
      buttonLabel: "Choose Direction",
      description: "Combine interviews, surveys, demo behavior, leads, and corroborating research into one source weighted report.\n\nFive signals create directional evidence, ten reveal emerging patterns, and twenty five support a decision grade recommendation to Build, Narrow, Pivot, or Stop.",
      cta: "Evaluate evidence",
      link: "/pmf-lab",
      image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "Fundraising meeting with investors"
    },
    {
      position: 4,
      icon: Code2,
      title: "Deploy only what evidence justifies",
      subtitle: "MVP Builder",
      buttonLabel: "Build MVP",
      description: "Start from an approved evidence manifest and build the smallest product that completes one core customer job.\n\nA ready MVP has responsive UI, analytics, rollback support, a passing primary flow smoke test, and no unresolved runtime errors.",
      cta: "Build your MVP",
      link: "/mvp-builder",
      image: "https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "Founders collaborating in a video call"
    },
    {
      position: 5,
      icon: Megaphone,
      title: "Begin a measurable acquisition play",
      subtitle: "GTM Strategist",
      buttonLabel: "Launch Play",
      description: "Choose one primary channel and one fallback with evidence backed messaging, campaign assets, six week targets, and clear budget and time constraints.\n\nEvery primary play includes a kill rule and creates an attributed Traction sprint from the same workspace.",
      cta: "Start your GTM play",
      link: "/go-to-market",
      image: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "Founder reading and learning from content"
    },
    {
      position: 6,
      icon: TrendingUp,
      title: "Decide what to scale, iterate, or kill",
      subtitle: "Traction Engine",
      buttonLabel: "Measure Traction",
      description: "Record measured weekly decisions in a six week ledger that keeps source badges, acquisition efficiency, retention, and revenue visible.\n\nAfter at least three weekly decisions, export a verified traction report and feed the results back into the next GTM and customer review.",
      cta: "Measure traction",
      link: "/traction-engine",
      image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "Personalized startup dashboard"
    }
  ];

  useEffect(() => {
    const fetchCardImages = async () => {
      try {
        const { data, error } = await supabase
          .from('value_proposition_images')
          .select('position, image_url, alt_text')
          .eq('is_active', true)
          .order('position', { ascending: true });

        if (error) {
          console.error('Error fetching value proposition images:', error);
          return;
        }

        if (data) {
          setCardImages(data);
        }
      } catch (error) {
        console.error('Error fetching value proposition images:', error);
      }
    };

    void fetchCardImages();
  }, []);

  const handleImageUpload = async (
    position: number,
    file: File,
    event?: ChangeEvent<HTMLInputElement>
  ) => {
    if (!isAdmin) {
      toast.error('Only admins can upload images');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    const maxSize = 5242880;
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    const previousImages = [...cardImages];
    const previousImage = previousImages.find((img) => img.position === position);
    const targetCard = allCards.find((card) => card.position === position);
    const fallbackAlt = targetCard?.imageAlt || `Value proposition image ${position}`;

    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result as string;
      setOptimisticPreviews((prev) => ({ ...prev, [position]: previewUrl }));
      setCardImages((prev) => {
        const updated = [...prev];
        const existingIndex = updated.findIndex((img) => img.position === position);
        if (existingIndex >= 0) {
          updated[existingIndex] = { ...updated[existingIndex], image_url: previewUrl };
        } else {
          updated.push({ position, image_url: previewUrl, alt_text: fallbackAlt });
        }
        return updated;
      });
    };
    reader.readAsDataURL(file);

    try {
      setUploading(position);
      toast.loading('Uploading image...', { id: `upload-value-card-${position}` });

      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${position}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('value-proposition-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        toast.error(`Upload failed: ${uploadError.message || 'Storage error'}`, {
          id: `upload-value-card-${position}`,
        });
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('value-proposition-images')
        .getPublicUrl(fileName);

      setOptimisticPreviews((prev) => ({ ...prev, [position]: publicUrl }));
      setCardImages((prev) => {
        const updated = [...prev];
        const existingIndex = updated.findIndex((img) => img.position === position);
        if (existingIndex >= 0) {
          updated[existingIndex] = { ...updated[existingIndex], image_url: publicUrl };
        } else {
          updated.push({ position, image_url: publicUrl, alt_text: fallbackAlt });
        }
        return updated;
      });

      const { error: upsertError } = await supabase
        .from('value_proposition_images')
        .upsert(
          {
            position,
            image_url: publicUrl,
            alt_text: fallbackAlt,
            is_active: true,
          },
          { onConflict: 'position' }
        );

      if (upsertError) {
        throw upsertError;
      }

      toast.success('Image uploaded successfully!', { id: `upload-value-card-${position}` });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setOptimisticPreviews((prev) => {
        const updated = { ...prev };
        delete updated[position];
        return updated;
      });

      if (previousImage) {
        setCardImages((prev) => {
          const updated = [...prev];
          const existingIndex = updated.findIndex((img) => img.position === position);
          if (existingIndex >= 0) {
            updated[existingIndex] = previousImage;
          } else {
            updated.push(previousImage);
          }
          return updated;
        });
      } else {
        setCardImages((prev) => prev.filter((img) => img.position !== position));
      }

      toast.error(`Failed to upload image: ${error?.message || 'Unknown error'}`, {
        id: `upload-value-card-${position}`,
      });
    } finally {
      setUploading(null);
      if (event?.target) {
        event.target.value = '';
      }
    }
  };

  // Handle carousel API setup and sync selected index
  const onSelect = useCallback(() => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
  }, [api]);

  // Set up the carousel API listener
  useEffect(() => {
    if (!api) return;
    api.on("select", onSelect);
    onSelect(); // Sync initial state
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  useEffect(() => {
    if (!api) return;

    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
    }

    if (prefersReducedMotion || isAutoScrollPaused) {
      if (prefersReducedMotion) {
        setIsAutoScrollPaused(true);
      }
      autoScrollRef.current = null;
      return;
    }

    autoScrollRef.current = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    };
  }, [api, isAutoScrollPaused, prefersReducedMotion]);

  // Navigate to specific card
  const goToCard = (index: number) => {
    if (api) {
      api.scrollTo(index);
      setSelectedIndex(index);
    }
  };

  const handleStopClick = () => {
    setIsAutoScrollPaused((prev) => !prev);
  };

  useEffect(() => {
    const container = carouselContentRef.current;
    if (!container) return;

    const updateHeights = () => {
      const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-value-card]'));
      if (!cards.length) return;

      if (window.innerWidth <= 768) {
        cards.forEach((card) => {
          card.style.height = 'auto';
        });
        return;
      }

      let maxHeight = 0;
      cards.forEach((card) => {
        card.style.height = 'auto';
        maxHeight = Math.max(maxHeight, card.getBoundingClientRect().height);
      });
      const finalHeight = Math.ceil(maxHeight);
      cards.forEach((card) => {
        card.style.height = `${finalHeight}px`;
      });
    };

    updateHeights();

    const handleResize = () => updateHeights();
    window.addEventListener('resize', handleResize);

    const images = Array.from(container.querySelectorAll<HTMLImageElement>('img'));
    images.forEach((img) => {
      if (img.complete) return;
      img.addEventListener('load', handleResize);
      img.addEventListener('error', handleResize);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      images.forEach((img) => {
        img.removeEventListener('load', handleResize);
        img.removeEventListener('error', handleResize);
      });
    };
  }, []);

  return (
    <section id="what-you-get" className="value-prop-section section-shell scroll-mt-24">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
          <Badge variant="outline" className="homepage-section-badge mb-5">
            Six connected outcome contracts
          </Badge>
          <h2 className="homepage-section-title value-prop-section__title text-3xl sm:text-4xl lg:text-[2.9rem] mb-4">
            Every tool ends in a decision or a finished artifact
          </h2>
          <p className="homepage-section-copy value-prop-section__copy text-base sm:text-lg">
            Each stage carries its evidence, assumptions, and measured results forward so the next tool starts with what you have already learned.
          </p>
        </div>

        {/* Horizontal Carousel */}
        <div className="max-w-6xl mx-auto">
          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent ref={carouselContentRef} className="-ml-4 items-stretch">
              {allCards.map((card, index) => {
                const Icon = card.icon;
                const storedImage = cardImages.find((img) => img.position === card.position);
                const imageSrc = optimisticPreviews[card.position] || storedImage?.image_url || card.image;
                const altText = storedImage?.alt_text || card.imageAlt;
                const isUploadingPosition = uploading === card.position;
                return (
                  <CarouselItem key={card.title} className="pl-4 basis-full h-full">
                    <Card className="value-prop-card surface-panel trust-outline overflow-hidden h-full relative rounded-4xl" data-value-card>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleStopClick}
                        title={isAutoScrollPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
                        disabled={prefersReducedMotion}
                        className="absolute right-4 top-4 z-10 h-7 px-2 text-xs"
                      >
                        {isAutoScrollPaused ? "Resume" : "Stop"}
                      </Button>
                      <div className="grid md:grid-cols-2 h-full">
                        {/* Image - Left */}
                        <figure className="value-prop-card__media relative h-64 md:h-full md:min-h-[320px] group">
                          <img
                            src={imageSrc}
                            alt={altText}
                            className="value-prop-card__image w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/15 via-transparent to-transparent" />
                          {isAdmin && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                              <div className="w-full max-w-[200px] px-4">
                                <Input
                                  ref={(el) => {
                                    fileInputRefs.current[card.position] = el;
                                  }}
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      void handleImageUpload(card.position, file, e);
                                    }
                                  }}
                                  disabled={isUploadingPosition}
                                  className="hidden"
                                  id={`value-card-upload-${card.position}`}
                                />
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    const fileInput = fileInputRefs.current[card.position];
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
                                      Change Image
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </figure>

                        {/* Content - Right */}
                        <div className="value-prop-card__content p-7 md:p-10 lg:p-12 flex flex-col justify-center md:h-full">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-label uppercase tracking-[0.18em] text-muted-foreground">
                                {card.title}
                              </p>
                              <h3 className="value-prop-card__heading font-space-grotesk text-[1.75rem] font-semibold tracking-tight text-foreground">
                                {card.subtitle}
                              </h3>
                            </div>
                          </div>

                          <div className="value-prop-card__body text-sm leading-7 text-muted-foreground space-y-4">
                            {card.description.split('\n\n').map((paragraph, idx) => (
                              <p key={idx}>{paragraph}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>

          {/* Mobile dot indicators */}
          <div className="flex justify-center gap-2 mt-5 md:hidden" aria-label="Slide navigation">
            {allCards.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToCard(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === selectedIndex ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="value-prop-nav hidden md:grid grid-cols-3 gap-3 mt-8 max-w-4xl mx-auto">
            {allCards.map((card, index) => (
              <Button
                key={card.buttonLabel}
                variant={selectedIndex === index ? "default" : "outline"}
                onClick={() => goToCard(index)}
                className={`transition-all duration-200 ${
                  selectedIndex === index
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:border-primary/50"
                }`}
              >
                {card.buttonLabel}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ValuePropositionCards;
