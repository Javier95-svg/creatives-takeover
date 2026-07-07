import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useUpgradePrompt } from "@/contexts/UpgradePromptContext";
import {
  buildDiscoveryCallRedirectUrl,
  confirmDiscoveryCallBooking,
  createServiceDiscoveryCallIntent,
  openDeferredExternalTab,
} from "@/services/discoveryCallService";
import { createIdempotencyKey } from "@/lib/idempotency";
import { cn } from "@/lib/utils";
import type { MarketplaceService } from "@/types/serviceMarketplace";
import { SERVICE_CATEGORY_LABELS } from "@/types/serviceMarketplace";
import { getServiceProfilePath, normalizeServiceUrl } from "@/utils/serviceMarketplace";

interface ServiceCardProps {
  service: MarketplaceService;
  priority?: boolean;
  className?: string;
}

function getCategoryAccent(category: MarketplaceService["category"]) {
  switch (category) {
    case "marketing":
      return "bg-rose-500";
    case "ops":
      return "bg-amber-400";
    case "tech_support":
      return "bg-violet-500";
    case "sales":
    default:
      return "bg-cyan-500";
  }
}

export function ServiceCard({ service, priority = false, className }: ServiceCardProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { openUpgradePrompt } = useUpgradePrompt();
  const [booking, setBooking] = useState(false);
  const profilePath = getServiceProfilePath(service);
  const hasBookingUrl = Boolean(service.booking_url?.trim());

  const handleBook = async () => {
    if (!hasBookingUrl || !service.booking_url) {
      toast.error("This service does not have a booking link configured yet.");
      return;
    }

    if (!isAuthenticated || !user) {
      navigate(`/signup?source=book-service-call&return=${encodeURIComponent(profilePath)}`);
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
        source: "service_card",
        idempotencyKey: createIdempotencyKey(`service-card-discovery-call-${service.id}`),
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
            contextualTrigger: "service_marketplace_booking_gate",
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
            contextualTrigger: "service_marketplace_booking_gate",
            sourceTool: "service_marketplace",
            contextLine: `Booking a discovery call for ${service.name}.`,
          });
          return;
        }

        toast.error(intent.error || "Unable to process booking. Please try again.");
        return;
      }

      bookingTab.location.href = buildDiscoveryCallRedirectUrl(
        normalizeServiceUrl(service.booking_url),
        intent.callId,
        { medium: "service_marketplace" },
      );

      const confirmResult = await confirmDiscoveryCallBooking(intent.callId, {
        source: "service_card_confirm",
        service_id: service.id,
        service_name: service.name,
      });

      if (confirmResult.success) {
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
          contextualTrigger: "service_marketplace_booking_gate",
          sourceTool: "service_marketplace",
          contextLine: `Booking a discovery call for ${service.name}.`,
        });
      } else {
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

  return (
    <Card className={cn("group overflow-hidden rounded-lg border border-slate-200/80 bg-white/90 shadow-[0_22px_60px_-46px_rgba(15,23,42,0.45)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/35 hover:shadow-[0_28px_70px_-44px_rgba(8,145,178,0.45)] dark:border-white/10 dark:bg-slate-950/82", className)}>
      <div className="grid h-full sm:grid-cols-[11.5rem_minmax(0,1fr)]">
        <div className="relative min-h-[180px] overflow-hidden bg-slate-950 sm:min-h-full">
          {service.banner_url ? (
            <img
              src={service.banner_url}
              alt={service.name}
              className="h-full w-full object-cover opacity-88 transition-transform duration-500 group-hover:scale-105"
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={priority ? "high" : "auto"}
            />
          ) : (
            <div className="flex h-full min-h-[180px] items-center justify-center bg-[linear-gradient(135deg,#020617,#0f766e_52%,#be123c)] p-6 text-center text-lg font-semibold text-white">
              {service.name}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md border border-white/16 bg-slate-950/72 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
            <span className={cn("h-2 w-2 rounded-full", getCategoryAccent(service.category))} />
            {SERVICE_CATEGORY_LABELS[service.category]}
          </div>
          {service.is_featured && (
            <div className="absolute bottom-3 left-3 rounded-md border border-rose-300/30 bg-rose-500/18 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-50 backdrop-blur">
              Featured
            </div>
          )}
        </div>

        <CardContent className="flex h-full flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
              <FileText className="h-4 w-4" />
              Service Dossier
            </div>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              Free deck
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-md border-cyan-500/20 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200">
                {SERVICE_CATEGORY_LABELS[service.category]}
              </Badge>
              {service.is_featured && <Badge className="rounded-md bg-slate-950 text-white dark:bg-white dark:text-slate-950">Featured</Badge>}
            </div>
            <Link to={profilePath} className="mt-3 block text-xl font-bold leading-tight text-foreground transition-colors hover:text-cyan-700 dark:hover:text-cyan-300">
              {service.name}
            </Link>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {service.description}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={handleBook} disabled={!hasBookingUrl || booking} className="rounded-lg bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
              {booking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Booking
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Book Call
                </>
              )}
            </Button>
            <Button asChild variant="outline" className="rounded-lg border-slate-200 bg-white/70 hover:border-cyan-500/40 hover:bg-cyan-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-cyan-300/10">
              <Link to={profilePath}>
                View Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
