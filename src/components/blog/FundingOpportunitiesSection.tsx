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
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Funding Wallpaper - Geometric Money Pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-gradient-to-b from-background via-background/95 to-background">
        {/* Hexagonal grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hexagons" x="0" y="0" width="100" height="87" patternUnits="userSpaceOnUse">
              <path d="M50,0 L93.3,25 L93.3,62 L50,87 L6.7,62 L6.7,25 Z" stroke="hsl(var(--primary))" strokeWidth="1" fill="none" />
              <circle cx="50" cy="43.5" r="3" fill="hsl(var(--primary))" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexagons)" />
        </svg>
        
        {/* Floating dollar symbols with different sizes */}
        <div className="absolute top-20 left-[15%] text-5xl opacity-[0.025] animate-pulse" style={{animationDuration: '3s'}}>$</div>
        <div className="absolute top-[30%] right-[20%] text-7xl opacity-[0.03] animate-pulse" style={{animationDuration: '4s', animationDelay: '0.5s'}}>$</div>
        <div className="absolute bottom-[25%] left-[25%] text-6xl opacity-[0.025] animate-pulse" style={{animationDuration: '3.5s', animationDelay: '1s'}}>$</div>
        <div className="absolute top-[60%] right-[15%] text-5xl opacity-[0.03] animate-pulse" style={{animationDuration: '4.5s', animationDelay: '1.5s'}}>$</div>
        <div className="absolute bottom-[40%] left-[10%] text-8xl opacity-[0.02] animate-pulse" style={{animationDuration: '5s', animationDelay: '2s'}}>$</div>
        
        {/* Diagonal lines creating depth */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="diagonals" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="80" y2="80" stroke="hsl(var(--primary))" strokeWidth="1" />
              <line x1="40" y1="0" x2="80" y2="40" stroke="hsl(var(--secondary))" strokeWidth="0.5" />
              <line x1="0" y1="40" x2="40" y2="80" stroke="hsl(var(--secondary))" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diagonals)" />
        </svg>
        
        {/* Circular ripple effects */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full border border-primary/5 blur-sm" />
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full border border-primary/3 blur-md" />
        <div className="absolute bottom-1/3 right-1/3 w-72 h-72 rounded-full border border-secondary/4 blur-sm" />
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 rounded-full border border-secondary/2 blur-md" />
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
              Funding Opportunities
            </h2>
            <span className="text-4xl md:text-5xl animate-bounce">💰</span>
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
