import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { Lightbulb, LayoutDashboard, Upload, Loader2, GraduationCap, TrendingUp, Handshake, BookOpen, ArrowRight } from "lucide-react";

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

interface ValueCardImage {
  position: number;
  image_url: string;
  alt_text: string | null;
}

const ValuePropositionCards = () => {
  const [cardImages, setCardImages] = useState<ValueCardImage[]>([]);
  const [uploading, setUploading] = useState<number | null>(null);
  const [optimisticPreviews, setOptimisticPreviews] = useState<Record<number, string>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';

  // Core value propositions - 6 outcome-driven selling points
  const allCards = [
    {
      position: 1,
      icon: Lightbulb,
      title: "Build Your Product & Validate Demand",
      subtitle: "BizMap AI",
      buttonLabel: "Validate - Build - Launch",
      description: "BizMap AI is your personal business planning partner that walks you through every stage of building a product and getting it into the right hands. From defining your ideal customer with ICP Builder to validating demand with PMF Lab, choosing your tech stack, and mapping out your go-to-market strategy, every tool works together to keep you moving forward.\n\nThink of it as having a co-founder who never sleeps. Chat with the Business Planner about any challenge, get tailored recommendations, and export polished plans when you need to share your vision with investors or partners.",
      cta: "Start Building",
      link: "/bizmap-ai",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "Business development planning with strategy notes"
    },
    {
      position: 2,
      icon: GraduationCap,
      title: "A founder-focused social network",
      subtitle: "Founder Profile",
      buttonLabel: "Share your Journey",
      description: "Every account has a founder profile where you can share posts, reels, and updates in a space built for builders. It is your personal home on the platform, a place to show who you are, what you are working on, and the progress you are making so other users can follow your ups and downs.\n\nYour profile also links to your startup, so anyone who finds you can instantly explore what you are building and the key details behind it. Share product demos, behind the scenes moments, milestones, launches, and lessons learned, and turn every update into visibility and new opportunities.",
      cta: "Find Accelerators",
      link: "/accelerator-hunt",
      image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "Startup accelerator program session"
    },
    {
      position: 3,
      icon: TrendingUp,
      title: "Access to VCs and Accelerators",
      subtitle: "Insighta",
      buttonLabel: "Fundraising Tools",
      description: "Raising money starts with knowing who to talk to. VC Search lets you explore a curated database of venture capital firms filtered by industry, stage, and check size so you can build a targeted list instead of pitching blind. Find your Angel connects you directly with angel investors who are actively looking to back early stage founders.\n\nUse VC Search to build a focused investor list, then Pitch Deck Analyzer to sharpen your presentation, and Insighta Test to assess your readiness. Supplemental outreach tools remain available when you need them.",
      cta: "Explore Investors",
      link: "/vc-search",
      image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "Fundraising meeting with investors"
    },
    {
      position: 4,
      icon: Handshake,
      title: "Mentorship and Angel Investor Network",
      subtitle: "Community",
      buttonLabel: "Networking",
      description: "Building a business on your own doesn't mean you have to figure everything out alone. The Mentor Marketplace connects you with experienced founders and industry experts who offer guidance, honest feedback, and the kind of perspective that only comes from having been through it before.\n\nLooking for someone to build with? The Co-Founder Marketplace helps you find partners who complement your skills and share your ambition. Filter by industry, stage, and expertise to connect with people who get what you're working on and want to be part of the journey.",
      cta: "Join Community",
      link: "/mentorship",
      image: "https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "Founders collaborating in a video call"
    },
    {
      position: 5,
      icon: BookOpen,
      title: "Success Stories + Prompt Library",
      subtitle: "Get Inspired",
      buttonLabel: "Niche Content",
      description: "Great ideas often start with the right spark. The Prompt Library gives you a rich collection of business cases and startup scenarios across industries like AI, e-commerce, SaaS, and the creator economy, so you always have fresh starting points when you need inspiration or want to explore a new direction.\n\nFounder Stories brings you real experiences from entrepreneurs who've walked the path before you. No recycled advice or theory, just honest lessons, practical wins, and real struggles from people who understand what it takes to get something off the ground.",
      cta: "Read Stories",
      link: "/newspaper",
      image: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=800&h=600&fit=crop&q=80&fm=webp",
      imageAlt: "Founder reading and learning from content"
    },
    {
      position: 6,
      icon: LayoutDashboard,
      title: "Customize your Experience",
      subtitle: "Dashboard: Prioritize Tasks",
      buttonLabel: "Execute Smartly",
      description: "Your dashboard is where everything comes together. Focus Funnel helps you cut through the noise and prioritize what actually moves the needle, while Decision Sprint gives you a structured way to evaluate ideas before committing. Core Metrics keeps your key numbers visible so you always know where you stand.\n\nWeekly Mission and Your Tasks keep you accountable with clear goals and action items, so you spend less time wondering what to do next and more time making real progress. It's your personal command center, designed to keep you focused and moving forward.",
      cta: "View Dashboard",
      link: "/dashboard",
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

  // A static grid. This used to be a looping carousel that advanced every 5s,
  // so most of the six cards were never seen and none could be compared.
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
            Everything you need, all in one place. Built on six core pillars to help startup founders validate, build, and grow a business from scratch.
          </p>
        </div>

        <ul className="max-w-6xl mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {allCards.map((card) => {
            const Icon = card.icon;
            const storedImage = cardImages.find((img) => img.position === card.position);
            const imageSrc = optimisticPreviews[card.position] || storedImage?.image_url || card.image;
            const altText = storedImage?.alt_text || card.imageAlt;
            const isUploadingPosition = uploading === card.position;
            // The opening paragraph carries the point; the full two-paragraph
            // copy was written for a one-card-at-a-time carousel.
            const [summary] = card.description.split('\n\n');
            return (
              <li key={card.title} className="h-full">
                <Card className="value-prop-card surface-panel trust-outline overflow-hidden h-full flex flex-col rounded-2xl">
                  <figure className="value-prop-card__media relative aspect-[16/10] group">
                    <img
                      src={imageSrc}
                      alt={altText}
                      className="value-prop-card__image w-full h-full object-cover"
                      loading="lazy"
                    />
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

                  <div className="value-prop-card__content p-6 flex flex-1 flex-col">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-label uppercase tracking-[0.14em] text-muted-foreground">
                          {card.subtitle}
                        </p>
                        <h3 className="value-prop-card__heading font-space-grotesk text-lg font-semibold leading-snug tracking-tight text-foreground">
                          {card.title}
                        </h3>
                      </div>
                    </div>

                    <p className="value-prop-card__body text-sm leading-6 text-muted-foreground">
                      {summary}
                    </p>

                    {/* Each card carries a `link`; this is the homepage's largest
                        section, so it should link to the destinations it describes. */}
                    {card.link && !ROBOTS_DISALLOWED_LINKS.has(card.link) && (
                      <Link
                        to={card.link}
                        className="value-prop-card__link mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {`Explore ${card.subtitle}`}
                        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default ValuePropositionCards;
