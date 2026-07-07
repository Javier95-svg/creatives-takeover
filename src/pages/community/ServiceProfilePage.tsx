import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SEO, { createBreadcrumbSchema, createOrganizationSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PitchDeckViewer } from "@/components/service-marketplace/PitchDeckViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useUpgradePrompt } from "@/contexts/UpgradePromptContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useServices } from "@/hooks/useServices";
import {
  buildDiscoveryCallRedirectUrl,
  confirmDiscoveryCallBooking,
  createServiceDiscoveryCallIntent,
  openDeferredExternalTab,
} from "@/services/discoveryCallService";
import { createIdempotencyKey } from "@/lib/idempotency";
import type { MarketplaceService } from "@/types/serviceMarketplace";
import { SERVICE_CATEGORY_LABELS } from "@/types/serviceMarketplace";
import { getServiceProfilePath, normalizeServiceUrl } from "@/utils/serviceMarketplace";

const ServiceProfilePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isAdmin } = useAdminRole();
  const { openUpgradePrompt } = useUpgradePrompt();
  const { fetchServiceBySlug, fetchServiceById, loading } = useServices();
  const [service, setService] = useState<MarketplaceService | null>(null);
  const [booking, setBooking] = useState(false);
  const [pendingCallId, setPendingCallId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);

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

  const openBookingGate = () => {
    if (!service) return;
    navigate(`/signup?source=book-service-call&return=${encodeURIComponent(getServiceProfilePath(service))}`);
  };

  const handleBook = async () => {
    if (!service) return;

    const bookingUrl = service.booking_url?.trim();
    if (!bookingUrl) {
      toast.error("This service does not have a booking link configured yet.");
      return;
    }

    if (!isAuthenticated || !user) {
      openBookingGate();
      return;
    }

    const bookingTab = openDeferredExternalTab();
    if (!bookingTab) {
      toast.error("Popup blocked. Please allow popups and try again.");
      return;
    }

    setBooking(true);
    try {
      const intent = await createServiceDiscoveryCallIntent({
        serviceId: service.id,
        serviceName: service.name,
        source: "service_profile",
        idempotencyKey: createIdempotencyKey(`service-profile-discovery-call-${service.id}`),
        metadata: {
          service_id: service.id,
          service_name: service.name,
          service_category: service.category,
        },
      });

      if (!intent.success || !intent.callId) {
        bookingTab.close();

        if (intent.errorCode === "INSUFFICIENT_CREDITS") {
          openUpgradePrompt({
            reason: "credits",
            featureName: "Discovery Calls",
            requiredCredits: intent.requiredCredits ?? 10,
            description: intent.error || "You need 10 credits to book a discovery call.",
            contextualTrigger: "service_profile_booking_gate",
            sourceTool: "service_marketplace",
            contextLine: `Booking a discovery call for ${service.name}.`,
          });
          return;
        }

        if (intent.errorCode === "PLAN_UPGRADE_REQUIRED" && intent.requiredTier) {
          openUpgradePrompt({
            reason: "feature",
            featureName: "Discovery Calls",
            requiredTier: intent.requiredTier,
            description: intent.error,
            contextualTrigger: "service_profile_booking_gate",
            sourceTool: "service_marketplace",
            contextLine: `Booking a discovery call for ${service.name}.`,
          });
          return;
        }

        toast.error(intent.error || "Unable to process booking. Please try again.");
        return;
      }

      bookingTab.location.href = buildDiscoveryCallRedirectUrl(
        normalizeServiceUrl(bookingUrl),
        intent.callId,
        { medium: "service_marketplace" },
      );

      const confirmResult = await confirmDiscoveryCallBooking(intent.callId, {
        source: "service_profile_confirm",
        service_id: service.id,
        service_name: service.name,
      });

      if (confirmResult.success) {
        setConfirmed(true);
        setPendingCallId(null);
        toast.success(
          confirmResult.alreadyConfirmed
            ? "Booking calendar opened in a new tab."
            : `Booking confirmed. ${confirmResult.chargedCredits ?? 10} credits used.`,
        );
      } else if (confirmResult.errorCode === "INSUFFICIENT_CREDITS") {
        openUpgradePrompt({
          reason: "credits",
          featureName: "Discovery Calls",
          requiredCredits: confirmResult.requiredCredits ?? 10,
          description: confirmResult.error || "You need 10 credits to book a discovery call.",
          contextualTrigger: "service_profile_booking_gate",
          sourceTool: "service_marketplace",
          contextLine: `Booking a discovery call for ${service.name}.`,
        });
      } else {
        setPendingCallId(intent.callId);
        toast.success("Booking calendar opened in a new tab.");
      }
    } catch (error) {
      bookingTab.close();
      console.error("Error booking service discovery call:", error);
      toast.error("Unable to process booking. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!pendingCallId || !service) return;
    setConfirming(true);

    try {
      const result = await confirmDiscoveryCallBooking(pendingCallId, {
        source: "service_profile_manual_confirm",
        service_id: service.id,
        service_name: service.name,
      });

      if (result.success) {
        setConfirmed(true);
        setPendingCallId(null);
        toast.success(
          result.alreadyConfirmed
            ? "This booking was already confirmed."
            : `Booking confirmed${result.chargedCredits ? `. ${result.chargedCredits} credits used.` : "."}`,
        );
      } else if (result.errorCode === "INSUFFICIENT_CREDITS") {
        openUpgradePrompt({
          reason: "credits",
          featureName: "Discovery Calls",
          requiredCredits: result.requiredCredits ?? 10,
          description: result.error || "You need 10 credits to confirm this discovery call.",
        });
      } else {
        toast.error(result.error || "Unable to confirm your booking. Please try again.");
      }
    } catch (error) {
      console.error("Error confirming service discovery call:", error);
      toast.error("Unable to confirm your booking. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

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
                  <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{service.name}</h1>
                  <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{service.description}</p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button onClick={handleBook} disabled={booking || !service.booking_url} size="lg">
                      {booking ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Booking
                        </>
                      ) : (
                        <>
                          <Calendar className="mr-2 h-5 w-5" />
                          Book Discovery Call
                        </>
                      )}
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
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Discovery Call</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        Booking confirmation uses 10 credits and opens the service calendar in a new tab.
                      </p>
                    </div>
                    {confirmed ? (
                      <div className="rounded-lg border border-success/40 bg-success/5 p-3 text-sm text-success">
                        Booking confirmed.
                      </div>
                    ) : pendingCallId ? (
                      <div className="space-y-3 rounded-lg border border-border p-3">
                        <p className="text-sm font-medium">Calendar opened</p>
                        <Button onClick={handleConfirmBooking} disabled={confirming} className="w-full">
                          {confirming ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Confirming
                            </>
                          ) : (
                            "I've completed my booking"
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={handleBook} disabled={booking || !service.booking_url} className="w-full">
                        <Calendar className="mr-2 h-4 w-4" />
                        Book Discovery Call
                      </Button>
                    )}
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
