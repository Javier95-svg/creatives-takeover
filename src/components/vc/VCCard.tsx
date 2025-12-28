import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MapPin, DollarSign } from "lucide-react";
import { Investor } from "@/types/investor";
import { Link } from "react-router-dom";

interface VCCardProps {
  vc: Investor;
}

const VCCard = ({ vc }: VCCardProps) => {
  const formatCheckSize = () => {
    if (!vc.typical_check_size_min || !vc.typical_check_size_max) return null;
    const min = (vc.typical_check_size_min / 1000).toFixed(0);
    const max = (vc.typical_check_size_max / 1000).toFixed(0);
    return `$${min}K - $${max}K`;
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 group border-0 bg-gradient-to-br from-background to-muted/20 h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold group-hover:text-primary transition-colors truncate">
              {vc.firm_name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">{vc.name}</p>
          </div>
          {vc.is_featured && (
            <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 shrink-0 text-xs">
              ⭐ Featured
            </Badge>
          )}
        </div>

        {/* Investment Stages */}
        <div className="flex flex-wrap gap-1 mt-2">
          {vc.investment_stages.map((stage, idx) => (
            <Badge key={idx} variant="outline" className="text-xs capitalize">
              {stage}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3 flex-grow flex flex-col">
        {/* Investment Thesis */}
        {vc.investment_thesis && (
          <p className="text-sm text-muted-foreground line-clamp-3 flex-grow">
            {vc.investment_thesis}
          </p>
        )}

        {/* Industries */}
        {vc.industries.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {vc.industries.slice(0, 3).map((industry, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {industry}
              </Badge>
            ))}
            {vc.industries.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{vc.industries.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Check Size & Location */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          {formatCheckSize() && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span>{formatCheckSize()}</span>
            </div>
          )}
          {vc.geographic_focus.length > 0 && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{vc.geographic_focus[0]}</span>
            </div>
          )}
        </div>

        {/* View Profile Button */}
        <Button asChild size="sm" className="w-full mt-auto">
          <Link to={`/insighta/vc/${vc.id}`}>
            View Profile
            <ExternalLink className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default VCCard;
