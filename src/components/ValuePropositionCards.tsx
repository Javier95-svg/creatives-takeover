import { useState, useCallback, useEffect, useRef, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { Lightbulb, Users, Rocket, LayoutDashboard, Upload, Loader2, GraduationCap, TrendingUp, Handshake, BookOpen, ArrowRight } from "lucide-react";

// Card destinations that robots.txt disallows. Rendering a link to one wastes a
// homepage link slot and asks Google to fetch a URL it is told to skip; the card
// itself still shows, it just does not advertise a crawler-hostile route.
const ROBOTS_DISALLOWED_LINKS = new Set(["/dashboard"]);
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

  // Six pillars, most relevant first (refreshed 2026-10-24). `position` is
  // the slot of the image uploaded for each card (value_proposition_images),
  // so each topic keeps the picture that matches it.
  const allCards = [
    {
      position: 6,
      icon: LayoutDashboard,
      title: "One workspace for your project",
      subtitle: "Workspace",
      buttonLabel: "Validate, Build, Launch",
      description: "Every tool works on the same project. ICP Builder defines who you serve, Demo Studio gives people something to try, PMF Lab turns their feedback into a Build, Narrow, Pivot or Stop decision, then MVP Builder, GTM Strategist and Traction Engine take you to your first buyers and beyond.\n\nEach tool starts from what the last one saved, so you never begin from a blank page. Your dashboard keeps tasks, weekly progress and the evidence you collect in one place.",
      link: "/demo",
      linkLabel: "Explore a sample workspace",
      image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "A project dashboard with progress gauges"
    },
    {
      position: 1,
      icon: Lightbulb,
      title: "An assistant that knows your project",
      subtitle: "Pulse",
      buttonLabel: "Meet Pulse",
      description: "Pulse reads your project before you ask: your customer profile, demo, validation, product, go to market plan, traction, tasks and open assumptions. You never have to explain your idea again.\n\nIt keeps the decisions and facts you choose to save, adds up to three notes a day on risks, opportunities or contradictions in your evidence, and shows the sources behind every answer. Pulse is included on every plan and its replies use no credits.",
      link: "/demo",
      linkLabel: "See Pulse in the sample workspace",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "A thinking head with a lightbulb idea"
    },
    {
      position: 4,
      icon: Handshake,
      title: "Mentors, cofounders and experts",
      subtitle: "People",
      buttonLabel: "Find Help",
      description: "You don't have to figure everything out alone. Book mentors who have solved the problem you are stuck on, and find a cofounder whose skills fill the gaps in your team.\n\nWhen you need hands, the service marketplace connects you with providers in sales, marketing, operations and tech support. They are all in the same workspace where you build, so help arrives with the context of your project.",
      link: "/mentorship",
      linkLabel: "Find a mentor",
      image: "https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "People helping each other up"
    },
    {
      position: 2,
      icon: GraduationCap,
      title: "Build in public",
      subtitle: "Founder ID",
      buttonLabel: "Share your Progress",
      description: "Your Founder ID shows who you are, what you are building and how far you have come, at one short link: creatives-takeover.com/@you. Share it with customers, partners and investors instead of explaining your project from scratch.\n\nVisitors can follow your progress and offer the help you ask for, from feedback to introductions. You choose what is public; your workspace stays private.",
      link: "/founder-id",
      linkLabel: "Get your Founder ID",
      image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "A group of founders standing together"
    },
    {
      position: 3,
      icon: TrendingUp,
      title: "Investors and accelerators",
      subtitle: "Insighta",
      buttonLabel: "Prepare to Raise",
      description: "When your evidence is ready, know who to talk to. VC Search and Accelerator Hunt let you filter investors and programs by industry, stage and check size, so you build a focused list instead of pitching blind.\n\nInsighta Test checks your readiness and Pitch Deck Analyzer sharpens your deck. On Pro, Find Your Angel connects you with angel investors backing early stage founders.",
      link: "/vc-search",
      linkLabel: "Explore investors",
      image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "A bag of money"
    },
    {
      position: 5,
      icon: BookOpen,
      title: "Learn from founders",
      subtitle: "Stories and Guides",
      buttonLabel: "Founder Stories",
      description: "Founder Stories brings real experiences from people building companies: the lessons, the wins and the mistakes, without recycled advice.\n\nWhen you have a specific question, the Founder Answer Library and the Startup Guide give you clear, practical answers on customers, validation, MVPs, go to market and fundraising.",
      link: "/newspaper",
      linkLabel: "Read founder stories",
      image: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "Founder stories on the Creatives Takeover newspaper"
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
            The Perfect Ecosystem
          </Badge>
          <h2 className="homepage-section-title value-prop-section__title text-3xl sm:text-4xl lg:text-[2.9rem] mb-4">
            Creatives Takeover in a Nutshell
          </h2>
          <p className="homepage-section-copy value-prop-section__copy text-base sm:text-lg">
            One workspace for your project, an assistant that already knows it, and the people who help you move it forward.
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
                // The card describes its own photo; stored alt text dates from older card topics.
                const altText = card.imageAlt || storedImage?.alt_text;
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

                          {/* Each card already carried a `link`, and none of them
                              was ever rendered. This is the homepage's largest
                              section, so it was emitting zero internal links to
                              the destinations it describes. */}
                          {card.link && !ROBOTS_DISALLOWED_LINKS.has(card.link) && (
                            <Link
                              to={card.link}
                              className="value-prop-card__link inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {card.linkLabel || `Explore ${card.subtitle}`}
                              <ArrowRight className="h-4 w-4 shrink-0" />
                            </Link>
                          )}
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
