import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import TrendCard from "./TrendCard";
import SearchFilters from "./SearchFilters";
import CategoryTabs from "./CategoryTabs";
import { useTrends } from "@/hooks/useTrends";
import { useSearch } from "@/hooks/useSearch";
import opportunitiesImage from "@/assets/opportunities-bg.jpg";

interface TrendingSectionProps {
  searchTerm?: string;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}

const TrendingSection = ({ 
  searchTerm, 
  selectedCategory: externalCategory = "all",
  onCategoryChange 
}: TrendingSectionProps) => {
  const { trends, isLoading, error, refetch, generateNewTrends } = useTrends();
  const { 
    searchTerm: localSearchTerm, 
    setSearchTerm, 
    filters, 
    updateFilter, 
    filteredTrends, 
    clearFilters, 
    hasActiveFilters 
  } = useSearch(trends);
  const [isGenerating, setIsGenerating] = useState(false);
  const [internalCategory, setInternalCategory] = useState("all");
  
  // Use external category if provided, otherwise use internal
  const selectedCategory = onCategoryChange ? externalCategory : internalCategory;
  const handleCategoryChange = onCategoryChange || setInternalCategory;

  // Update local search when prop changes
  React.useEffect(() => {
    if (searchTerm !== undefined) {
      setSearchTerm(searchTerm);
    }
  }, [searchTerm, setSearchTerm]);

  // Filter by category
  const categoryFilteredTrends = selectedCategory === "all" 
    ? filteredTrends 
    : filteredTrends.filter(trend => {
        // Match with actual trend categories and keywords
        const category = trend.category?.toLowerCase() || "";
        const keywords = trend.keywords?.map(k => k.toLowerCase()) || [];
        const allTerms = [category, ...keywords];
        
        if (selectedCategory === "ai-tech") return allTerms.some(t => t.includes("ai") || t.includes("tech") || t.includes("software") || t.includes("automation"));
        if (selectedCategory === "business") return allTerms.some(t => t.includes("business") || t.includes("startup") || t.includes("entrepreneur") || t.includes("market"));
        if (selectedCategory === "marketing") return allTerms.some(t => t.includes("marketing") || t.includes("social") || t.includes("brand") || t.includes("advertising"));
        if (selectedCategory === "funding") return allTerms.some(t => t.includes("funding") || t.includes("investment") || t.includes("venture") || t.includes("capital"));
        if (selectedCategory === "productivity") return allTerms.some(t => t.includes("productivity") || t.includes("efficiency") || t.includes("workflow") || t.includes("tool"));
        return true;
      });
  
  // Show maximum of 48 articles after filtering (4 rows of 12)
  const displayedTrends = categoryFilteredTrends.slice(0, 48);

  const handleRefresh = async () => {
    try {
      setIsGenerating(true);
      if (trends.length === 0) {
        await generateNewTrends();
      } else {
        await refetch();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateNew = async () => {
    try {
      setIsGenerating(true);
      await generateNewTrends();
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading || isGenerating) {
    return (
      <section className="py-20 relative overflow-hidden -mt-32 pt-40" data-section="opportunities">
        {/* Unified Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
        
        {/* Decorative Wave Bridge */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background/0 via-background/40 to-background/80 pointer-events-none" />
        <svg className="absolute top-0 left-0 w-full h-24 opacity-20" preserveAspectRatio="none" viewBox="0 0 1200 120">
          <path d="M0,50 C300,20 600,80 900,50 C1050,35 1150,60 1200,50 L1200,0 L0,0 Z" fill="url(#waveGradientLoading)" />
          <defs>
            <linearGradient id="waveGradientLoading" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
              <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="0.15" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
        
        <div className="container mx-auto px-4 relative z-10 max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 mb-3">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              <h2 className="text-4xl md:text-5xl font-bold gradient-text">Latest Trends</h2>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {isGenerating ? 'AI is discovering new business opportunities...' : 'AI-powered insights updated daily'}
            </p>
          </div>
            
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 relative overflow-hidden -mt-32 pt-40" data-section="opportunities">
        {/* Unified Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
        
        {/* Decorative Wave Bridge */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background/0 via-background/40 to-background/80 pointer-events-none" />
        <svg className="absolute top-0 left-0 w-full h-24 opacity-20" preserveAspectRatio="none" viewBox="0 0 1200 120">
          <path d="M0,50 C300,20 600,80 900,50 C1050,35 1150,60 1200,50 L1200,0 L0,0 Z" fill="url(#waveGradient2)" />
          <defs>
            <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
              <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="0.15" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
        
        <div className="container mx-auto px-4 text-center relative z-10 max-w-7xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">Latest Trends</h2>
          <p className="text-muted-foreground mb-6">
            Unable to load trends at the moment. Please try again.
          </p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section 
      data-section="opportunities"
      className="py-20 relative overflow-hidden -mt-32 pt-40"
    >
      {/* Animated Background Wallpaper */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Base gradient layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
        
        {/* Animated floating elements - unique pattern for trends */}
        <div className="absolute top-20 left-[10%] w-3 h-3 bg-primary/60 rounded-full animate-float opacity-70" />
        <div className="absolute top-32 right-[15%] w-5 h-5 bg-secondary/50 rounded-full animate-spiral opacity-60" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-[25%] w-4 h-4 bg-accent/40 rounded-full animate-zigzag opacity-50" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/3 right-[20%] w-6 h-6 bg-primary/40 rounded-full animate-diagonal-float opacity-60" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-1/3 left-[15%] w-3 h-3 bg-secondary/60 rounded-full animate-orbit opacity-55" style={{ animationDelay: '3s' }} />
        <div className="absolute top-2/3 right-[30%] w-7 h-7 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full animate-figure-eight opacity-45 blur-sm" style={{ animationDelay: '2.5s' }} />
        <div className="absolute bottom-1/4 left-[35%] w-2 h-2 bg-primary/70 rounded-full animate-drift opacity-80" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/4 left-[45%] w-8 h-8 bg-gradient-to-l from-secondary/15 to-transparent rounded-full animate-spiral opacity-30 blur-md" style={{ animationDelay: '5s' }} />
        
        {/* Additional particles for depth */}
        <div className="absolute top-48 right-[40%] w-2 h-2 bg-accent/50 rounded-full animate-float-reverse opacity-70" style={{ animationDelay: '3.5s' }} />
        <div className="absolute bottom-60 right-[25%] w-4 h-4 bg-primary/45 rounded-full animate-zigzag opacity-65" style={{ animationDelay: '6s' }} />
        <div className="absolute top-80 left-[20%] w-5 h-5 bg-secondary/35 rounded-full animate-orbit opacity-50" style={{ animationDelay: '4.5s' }} />
        <div className="absolute bottom-80 right-[35%] w-6 h-6 bg-gradient-to-br from-primary/25 to-secondary/25 rounded-full animate-diagonal-float opacity-40 blur-sm" style={{ animationDelay: '7s' }} />
      </div>
      
      {/* Decorative Wave Bridge */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background/0 via-background/40 to-background/80 pointer-events-none z-10" />
      <svg className="absolute top-0 left-0 w-full h-24 opacity-20 z-10" preserveAspectRatio="none" viewBox="0 0 1200 120">
        <path d="M0,50 C300,20 600,80 900,50 C1050,35 1150,60 1200,50 L1200,0 L0,0 Z" fill="url(#waveGradient)" />
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>

      <div className="container mx-auto px-4 relative z-10 max-w-7xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <h2 className="text-4xl md:text-5xl font-bold gradient-text">
              {hasActiveFilters ? `Search Results (${displayedTrends.length})` : 'Latest Trends'}
            </h2>
          </div>
          <p className="text-muted-foreground text-lg md:text-xl">
            {hasActiveFilters 
              ? 'Filtered business opportunities matching your criteria'
              : 'AI-powered insights updated daily'
            }
          </p>
        </div>

        <CategoryTabs
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          resultCount={displayedTrends.length}
        />

        <SearchFilters
          filters={filters}
          updateFilter={updateFilter}
          clearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          resultCount={displayedTrends.length}
          onSearchChange={setSearchTerm}
          searchTerm={localSearchTerm}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayedTrends.map((trend) => (
            <TrendCard 
              key={trend.id} 
              trend={trend}
            />
          ))}
        </div>

        {displayedTrends.length === 0 && !hasActiveFilters && (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No opportunities found</h3>
            <p className="text-muted-foreground mb-4">
              Let's discover fresh business opportunities and market trends for you!
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleGenerateNew} disabled={isGenerating}>
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? 'Finding Opportunities...' : 'Discover Opportunities'}
              </Button>
              <Button onClick={handleRefresh} variant="outline" disabled={isGenerating}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        )}

        {displayedTrends.length === 0 && hasActiveFilters && (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No matching opportunities</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters to see more results
            </p>
            <Button onClick={clearFilters} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        )}

        {categoryFilteredTrends.length > 48 && (
          <div className="text-center mt-8">
            <p className="text-muted-foreground text-sm">
              Showing {displayedTrends.length} of {categoryFilteredTrends.length} opportunities
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default TrendingSection;