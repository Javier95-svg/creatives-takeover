import { Link, useNavigate } from "react-router-dom";
import { Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useMessaging } from "@/hooks/useMessaging";
import { cn } from "@/lib/utils";
import type { MarketplaceService } from "@/types/serviceMarketplace";
import { SERVICE_CATEGORY_LABELS } from "@/types/serviceMarketplace";
import { getServiceProfilePath, resolveServiceMessageUserId } from "@/utils/serviceMarketplace";

interface ServiceCardProps {
  service: MarketplaceService;
  priority?: boolean;
  className?: string;
}

const getImagePosition = (x?: number | null, y?: number | null) => `${x ?? 50}% ${y ?? 50}%`;

export function ServiceCard({ service, priority = false, className }: ServiceCardProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { startConversation } = useMessaging({ autoLoad: false });
  const profilePath = getServiceProfilePath(service);
  const messageUserId = resolveServiceMessageUserId(service);
  const hasMessageUser = Boolean(messageUserId);
  const hasEmail = Boolean(service.delivered_by_email?.trim());
  const deliveredByInitials = service.delivered_by_name
    ? service.delivered_by_name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  const handleMessage = async () => {
    const providerUserId = resolveServiceMessageUserId(service);

    if (!providerUserId) {
      toast.error("This service does not have messaging enabled yet.");
      return;
    }

    if (!isAuthenticated || !user) {
      navigate(`/signup?source=message-service&return=${encodeURIComponent(profilePath)}`);
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
    const email = service.delivered_by_email?.trim();

    if (!email) {
      toast.error("This service does not have an email configured yet.");
      return;
    }

    window.location.href = `mailto:${email}`;
  };

  return (
    <Card className={cn("overflow-hidden rounded-lg border-2 border-border/60 bg-background transition-all duration-300 hover:-translate-y-1 hover:shadow-lg", className)}>
      <div className="aspect-[4/1] overflow-hidden bg-muted">
        {service.banner_url ? (
          <img
            src={service.banner_url}
            alt={service.name}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            style={{ objectPosition: getImagePosition(service.banner_focal_x, service.banner_focal_y) }}
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
        {service.delivered_by_name && (
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/35 px-3 py-2">
            {service.delivered_by_picture_url ? (
              <img
                src={service.delivered_by_picture_url}
                alt={service.delivered_by_name}
                className="h-12 w-12 rounded-md object-cover"
                loading="lazy"
                decoding="async"
                style={{
                  objectPosition: getImagePosition(
                    service.delivered_by_picture_focal_x,
                    service.delivered_by_picture_focal_y,
                  ),
                }}
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                {deliveredByInitials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">By</p>
              <p className="truncate text-sm font-semibold text-foreground">{service.delivered_by_name}</p>
            </div>
          </div>
        )}
        <div>
          <Link to={profilePath} className="text-xl font-bold leading-tight text-foreground transition-colors hover:text-primary">
            {service.name}
          </Link>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {service.description}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={handleMessage} disabled={!hasMessageUser} className="flex-1">
            <MessageCircle className="mr-2 h-4 w-4" />
            Message
          </Button>
          <Button onClick={handleEmail} disabled={!hasEmail} variant="outline" className="flex-1">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
