import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, MapPin, DollarSign, Building2, ArrowUpRight } from "lucide-react";
import { Investor } from "@/types/investor";
import { Link } from "react-router-dom";

interface VCCardProps {
  vc: Investor;
  canViewProfile?: boolean;
}

const VCCard = ({ vc, canViewProfile = true }: VCCardProps) => {
  const getFallbackLogo = (website?: string) => {
    if (!website) return null;
    try {
      const normalized = website.startsWith("http") ? website : `https://${website}`;
      const hostname = new URL(normalized).hostname.replace(/^www\./, "");
      return hostname ? `https://logo.clearbit.com/${hostname}` : null;
    } catch {
      return null;
    }
  };

  const [resolvedLogo, setResolvedLogo] = useState<string | null>(
    vc.logo_url || getFallbackLogo(vc.firm_website)
  );

  const formatCheckSize = () => {
    if (!vc.typical_check_size_min || !vc.typical_check_size_max) return null;
    if (vc.typical_check_size_max >= 1000000) {
      return `$${(vc.typical_check_size_min / 1000000).toFixed(vc.typical_check_size_min >= 1000000 ? 1 : 0)}M-$${(vc.typical_check_size_max / 1000000).toFixed(1)}M`;
    }
    const min = (vc.typical_check_size_min / 1000).toFixed(0);
    const max = (vc.typical_check_size_max / 1000).toFixed(0);
    return `$${min}K-$${max}K`;
  };

  return (
    <Card className="group h-full border border-border/60 bg-background/95 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap gap-1">
              {vc.investment_stages.slice(0, 3).map((stage, idx) => (
                <Badge key={idx} variant="outline" className="text-[11px] capitalize">
                  {stage.replace('-', ' ')}
                </Badge>
              ))}
            </div>
            <h3 className="truncate text-lg font-semibold tracking-tight group-hover:text-primary transition-colors">
              {vc.firm_name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {vc.industries.slice(0, 2).join(' • ') || 'Sector focus on profile'}
            </p>
          </div>
          <div className="shrink-0 w-12 h-12 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
            {resolvedLogo ? (
              <img
                src={resolvedLogo}
                alt={`${vc.firm_name} logo`}
                className="w-full h-full object-contain p-1"
                loading="lazy"
                decoding="async"
                onError={() => setResolvedLogo(null)}
              />
            ) : (
              <Building2 className="h-6 w-6 text-muted-foreground/50" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3 flex-grow flex flex-col">
        {vc.investment_thesis && (
          <p className="text-sm leading-6 text-muted-foreground line-clamp-3">
            {vc.investment_thesis}
          </p>
        )}

        <div className="grid gap-2 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Stage</span>
            <span className="text-right font-medium capitalize">{vc.investment_stages.slice(0, 2).join(', ').replaceAll('-', ' ')}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Sector</span>
            <span className="text-right font-medium">{vc.industries.slice(0, 2).join(', ')}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Ticket</span>
            <span className="text-right font-medium">{formatCheckSize() || 'Check on profile'}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Geography</span>
            <span className="text-right font-medium">{vc.geographic_focus.slice(0, 2).join(', ')}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">How to apply</span>
            <span className="text-right font-medium">{vc.application_url ? 'Website / contact page' : 'Profile details'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            <span>{formatCheckSize() || 'Founder-fit details inside'}</span>
          </div>
          {vc.geographic_focus.length > 0 && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{vc.geographic_focus[0]}</span>
            </div>
          )}
        </div>

        {canViewProfile ? (
          <Button asChild size="sm" className="w-full mt-auto">
            <Link to={`/insighta/vc/${vc.slug}`}>
              View Profile
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" className="w-full mt-auto" variant="secondary">
            <Link to="/pricing">
              <Lock className="h-3 w-3 mr-1" />
              View limit reached
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default VCCard;
