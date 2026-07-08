import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CREDIT_COSTS } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useCreditActions } from "@/hooks/useCreditActions";
import { useMessaging } from "@/hooks/useMessaging";
import type { MarketplaceService } from "@/types/serviceMarketplace";
import { getServiceProfilePath, resolveServiceMessageUserId } from "@/utils/serviceMarketplace";

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
  const hasEmail = Boolean(service?.delivered_by_email?.trim());
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
      providerEmail: service?.delivered_by_email?.trim() || null,
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

      const charged = await deductCredits("SERVICE_MARKETPLACE_MESSAGE", {
        featureName: "Service Marketplace Message",
        requiredCredits: CREDIT_COSTS.SERVICE_MARKETPLACE_MESSAGE,
        description: "Send a direct message to a service provider.",
        metadata: getCreditMetadata("message"),
      });

      if (charged) {
        navigate(`/messages?conversationId=${conversationId}`);
      }
    } catch (error) {
      console.error("Error starting service conversation:", error);
      toast.error("Failed to start conversation. Please try again.");
    } finally {
      setChargingAction(null);
    }
  }, [deductCredits, getCreditMetadata, navigate, requireAuthenticatedUser, service, startConversation, user?.id]);

  const handleEmail = useCallback(async () => {
    if (!service) return;

    const email = service.delivered_by_email?.trim();
    if (!email) {
      toast.error("This service does not have an email configured yet.");
      return;
    }

    if (!requireAuthenticatedUser("email-service")) return;

    setChargingAction("email");
    try {
      const charged = await deductCredits("SERVICE_MARKETPLACE_EMAIL", {
        featureName: "Service Marketplace Email",
        requiredCredits: CREDIT_COSTS.SERVICE_MARKETPLACE_EMAIL,
        description: "Open the email address for a service provider.",
        metadata: getCreditMetadata("email"),
      });

      if (charged) {
        window.location.href = `mailto:${email}`;
      }
    } finally {
      setChargingAction(null);
    }
  }, [deductCredits, getCreditMetadata, requireAuthenticatedUser, service]);

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
