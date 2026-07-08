import { Link } from "react-router-dom";
import { Loader2, Mail, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useServiceMarketplaceContact } from "@/hooks/useServiceMarketplaceContact";
import { cn } from "@/lib/utils";
import type { MarketplaceService } from "@/types/serviceMarketplace";
import { SERVICE_CATEGORY_LABELS } from "@/types/serviceMarketplace";
import { getServiceProfilePath } from "@/utils/serviceMarketplace";

interface ServiceCardProps {
  service: MarketplaceService;
  priority?: boolean;
  className?: string;
}

const getImagePosition = (x?: number | null, y?: number | null) => `${x ?? 50}% ${y ?? 50}%`;

export function ServiceCard({ service, priority = false, className }: ServiceCardProps) {
  const profilePath = getServiceProfilePath(service);
  const {
    chargingAction,
    emailCredits,
    handleEmail,
    handleMessage,
    hasEmail,
    hasMessageUser,
    isCharging,
    messageCredits,
  } = useServiceMarketplaceContact(service);
  const deliveredByInitials = service.delivered_by_name
    ? service.delivered_by_name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

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
          <Button onClick={handleMessage} disabled={!hasMessageUser || isCharging} className="flex-1 whitespace-nowrap text-xs sm:text-sm">
            {chargingAction === "message" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="mr-2 h-4 w-4" />
            )}
            Message ({messageCredits} credits)
          </Button>
          <Button onClick={handleEmail} disabled={!hasEmail || isCharging} variant="outline" className="flex-1 whitespace-nowrap text-xs sm:text-sm">
            {chargingAction === "email" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Email ({emailCredits} credits)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
