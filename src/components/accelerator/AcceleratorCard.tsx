import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Building2, Clock3, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FundingOpportunity } from "@/types/funding";

interface AcceleratorCardProps {
  accelerator: FundingOpportunity;
  profileLink: string;
}

const AcceleratorCard = ({ accelerator, profileLink }: AcceleratorCardProps) => {
  const getFallbackLogo = (url?: string | null) => {
    if (!url) return null;
    try {
      const normalized = url.startsWith("http") ? url : `https://${url}`;
      const hostname = new URL(normalized).hostname.replace(/^www\./, "");
      return hostname ? `https://logo.clearbit.com/${hostname}` : null;
    } catch {
      return null;
    }
  };

  const [resolvedLogo, setResolvedLogo] = useState<string | null>(
    accelerator.logo_url || getFallbackLogo(accelerator.website_url || accelerator.url)
  );

  const stageLabel = accelerator.focus_stage?.slice(0, 2).join(", ") || "Founder fit on profile";
  const sectorLabel = accelerator.focus_sectors?.slice(0, 2).join(", ") || accelerator.keywords.slice(0, 2).join(", ");
  const geographyLabel = accelerator.cohort_geography?.slice(0, 2).join(", ") || accelerator.location.slice(0, 2).join(", ");
  const applicationLabel = accelerator.application_url
    ? "Apply on website"
    : accelerator.website_url || accelerator.url
      ? "Visit website"
      : "See profile";
  const fundingLabel = accelerator.funding_offered || accelerator.funding_amount || "Funding details on profile";
  const footerLocation = accelerator.location[0] || accelerator.cohort_geography?.[0] || null;

  return (
    <Card className="group h-full border border-border/60 bg-background/95 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap gap-1">
              {accelerator.focus_stage?.slice(0, 2).map((stage, idx) => (
                <Badge key={idx} variant="outline" className="text-[11px] capitalize">
                  {stage.replace("-", " ")}
                </Badge>
              ))}
              {accelerator.program_format && (
                <Badge variant="secondary" className="text-[11px]">
                  {accelerator.program_format}
                </Badge>
              )}
            </div>
            <h3 className="truncate text-lg font-semibold tracking-tight group-hover:text-primary transition-colors">
              {accelerator.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {sectorLabel || "Sector fit on profile"}
            </p>
          </div>

          <div className="shrink-0 flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
            {resolvedLogo ? (
              <img
                src={resolvedLogo}
                alt={`${accelerator.title} logo`}
                className="h-full w-full object-contain p-1"
                onError={() => setResolvedLogo(null)}
              />
            ) : (
              <Building2 className="h-6 w-6 text-muted-foreground/50" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3 flex-grow flex flex-col">
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {accelerator.description}
        </p>

        <div className="grid gap-2 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Stage</span>
            <span className="max-w-[11rem] text-right font-medium capitalize line-clamp-2">
              {stageLabel.replaceAll("-", " ")}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Sector</span>
            <span className="max-w-[11rem] text-right font-medium line-clamp-2">
              {sectorLabel || "See profile"}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Funding</span>
            <span className="max-w-[11rem] text-right font-medium line-clamp-2">
              {fundingLabel}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Geography</span>
            <span className="max-w-[11rem] text-right font-medium line-clamp-2">
              {geographyLabel || "See profile"}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">How to apply</span>
            <span className="max-w-[11rem] text-right font-medium line-clamp-2">
              {applicationLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            <span>{accelerator.program_duration || "Program details on profile"}</span>
          </div>
          {footerLocation && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{footerLocation}</span>
            </div>
          )}
        </div>

        <Button asChild size="sm" className="mt-auto w-full">
          <Link to={profileLink}>
            View Profile
            <ArrowUpRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default AcceleratorCard;
