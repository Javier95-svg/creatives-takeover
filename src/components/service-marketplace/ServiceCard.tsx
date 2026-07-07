import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, Loader2 } from "lucide-react";
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
    <Card className={cn("overflow-hidden rounded-lg border-2 border-border/60 bg-background transition-all duration-300 hover:-translate-y-1 hover:shadow-lg", className)}>
      <div className="aspect-[16/7] overflow-hidden bg-muted">
        {service.banner_url ? (
          <img
            src={service.banner_url}
            alt={service.name}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-800 to-cyan-900 text-white">
            <span className="px-6 text-center text-lg font-semibold">{service.name}</span>
          </div>
        )}
      </div>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{SERVICE_CATEGORY_LABELS[service.category]}</Badge>
          {service.is_featured && <Badge>Featured</Badge>}
        </div>
        <div>
          <Link to={profilePath} className="text-xl font-bold leading-tight text-foreground transition-colors hover:text-primary">
            {service.name}
          </Link>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {service.description}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={handleBook} disabled={!hasBookingUrl || booking} className="flex-1">
            {booking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Booking
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Book Discovery Call
              </>
            )}
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to={profilePath}>
              View Profile
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
