import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Building2, DollarSign } from "lucide-react";
import { FundingOpportunity } from "@/types/funding";
import { Link } from "react-router-dom";

interface FundingOpportunityCardProps {
  opportunity: FundingOpportunity;
  profileLink?: string;
}

const FundingOpportunityCard = ({ opportunity, profileLink }: FundingOpportunityCardProps) => {
  const getFallbackLogo = (url?: string) => {
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
    opportunity.logo_url || getFallbackLogo(opportunity.url)
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'grant':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'accelerator':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'contest':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'microfund':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 group border-0 bg-gradient-to-br from-background to-muted/20 h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold group-hover:text-primary transition-colors truncate">
              {opportunity.title}
            </h3>
            {opportunity.funding_amount && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <DollarSign className="h-3 w-3" />
                <span>{opportunity.funding_amount}</span>
              </div>
            )}
          </div>
          {/* Logo Frame - matches VCCard style */}
          <div className="shrink-0 w-12 h-12 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
            {resolvedLogo ? (
              <img
                src={resolvedLogo}
                alt={`${opportunity.title} logo`}
                className="w-full h-full object-contain p-1"
                onError={() => setResolvedLogo(null)}
              />
            ) : (
              <Building2 className="h-6 w-6 text-muted-foreground/50" />
            )}
          </div>
        </div>

        {/* Type & Featured badges */}
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant="outline" className={`text-xs font-medium capitalize ${getTypeColor(opportunity.type)}`}>
            {opportunity.type}
          </Badge>
          {opportunity.is_featured && (
            <Badge className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              Featured
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3 flex-grow flex flex-col">
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-3 flex-grow">
          {opportunity.description}
        </p>

        {/* View Details Button */}
        <Button
          asChild
          size="sm"
          className="w-full mt-auto"
        >
          {profileLink ? (
            <Link to={profileLink}>
              View Details
              <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          ) : (
            <a href={opportunity.url} target="_blank" rel="noopener noreferrer">
              Learn More
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FundingOpportunityCard;
