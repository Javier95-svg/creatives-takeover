import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit, Loader2, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import SEO, { createBreadcrumbSchema, createOrganizationSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PitchDeckViewer } from "@/components/service-marketplace/PitchDeckViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useMessaging } from "@/hooks/useMessaging";
import { useServices } from "@/hooks/useServices";
import type { MarketplaceService } from "@/types/serviceMarketplace";
import { SERVICE_CATEGORY_LABELS } from "@/types/serviceMarketplace";
import { getServiceProfilePath } from "@/utils/serviceMarketplace";

const ServiceProfilePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isAdmin } = useAdminRole();
  const { startConversation } = useMessaging({ autoLoad: false });
  const { fetchServiceBySlug, fetchServiceById, loading } = useServices();
  const [service, setService] = useState<MarketplaceService | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const loadService = async () => {
      const foundBySlug = await fetchServiceBySlug(slug);
      const foundService = foundBySlug || await fetchServiceById(slug);

      if (!cancelled) {
        setService(foundService);
      }
    };

    void loadService();

    return () => {
      cancelled = true;
    };
  }, [fetchServiceById, fetchServiceBySlug, slug]);

  const handleMessage = async () => {
    if (!service) return;

    const providerUserId = service.delivered_by_user_id?.trim();
    if (!providerUserId) {
      toast.error("This service does not have messaging enabled yet.");
      return;
    }

    if (!isAuthenticated || !user) {
      navigate(`/signup?source=message-service&return=${encodeURIComponent(getServiceProfilePath(service))}`);
      return;
    }

    if (providerUserId === user.id) {
      toast.error("You cannot message yourself.");
      return;
    }

    try {
      const conversationId = await startConversation(providerUserId);
      if (conversationId) {
        navigate(`/messages?conversationId=${conversationId}`);
        return;
      }

      toast.error("Failed to start conversation. Please try again.");
    } catch (error) {
      console.error("Error starting service conversation:", error);
      toast.error("Failed to start conversation. Please try again.");
    }
  };

  const handleEmail = () => {
    if (!service) return;

    const email = service.delivered_by_email?.trim();
    if (!email) {
      toast.error("This service does not have an email configured yet.");
      return;
    }

    window.location.href = `mailto:${email}`;
  };

  const deliveredByInitials = service?.delivered_by_name
    ? service.delivered_by_name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  if (loading && !service) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!service) {
    return (
      <>
        <Navigation />
        <main className="container mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Service not found</h1>
          <p className="mt-2 text-muted-foreground">This service is unavailable or has not been published.</p>
          <Button asChild className="mt-6">
            <Link to="/marketplace">Browse Marketplace</Link>
          </Button>
        </main>
        <Footer />
      </>
    );
  }

  const hasMessageUser = Boolean(service.delivered_by_user_id?.trim());
  const hasEmail = Boolean(service.delivered_by_email?.trim());

  return (
    <>
      <SEO
        title={`${service.name} | Founder Service Marketplace`}
        description={service.description}
        url={getServiceProfilePath(service)}
        image={service.banner_url || "/og-image.png"}
        structuredData={[
          createOrganizationSchema(),
          createBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Marketplace", url: "/marketplace" },
            { name: service.name, url: getServiceProfilePath(service) },
          ]),
        ]}
      />
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-header-offset">
          <section className="border-b border-border/60 bg-muted/20">
            <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
              <Button variant="ghost" size="sm" asChild className="mb-6">
                <Link to="/marketplace">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Marketplace
                </Link>
              </Button>

              <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                <div>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{SERVICE_CATEGORY_LABELS[service.category]}</Badge>
                    {service.is_featured && <Badge>Featured</Badge>}
                  </div>
                  {service.delivered_by_name && (
                    <div className="mb-5 flex w-fit items-center gap-3 rounded-lg border border-border/60 bg-background/75 px-3 py-2">
                      {service.delivered_by_picture_url ? (
                        <img
                          src={service.delivered_by_picture_url}
                          alt={service.delivered_by_name}
                          className="h-11 w-11 rounded-full object-cover"
                          loading="eager"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {deliveredByInitials}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">By</p>
                        <p className="text-sm font-semibold text-foreground">{service.delivered_by_name}</p>
                      </div>
                    </div>
                  )}
                  <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{service.name}</h1>
                  <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{service.description}</p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button onClick={handleMessage} disabled={!hasMessageUser} size="lg">
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Message
                    </Button>
                    <Button onClick={handleEmail} disabled={!hasEmail} variant="outline" size="lg">
                      <Mail className="mr-2 h-5 w-5" />
                      Email
                    </Button>
                    {isAdmin && (
                      <Button variant="outline" asChild size="lg">
                        <Link to={`/marketplace/admin/edit/${service.id}`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Service
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-border bg-muted shadow-sm">
                  {service.banner_url ? (
                    <img src={service.banner_url} alt={service.name} className="aspect-[16/10] h-full w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-slate-950 via-slate-800 to-cyan-900 p-8 text-center text-2xl font-semibold text-white">
                      {service.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="container mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                <div>
                  <h2 className="mb-4 text-2xl font-semibold">Pitch Deck</h2>
                  <PitchDeckViewer
                    url={service.pitch_deck_url}
                    type={service.pitch_deck_type}
                    title={`${service.name} pitch deck`}
                  />
                </div>
              </div>

              <aside className="space-y-4">
                <Card>
                  <CardContent className="space-y-4 p-5">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Contact</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        Start a direct message inside Creatives Takeover or open an email to the service provider.
                      </p>
                    </div>
                    <Button onClick={handleMessage} disabled={!hasMessageUser} className="w-full">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Message
                    </Button>
                    <Button onClick={handleEmail} disabled={!hasEmail} variant="outline" className="w-full">
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ServiceProfilePage;
