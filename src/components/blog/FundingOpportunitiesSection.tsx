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
      {/* Funding Wallpaper - Animated Particles & Waves */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-gradient-to-b from-background via-muted/5 to-background">
        {/* Animated wave layers */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path d="M0,200 Q250,150 500,200 T1000,200 T1500,200 L1500,0 L0,0 Z" fill="url(#wave1)" className="animate-pulse" style={{animationDuration: '8s'}} />
          <path d="M0,350 Q300,300 600,350 T1200,350 T1800,350 L1800,0 L0,0 Z" fill="url(#wave1)" opacity="0.4" className="animate-pulse" style={{animationDuration: '10s', animationDelay: '1s'}} />
        </svg>
        
        {/* Floating coins/circles */}
        <div className="absolute top-[15%] left-[10%] w-16 h-16 rounded-full border-2 border-primary/10 animate-bounce" style={{animationDuration: '4s'}} />
        <div className="absolute top-[40%] right-[15%] w-12 h-12 rounded-full border-2 border-accent/10 animate-bounce" style={{animationDuration: '5s', animationDelay: '0.5s'}} />
        <div className="absolute bottom-[30%] left-[20%] w-20 h-20 rounded-full border-2 border-secondary/10 animate-bounce" style={{animationDuration: '6s', animationDelay: '1s'}} />
        <div className="absolute top-[55%] left-[45%] w-14 h-14 rounded-full border-2 border-primary/10 animate-bounce" style={{animationDuration: '4.5s', animationDelay: '1.5s'}} />
        <div className="absolute bottom-[20%] right-[25%] w-18 h-18 rounded-full border-2 border-accent/10 animate-bounce" style={{animationDuration: '5.5s', animationDelay: '2s'}} />
        
        {/* Scattered dot grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
              <circle cx="25" cy="25" r="2" fill="hsl(var(--primary))" />
              <circle cx="5" cy="5" r="1" fill="hsl(var(--accent))" opacity="0.5" />
              <circle cx="45" cy="45" r="1" fill="hsl(var(--secondary))" opacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
        
        {/* Radial glow spots */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] animate-pulse" style={{animationDuration: '7s'}} />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] animate-pulse" style={{animationDuration: '9s', animationDelay: '2s'}} />
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
