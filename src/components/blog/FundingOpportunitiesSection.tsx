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
      {/* Animated Background Wallpaper - unique pattern for funding */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Base gradient layer */}
        <div className="absolute inset-0 bg-gradient-to-tl from-accent/8 via-transparent to-primary/8" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
        
        {/* Animated floating elements - distinct from trends section */}
        <div className="absolute top-24 right-[12%] w-4 h-4 bg-accent/50 rounded-full animate-spiral opacity-65" />
        <div className="absolute top-40 left-[18%] w-6 h-6 bg-primary/45 rounded-full animate-figure-eight opacity-55" style={{ animationDelay: '0.8s' }} />
        <div className="absolute bottom-32 right-[22%] w-3 h-3 bg-secondary/60 rounded-full animate-float opacity-70" style={{ animationDelay: '1.6s' }} />
        <div className="absolute top-1/2 left-[28%] w-5 h-5 bg-accent/35 rounded-full animate-orbit opacity-50" style={{ animationDelay: '2.4s' }} />
        <div className="absolute bottom-1/2 right-[35%] w-7 h-7 bg-gradient-to-br from-secondary/25 to-primary/25 rounded-full animate-diagonal-float opacity-45 blur-sm" style={{ animationDelay: '3.2s' }} />
        <div className="absolute top-56 right-[45%] w-4 h-4 bg-primary/55 rounded-full animate-zigzag opacity-60" style={{ animationDelay: '4s' }} />
        <div className="absolute bottom-56 left-[40%] w-2 h-2 bg-accent/65 rounded-full animate-float-reverse opacity-75" style={{ animationDelay: '4.8s' }} />
        <div className="absolute top-72 left-[50%] w-9 h-9 bg-gradient-to-r from-primary/18 to-transparent rounded-full animate-orbit opacity-35 blur-md" style={{ animationDelay: '5.6s' }} />
        
        {/* Extra gradient orbs for funding theme */}
        <div className="absolute bottom-72 right-[28%] w-3 h-3 bg-secondary/50 rounded-full animate-drift opacity-70" style={{ animationDelay: '6.4s' }} />
        <div className="absolute top-96 right-[15%] w-5 h-5 bg-primary/40 rounded-full animate-spiral opacity-55" style={{ animationDelay: '7.2s' }} />
        <div className="absolute bottom-96 left-[32%] w-6 h-6 bg-gradient-to-tl from-accent/20 to-secondary/20 rounded-full animate-figure-eight opacity-40 blur-sm" style={{ animationDelay: '8s' }} />
        <div className="absolute top-[30%] left-[8%] w-4 h-4 bg-primary/48 rounded-full animate-zigzag opacity-58" style={{ animationDelay: '8.8s' }} />
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
