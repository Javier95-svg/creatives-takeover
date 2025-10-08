import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RefreshCw, Sparkles, TrendingUp, ExternalLink } from "lucide-react";
import TrendCard from "./TrendCard";
import { useTrends } from "@/hooks/useTrends";
import { fundingPrograms } from "@/data/fundingPrograms";
import { Badge } from "@/components/ui/badge";

const FundingOpportunitiesSection = () => {
  const { trends, isLoading, error, refetch } = useTrends();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use hardcoded funding programs as primary source
  const displayedPrograms = useMemo(() => {
    return fundingPrograms.slice(0, 6);
  }, []);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refetch();
    } catch (error) {
      console.error('❌ Error refreshing funding opportunities:', error);
    } finally {
      setIsRefreshing(false);
    }
  };


  return (
    <section className="py-16 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
            Discover Funding Opportunities
          </h2>
          <p className="text-muted-foreground">
            Investment contests, accelerator programs, and funding opportunities for your refined business plan
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedPrograms.map((program) => (
            <Card 
              key={program.id}
              className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-0 bg-gradient-to-br from-background to-muted/20"
              onClick={() => window.open(program.url, '_blank', 'noopener,noreferrer')}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
                    {program.title}
                  </h3>
                  <div className="flex items-center gap-1 text-sm font-medium shrink-0">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-green-600">
                      {program.opportunityScore}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm mt-2">
                  <Badge variant="outline" className="text-xs font-medium capitalize">
                    {program.type.replace('_', ' ')}
                  </Badge>
                  {program.fundingRange && (
                    <Badge className="text-xs border bg-primary/5 text-primary border-primary/20">
                      {program.fundingRange}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-4">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {program.description}
                </p>
                
                {program.location && program.location.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {program.location.map((loc, index) => (
                      <Badge 
                        key={index}
                        variant="secondary" 
                        className="text-xs px-2 py-0.5"
                      >
                        {loc}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <Button 
                  size="sm" 
                  className="w-full text-xs h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(program.url, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Visit Program
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-8 text-muted-foreground flex items-center justify-center gap-2">
          <TrendingUp className="w-4 h-4" />
          <span>Showing {displayedPrograms.length} top funding programs</span>
        </div>
      </div>
    </section>
  );
};

export default FundingOpportunitiesSection;
