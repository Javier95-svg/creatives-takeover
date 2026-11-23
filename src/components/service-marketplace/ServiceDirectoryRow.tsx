import { Link } from "react-router-dom";
import { FileText, Loader2, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServiceMarketplaceContact } from "@/hooks/useServiceMarketplaceContact";
import { cn } from "@/lib/utils";
import type { MarketplaceService } from "@/types/serviceMarketplace";
import { SERVICE_CATEGORY_LABELS } from "@/types/serviceMarketplace";
import { getServiceProfilePath } from "@/utils/serviceMarketplace";

interface ServiceDirectoryRowProps {
  service: MarketplaceService;
  priority?: boolean;
  className?: string;
}

const getImagePosition = (x?: number | null, y?: number | null) => `${x ?? 50}% ${y ?? 50}%`;

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

/**
 * One partner in the /marketplace directory (design B, picked 2026-11-23):
 * banner, identity and description, then an action column that shows what
 * each way of getting in touch costs before anyone clicks.
 */
export function ServiceDirectoryRow({ service, priority = false, className }: ServiceDirectoryRowProps) {
  const profilePath = getServiceProfilePath(service);
  const {
    chargingAction,
    emailCredits,
    handleEmail,
    handleMessage,
    hasEmail,
    hasMessageUser,
    isCharging,
  } = useServiceMarketplaceContact(service);

  return (
    <article
      className={cn(
        "grid gap-5 rounded-2xl border border-border bg-card p-4 transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-md sm:p-5 md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_210px]",
        className,
      )}
    >
      <Link
        to={profilePath}
        className="block aspect-[4/1] self-start overflow-hidden rounded-xl bg-muted"
        aria-label={`${service.name} profile`}
        tabIndex={-1}
      >
        {service.banner_url ? (
          <img
            src={service.banner_url}
            alt=""
            className="h-full w-full object-cover"
            width={1120}
            height={280}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            style={{ objectPosition: getImagePosition(service.banner_focal_x, service.banner_focal_y) }}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-primary px-4 text-center text-base font-semibold text-primary-foreground">
            {service.name}
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-xl font-bold leading-tight tracking-tight">
            <Link to={profilePath} className="text-foreground transition-colors hover:text-primary">
              {service.name}
            </Link>
          </h2>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {SERVICE_CATEGORY_LABELS[service.category]}
          </span>
        </div>

        {service.delivered_by_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {service.delivered_by_picture_url ? (
              <img
                src={service.delivered_by_picture_url}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
                width={24}
                height={24}
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
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(service.delivered_by_name)}
              </span>
            )}
            <span>
              Delivered by <span className="font-semibold text-foreground">{service.delivered_by_name}</span>
            </span>
          </div>
        )}

        <p className="mt-0.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{service.description}</p>

        {service.pitch_deck_url && (
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            Pitch deck available
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row md:col-span-2 xl:col-span-1 xl:flex-col xl:border-l xl:border-border xl:pl-5">
        <Button
          onClick={handleMessage}
          disabled={!hasMessageUser || isCharging}
          className="h-11 flex-1 justify-between gap-2 xl:flex-none"
        >
          <span className="flex items-center gap-2">
            {chargingAction === "message" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            Message
          </span>
          <span className="text-xs font-medium opacity-85">Free</span>
        </Button>
        <Button
          onClick={handleEmail}
          disabled={!hasEmail || isCharging}
          variant="outline"
          className="h-11 flex-1 justify-between gap-2 xl:flex-none"
        >
          <span className="flex items-center gap-2">
            {chargingAction === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Email
          </span>
          <span className="text-xs font-medium text-muted-foreground">{emailCredits} credits</span>
        </Button>
        <Button asChild variant="ghost" className="h-11 flex-1 text-primary hover:text-primary xl:flex-none">
          <Link to={profilePath}>View profile</Link>
        </Button>
      </div>
    </article>
  );
}
