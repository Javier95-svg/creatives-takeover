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
    <section className="py-20 px-4 relative overflow-hidden bg-gradient-to-b from-background to-muted/20">
      {/* Funding Wallpaper - Topographic Contour Lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Contour lines - layered */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="contours" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
              <path d="M 20,100 Q 60,80 100,100 T 180,100" stroke="hsl(var(--primary))" strokeWidth="1" fill="none" />
              <path d="M 30,120 Q 70,100 110,120 T 190,120" stroke="hsl(var(--primary))" strokeWidth="0.8" fill="none" />
              <path d="M 15,80 Q 55,60 95,80 T 175,80" stroke="hsl(var(--accent))" strokeWidth="0.6" fill="none" />
              <path d="M 40,140 Q 80,120 120,140 T 200,140" stroke="hsl(var(--secondary))" strokeWidth="0.5" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#contours)" />
        </svg>
        
        {/* Geometric corner accents */}
        <div className="absolute top-0 left-0 w-64 h-64 opacity-[0.04]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="0" x2="256" y2="0" stroke="hsl(var(--primary))" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="256" stroke="hsl(var(--primary))" strokeWidth="1" />
            <line x1="0" y1="50" x2="206" y2="50" stroke="hsl(var(--accent))" strokeWidth="0.5" />
            <line x1="50" y1="0" x2="50" y2="206" stroke="hsl(var(--accent))" strokeWidth="0.5" />
          </svg>
        </div>
        
        <div className="absolute bottom-0 right-0 w-64 h-64 opacity-[0.04] rotate-180">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="0" x2="256" y2="0" stroke="hsl(var(--secondary))" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="256" stroke="hsl(var(--secondary))" strokeWidth="1" />
            <line x1="0" y1="50" x2="206" y2="50" stroke="hsl(var(--primary))" strokeWidth="0.5" />
            <line x1="50" y1="0" x2="50" y2="206" stroke="hsl(var(--primary))" strokeWidth="0.5" />
          </svg>
        </div>
        
        {/* Radial gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/6 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-tl from-primary/6 via-transparent to-transparent" />
        
        {/* Soft glow effects */}
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
      </div>
      
      {/* Decorative Wave */}
      <svg className="absolute top-0 left-0 w-full h-24 opacity-20 z-10" preserveAspectRatio="none" viewBox="0 0 1200 120">
        <path d="M0,50 C300,20 600,80 900,50 C1050,35 1150,60 1200,50 L1200,0 L0,0 Z" fill="url(#fundingWaveGradient)" />
        <defs>
          <linearGradient id="fundingWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>
      
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <Sparkles className="h-6 w-6 text-primary" />
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight pb-2">
              Discover Funding Opportunities
            </h2>
          </div>
          <p className="text-muted-foreground text-lg mt-4">
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
