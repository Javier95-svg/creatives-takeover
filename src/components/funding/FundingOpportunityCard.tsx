import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CalendarClock, Layers } from "lucide-react";
import { FundingOpportunity } from "@/types/funding";

interface FundingOpportunityCardProps {
  opportunity: FundingOpportunity;
  onSelect?: (opportunity: FundingOpportunity) => void;
  isActive?: boolean;
}

const FundingOpportunityCard = ({ opportunity, onSelect, isActive }: FundingOpportunityCardProps) => {
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

  const applicationClose = opportunity.key_dates?.application_close;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(opportunity);
      return;
    }

    window.open(opportunity.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card
      className={`hover:shadow-lg transition-all duration-300 cursor-pointer group border ${
        isActive ? 'border-primary shadow-primary/20' : 'border-transparent'
      } bg-gradient-to-br from-background to-muted/20 h-full flex flex-col`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-4 flex-grow">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors flex-1">
            {opportunity.title}
          </h3>
          {opportunity.is_featured && (
            <Badge className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20 shrink-0">
              ⭐ Featured
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm mt-2 flex-wrap">
          <Badge variant="outline" className={`text-xs font-medium capitalize ${getTypeColor(opportunity.type)}`}>
            {opportunity.type}
          </Badge>
          {opportunity.funding_amount && (
            <Badge className="text-xs border bg-primary/5 text-primary border-primary/20">
              {opportunity.funding_amount}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4 flex flex-col flex-grow">
        <p className="text-muted-foreground text-sm leading-relaxed">
          {opportunity.description}
        </p>

        {opportunity.funding_types && opportunity.funding_types.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5 text-primary" />
            {opportunity.funding_types.slice(0, 2).map((fundingType, index) => (
              <Badge key={index} variant="secondary" className="text-[10px] px-2 py-0.5">
                {fundingType}
              </Badge>
            ))}
            {opportunity.funding_types.length > 2 && (
              <span className="text-[11px] text-muted-foreground/80">
                +{opportunity.funding_types.length - 2} more
              </span>
            )}
          </div>
        )}

        {applicationClose && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 text-primary" />
            <span>Applications close {new Date(applicationClose).toLocaleDateString()}</span>
          </div>
        )}

        {opportunity.location && opportunity.location.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {opportunity.location.slice(0, 3).map((loc, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs px-2 py-0.5"
              >
                {loc}
              </Badge>
            ))}
            {opportunity.location.length > 3 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                +{opportunity.location.length - 3} more
              </Badge>
            )}
          </div>
        )}

        <Button
          size="sm"
          className="w-full text-xs h-8 mt-auto"
          onClick={(e) => {
            e.stopPropagation();
            window.open(opportunity.url, '_blank', 'noopener,noreferrer');
          }}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Learn More
        </Button>
      </CardContent>
    </Card>
  );
};

export default FundingOpportunityCard;

