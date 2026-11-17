import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CREDIT_COSTS } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useCreditActions } from "@/hooks/useCreditActions";
import { useMessaging } from "@/hooks/useMessaging";
import { fetchServiceContactEmail } from "@/hooks/useServices";
import type { MarketplaceService } from "@/types/serviceMarketplace";
import { getServiceProfilePath, resolveServiceMessageUserId } from "@/utils/serviceMarketplace";
import { trackSocialContactCta } from "@/lib/socialInteractionAnalytics";

export type ServiceMarketplaceContactAction = "message" | "email";

export function useServiceMarketplaceContact(service: MarketplaceService | null) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { deductCredits } = useCreditActions();
  const { startConversation } = useMessaging({ autoLoad: false });
  const [chargingAction, setChargingAction] = useState<ServiceMarketplaceContactAction | null>(null);

  const profilePath = service ? getServiceProfilePath(service) : "/marketplace";
  const messageUserId = service ? resolveServiceMessageUserId(service) : null;
  const hasMessageUser = Boolean(messageUserId);
  const hasEmail = Boolean(service?.has_contact_email || service?.delivered_by_email?.trim());
  const isCharging = chargingAction !== null;

  const getCreditMetadata = useCallback(
    (contactType: ServiceMarketplaceContactAction) => ({
      source: "service_marketplace",
      contactType,
      serviceId: service?.id,
      serviceSlug: service?.slug,
      serviceName: service?.name,
      serviceCategory: service?.category,
      providerUserId: messageUserId,
    }),
    [messageUserId, service],
  );

  const requireAuthenticatedUser = useCallback(
    (source: string) => {
      if (isAuthenticated && user) return true;

      navigate(`/signup?source=${source}&return=${encodeURIComponent(profilePath)}`);
      return false;
    },
    [isAuthenticated, navigate, profilePath, user],
  );

  const handleMessage = useCallback(async () => {
    if (!service) return;
    trackSocialContactCta({
      interactionType: "service_message",
      counterpartyType: "service_provider",
      source: "service_marketplace",
      sourceEntityType: "service",
    });

    const providerUserId = resolveServiceMessageUserId(service);
    if (!providerUserId) {
      toast.error("This service does not have messaging enabled yet.");
      return;
    }

    if (!requireAuthenticatedUser("message-service")) return;

    if (providerUserId === user?.id) {
      toast.error("You cannot message yourself.");
      return;
    }

    setChargingAction("message");
    try {
      const conversationId = await startConversation(providerUserId);
      if (!conversationId) {
        toast.error("Failed to start conversation. Please try again.");
        return;
      }

      navigate(`/messages?conversationId=${conversationId}`);
    } catch (error) {
      console.error("Error starting service conversation:", error);
      toast.error("Failed to start conversation. Please try again.");
    } finally {
      setChargingAction(null);
    }
  }, [navigate, requireAuthenticatedUser, service, startConversation, user?.id]);

  const handleEmail = useCallback(async () => {
    if (!service) return;

    if (!hasEmail) {
      toast.error("This service does not have an email configured yet.");
      return;
    }

    if (!requireAuthenticatedUser("email-service")) return;

    setChargingAction("email");
    try {
      // Paid once per service: the server releases the address only after a
      // "Service Marketplace Email" charge for this service exists.
      let email = await fetchServiceContactEmail(service.id);
      if (!email) {
        const charged = await deductCredits("SERVICE_MARKETPLACE_EMAIL", {
          featureName: "Service Marketplace Email",
          requiredCredits: CREDIT_COSTS.SERVICE_MARKETPLACE_EMAIL,
          description: "Open the email address for a service provider.",
          metadata: getCreditMetadata("email"),
        });
        if (!charged) return;
        email = await fetchServiceContactEmail(service.id);
      }

      if (email) {
        window.location.href = `mailto:${email}`;
      } else {
        toast.error("We could not open the email address. Please try again or contact us.");
      }
    } finally {
      setChargingAction(null);
    }
  }, [deductCredits, getCreditMetadata, hasEmail, requireAuthenticatedUser, service]);

  return {
    chargingAction,
    hasEmail,
    hasMessageUser,
    handleEmail,
    handleMessage,
    isCharging,
    messageCredits: CREDIT_COSTS.SERVICE_MARKETPLACE_MESSAGE,
    emailCredits: CREDIT_COSTS.SERVICE_MARKETPLACE_EMAIL,
  };
}
