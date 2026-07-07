import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, CreditCard, Edit, FileText, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import SEO, { createBreadcrumbSchema, createOrganizationSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PitchDeckViewer } from "@/components/service-marketplace/PitchDeckViewer";
import ServiceMarketplaceWallpaper from "@/components/wallpapers/ServiceMarketplaceWallpaper";
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
      <div className="relative min-h-screen bg-background">
        <ServiceMarketplaceWallpaper />
        <Navigation />
        <main className="relative z-10 pt-header-offset">
          <section className="py-8 lg:py-12">
            <div className="container mx-auto max-w-6xl px-4 sm:px-6">
              <Button variant="ghost" size="sm" asChild className="mb-6 rounded-lg border border-slate-200/70 bg-white/72 shadow-sm backdrop-blur hover:bg-white dark:border-white/10 dark:bg-slate-950/62 dark:hover:bg-slate-900">
                <Link to="/marketplace">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Marketplace
                </Link>
              </Button>

              <div className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-white/86 shadow-[0_28px_80px_-52px_rgba(8,145,178,0.55)] backdrop-blur-xl dark:border-cyan-300/15 dark:bg-slate-950/78">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_26rem]">
                  <div className="p-6 sm:p-8 lg:p-10">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-md border-cyan-500/20 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200">
                        {SERVICE_CATEGORY_LABELS[service.category]}
                      </Badge>
                      {service.is_featured && <Badge className="rounded-md bg-slate-950 text-white dark:bg-white dark:text-slate-950">Featured</Badge>}
                    </div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
                      Service Profile
                    </p>
                    <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{service.name}</h1>
                    <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">{service.description}</p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <Button onClick={handleBook} disabled={booking || !service.booking_url} size="lg" className="rounded-lg bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
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
                        <Button variant="outline" asChild size="lg" className="rounded-lg border-slate-200 bg-white/70 hover:border-cyan-500/40 hover:bg-cyan-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-cyan-300/10">
                          <Link to={`/marketplace/admin/edit/${service.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Service
                          </Link>
                        </Button>
                      )}
                    </div>

                    <div className="mt-7 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                        <FileText className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
                        <p className="mt-2 text-sm font-semibold">Free deck</p>
                      </div>
                      <div className="rounded-lg border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                        <CreditCard className="h-4 w-4 text-rose-600 dark:text-rose-300" />
                        <p className="mt-2 text-sm font-semibold">10-credit booking</p>
                      </div>
                      <div className="rounded-lg border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                        <p className="mt-2 text-sm font-semibold">Admin curated</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative min-h-[280px] overflow-hidden border-t border-slate-200/80 bg-slate-950 lg:border-l lg:border-t-0 dark:border-white/10">
                    {service.banner_url ? (
                      <img src={service.banner_url} alt={service.name} className="h-full min-h-[280px] w-full object-cover opacity-90" />
                    ) : (
                      <div className="flex h-full min-h-[280px] items-center justify-center bg-[linear-gradient(135deg,#020617,#0f766e_52%,#be123c)] p-8 text-center text-2xl font-semibold text-white">
                        {service.name}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/22 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/12 bg-slate-950/72 p-4 text-white backdrop-blur">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Operator Brief</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-200">
                        Review the service profile, inspect the deck, then book a focused discovery call.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="container mx-auto max-w-6xl px-4 pb-12 pt-2 sm:px-6">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                <div className="rounded-lg border border-cyan-500/20 bg-white/84 p-4 shadow-[0_22px_70px_-50px_rgba(8,145,178,0.42)] backdrop-blur dark:bg-slate-950/70 sm:p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Pitch Deck</p>
                      <h2 className="text-2xl font-semibold">Service briefing</h2>
                    </div>
                  </div>
                  <PitchDeckViewer
                    url={service.pitch_deck_url}
                    type={service.pitch_deck_type}
                    title={`${service.name} pitch deck`}
                  />
                </div>
              </div>

              <aside className="space-y-4">
                <Card className="rounded-lg border-cyan-500/20 bg-white/84 shadow-[0_22px_70px_-50px_rgba(8,145,178,0.42)] backdrop-blur dark:bg-slate-950/70">
                  <CardContent className="space-y-4 p-5">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Discovery Call</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        Booking confirmation uses 10 credits and opens the service calendar in a new tab.
                      </p>
                    </div>
                    {confirmed ? (
                      <div className="rounded-lg border border-success/40 bg-success/5 p-3 text-sm text-success">
                        Booking confirmed.
                      </div>
                    ) : pendingCallId ? (
                      <div className="space-y-3 rounded-lg border border-slate-200/80 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                        <p className="text-sm font-medium">Calendar opened</p>
                        <Button onClick={handleConfirmBooking} disabled={confirming} className="w-full rounded-lg bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
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
                      <Button onClick={handleBook} disabled={booking || !service.booking_url} className="w-full rounded-lg bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
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
