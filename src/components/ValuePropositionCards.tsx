import { useState, useCallback, useEffect, useRef, type ChangeEvent } from "react";
import { Lightbulb, Users, Rocket, LayoutDashboard, Upload, Loader2 } from "lucide-react";
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
  const [cardImages, setCardImages] = useState<ValueCardImage[]>([]);
  const [uploading, setUploading] = useState<number | null>(null);
  const [optimisticPreviews, setOptimisticPreviews] = useState<Record<number, string>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';

  // Core value propositions - condensed to 4 essential offerings
  const allCards = [
    {
      position: 1,
      icon: Lightbulb,
      title: "PLAN",
      subtitle: "BizMap AI",
      buttonLabel: "BizMap AI",
      description: "BizMap AI is a hub of business development tools that helps founders plan, validate, and scale their startup in a simple, organized way.\n\nIt includes a Business Planner chatbot, a Product Market Fit Lab for testing and refining your positioning, a Prompt Library with 60 business cases across 8 industries, and a Tech Stack builder that estimates monthly and yearly costs based on the tools you choose.",
      cta: "Start Planning",
      link: "/bizmap-ai",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop&q=80",
      imageAlt: "Business development planning with strategy notes"
    },
    {
      position: 2,
      icon: LayoutDashboard,
      title: "EXECUTE",
      subtitle: "Dashboard",
      buttonLabel: "Dashboard",
      description: "Dashboard is where everything comes together, so founders can stay on top of day to day work, milestones, and accountability without feeling scattered.\n\nIt helps founders track progress in one place, set clear milestones, and keep momentum with simple accountability features. It also includes the Focus Funnel, a tool that breaks goals into projects and projects into next actions, so you always know what to prioritize and what to do next.",
      cta: "View Dashboard",
      link: "/dashboard",
      image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=600&fit=crop&q=80",
      imageAlt: "Task tracking and project management board"
    },
    {
      position: 3,
      icon: Rocket,
      title: "FUNDRAISE",
      subtitle: "Insighta",
      buttonLabel: "Insighta",
      description: "Insighta is where founders organize their fundraising process, so pitching feels more structured and less like guesswork.\n\nIt includes VC Search to explore venture capital firms and key details for building a targeted investor list, Email Templates for cold outreach that can be quickly customized, a Pitch Deck Analyzer to flag weak points and improve clarity, and the Insighta Test to check fundraising readiness and highlight what to fix before starting outreach.",
      cta: "Explore Insighta",
      link: "/insighta/test",
      image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=600&fit=crop&q=80",
      imageAlt: "Fundraising meeting with investors"
    },
    {
      position: 4,
      icon: Users,
      title: "CONNECT",
      subtitle: "Community",
      buttonLabel: "Community",
      description: "Community is the space where founders connect with people who actually get it, so building your startup doesn't have to feel like a solo mission.\n\nHere, users can find mentors for guidance and feedback, and meet other founders to share wins, challenges, and lessons in real time. Having the right people around you helps you stay accountable, make better decisions faster, and avoid the isolation that often leads to stress and burnout.",
      cta: "Join Community",
      link: "/community",
      image: "https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=800&h=600&fit=crop&q=80",
      imageAlt: "Founders collaborating in a video call"
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

    fetchCardImages();
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

    autoScrollRef.current = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    };
  }, [api]);

  // Navigate to specific card
  const goToCard = (index: number) => {
    if (api) {
      api.scrollTo(index);
      setSelectedIndex(index);
    }
  };

  useEffect(() => {
    const container = carouselContentRef.current;
    if (!container) return;

    const updateHeights = () => {
      const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-value-card]'));
      if (!cards.length) return;
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
    <section id="what-you-get" className="py-20 lg:py-28 scroll-mt-24 font-poppins">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
          <Badge variant="outline" className="mb-5 text-xs uppercase tracking-wide text-muted-foreground">
            The Perfect Ecosystem ♻️
          </Badge>
          <h2 className="font-space-grotesk text-3xl sm:text-4xl lg:text-5xl font-semibold mb-4 tracking-tight text-primary">
            Here's What You Get
          </h2>
          <p className="font-poppins text-base sm:text-lg text-muted-foreground">
            Everything you need to go from idea to launch. Four core tools designed for creative entrepreneurs who want to build real, sustainable businesses.
          </p>
        </div>

        {/* Horizontal Carousel */}
        <div className="max-w-5xl mx-auto">
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
                    <Card className="glass border-border overflow-hidden h-full" data-value-card>
                      <div className="grid md:grid-cols-2 h-full">
                        {/* Image - Left */}
                        <figure className="relative h-64 md:h-full md:min-h-[320px] group">
                          <img
                            src={imageSrc}
                            alt={altText}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent" />
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
                                      handleImageUpload(card.position, file, e);
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
                        <div className="p-6 md:p-10 flex flex-col justify-center md:h-full">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                {card.title}
                              </p>
                              <h3 className="font-space-grotesk text-2xl font-bold">
                                {card.subtitle}
                              </h3>
                            </div>
                          </div>

                          <div className="text-base leading-relaxed text-foreground/85 space-y-4">
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

          {/* Navigation Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
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
