import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { Lightbulb, Users, Rocket, LayoutDashboard, Upload, Loader2, GraduationCap, TrendingUp, Handshake, BookOpen, ArrowRight } from "lucide-react";

// Card destinations that robots.txt disallows. Rendering a link to one wastes a
// homepage link slot and asks Google to fetch a URL it is told to skip; the card
// itself still shows, it just does not advertise a crawler-hostile route.
const ROBOTS_DISALLOWED_LINKS = new Set(["/dashboard"]);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import HomeSectionHeader from "@/components/home/HomeSectionHeader";
import GradientMesh from "@/components/home/GradientMesh";

const AUTOPLAY_MS = 6000;

// A colour field behind each card's photo.
const CARD_MESHES: [string, string, string, string][] = [
  ["228 90% 64%", "262 83% 66%", "192 90% 52%", "330 80% 62%"],
  ["262 83% 66%", "300 70% 62%", "228 90% 64%", "40 95% 60%"],
  ["152 68% 46%", "192 90% 52%", "90 60% 52%", "228 90% 64%"],
  ["330 85% 62%", "24 92% 58%", "262 83% 66%", "48 95% 60%"],
  ["40 95% 58%", "18 90% 58%", "152 68% 46%", "228 90% 64%"],
  ["192 90% 52%", "228 90% 64%", "170 75% 46%", "290 70% 62%"],
];

interface ValueCardImage {
  position: number;
  image_url: string;
  alt_text: string | null;
}

const ValuePropositionCards = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
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
      description: "Every tool works on the same project. ICP Builder defines who you serve, Demo Studio gives people something to try, PMF Lab turns their feedback into a Build, Narrow, Pivot or Stop decision, then MVP Builder, GTM Strategist and Traction Engine help you plan your launch and measure your first sales.\n\nEach tool starts from what the last one saved, so you never begin from a blank page. Your dashboard keeps tasks, weekly progress and the evidence you collect in one place.",
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
      description: "Pulse reads your project before you ask: your customer profile, demo, validation, product, go to market plan, traction, tasks and open assumptions. You don't have to explain your idea every time you ask.\n\nIt keeps the decisions and facts you choose to save, adds up to three notes a day on risks, opportunities or contradictions in your evidence, and shows the sources behind every answer. Pulse is included on every plan and its replies use no credits.",
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
      description: "You don't have to figure everything out alone. Find mentors with experience in specific fields, and find a cofounder whose skills fill the gaps in your team.\n\nWhen you need hands, the service marketplace connects you with providers in sales, marketing, operations and tech support. They are on the same platform where you build, so you don't have to look for help elsewhere.",
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
      description: "Founder Stories brings real experiences from people building companies: the lessons, the wins and the mistakes, without recycled advice.\n\nWhen you have a specific question, Startup Pedia and the Startup Guide give you clear, practical answers on customers, validation, MVPs, go to market and fundraising.",
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

  const running = !isAutoScrollPaused && !isHovering && !prefersReducedMotion;
  const tabsRef = useRef<HTMLDivElement | null>(null);

  // On a phone the tab row scrolls sideways; keep the active tab in view.
  // Only the row's own scrollLeft moves, never the page.
  useEffect(() => {
    const row = tabsRef.current;
    const tab = row?.children[selectedIndex] as HTMLElement | undefined;
    if (!row || !tab || row.scrollWidth <= row.clientWidth) return;
    const left = tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2;
    row.scrollTo({ left, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [selectedIndex, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) setIsAutoScrollPaused(true);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      setSelectedIndex((prev) => (prev + 1) % allCards.length);
    }, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [running, selectedIndex, allCards.length]);

  const goToCard = (index: number) => {
    setSelectedIndex(index);
    setIsAutoScrollPaused(true);
  };

  return (
    <section id="what-you-get" className="value-prop-section section-shell scroll-mt-24 hx-inside" aria-labelledby="inside-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="hx-inside__top">
          <HomeSectionHeader badge="What's Inside" title="Creatives Takeover in a Nutshell" id="inside-heading" />
          <button
            type="button"
            onClick={() => setIsAutoScrollPaused((prev) => !prev)}
            disabled={prefersReducedMotion}
            className="hx-cycle__play"
            aria-pressed={!isAutoScrollPaused}
          >
            {isAutoScrollPaused ? "Resume" : "Stop"}
          </button>
        </div>

        <div onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
          <div ref={tabsRef} className="hx-inside__tabs" role="tablist" aria-label="What's inside">
            {allCards.map((card, index) => {
              const Icon = card.icon;
              const selected = index === selectedIndex;
              return (
                <button
                  key={card.buttonLabel}
                  type="button"
                  role="tab"
                  id={`inside-tab-${index}`}
                  aria-selected={selected}
                  aria-controls={`inside-panel-${index}`}
                  className="hx-inside__tab"
                  onClick={() => goToCard(index)}
                >
                  <Icon aria-hidden="true" />
                  {card.buttonLabel}
                  {selected && running ? <span key={selectedIndex} className="hx-inside__timer" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>

          {/* All six panels share one grid cell, so the block keeps the height
              of the longest card and switching never moves the page. */}
          <div className="hx-inside__panels">
            {allCards.map((card, index) => {
              const Icon = card.icon;
              const selected = index === selectedIndex;
              const storedImage = cardImages.find((img) => img.position === card.position);
              const imageSrc = optimisticPreviews[card.position] || storedImage?.image_url || card.image;
              // The card describes its own photo; stored alt text dates from older card topics.
              const altText = card.imageAlt || storedImage?.alt_text;
              const isUploadingPosition = uploading === card.position;
              const mesh = CARD_MESHES[index % CARD_MESHES.length];
              return (
                <div
                  key={card.title}
                  id={`inside-panel-${index}`}
                  role="tabpanel"
                  aria-labelledby={`inside-tab-${index}`}
                  aria-hidden={!selected}
                  className={`hx-inside__panel${selected ? " is-active" : ""}`}
                >
                  <figure className="hx-inside__media group">
                    <GradientMesh colors={mesh} className="hx-inside__glow" />
                    <img src={imageSrc} alt={altText ?? ""} className="hx-inside__image" loading="lazy" />
                    <figcaption className="hx-inside__chip">
                      <span>
                        <Icon aria-hidden="true" />
                      </span>
                      {card.subtitle}
                    </figcaption>
                    {isAdmin && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-3xl">
                        <div className="w-full max-w-52 px-4">
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
                            onClick={() => fileInputRefs.current[card.position]?.click()}
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

                  <div className="hx-inside__copy">
                    <p className="hx-inside__kicker">{card.title}</p>
                    <h3 className="hx-inside__title">{card.subtitle}</h3>
                    <div className="hx-inside__text">
                      {card.description.split("\n\n").map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>
                    {card.link && !ROBOTS_DISALLOWED_LINKS.has(card.link) && (
                      <Link to={card.link} className="hx-inside__link" tabIndex={selected ? 0 : -1}>
                        {card.linkLabel || `Explore ${card.subtitle}`}
                        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ValuePropositionCards;
