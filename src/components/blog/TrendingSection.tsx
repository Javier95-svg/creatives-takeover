import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import TrendCard from "./TrendCard";
import SearchFilters from "./SearchFilters";
import { useTrends } from "@/hooks/useTrends";
import { useSearch } from "@/hooks/useSearch";

interface TrendingSectionProps {
  searchTerm?: string;
}

const TrendingSection = ({ searchTerm }: TrendingSectionProps) => {
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

  // Update local search when prop changes
  React.useEffect(() => {
    if (searchTerm !== undefined) {
      setSearchTerm(searchTerm);
    }
  }, [searchTerm, setSearchTerm]);

  // Show maximum of 12 articles after filtering
  const displayedTrends = filteredTrends.slice(0, 12);

  const handleRefresh = async () => {
    try {
      setIsGenerating(true);
      if (trends.length === 0) {
        console.log('🚀 No articles found, finding new articles...');
        await generateNewTrends();
      } else {
        console.log('🔄 Refreshing existing articles...');
        await refetch();
      }
    } catch (error) {
      console.error('❌ Error during refresh:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateNew = async () => {
    try {
      setIsGenerating(true);
      console.log('🚀 Manually finding new articles...');
      await generateNewTrends();
    } catch (error) {
      console.error('❌ Error finding articles:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading || isGenerating) {
    return (
      <section className="py-12 bg-gradient-to-b from-muted/30 to-background" data-section="opportunities">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              <h2 className="text-3xl font-bold">Latest Opportunities</h2>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {isGenerating ? 'AI is discovering new business opportunities...' : 'Freshly discovered business opportunities with AI-generated insights'}
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
      <section className="py-12 bg-gradient-to-b from-muted/30 to-background" data-section="opportunities">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Latest Opportunities</h2>
          <p className="text-muted-foreground mb-6">
            Unable to load opportunities at the moment. Please try again.
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
    <section className="py-12 bg-gradient-to-b from-muted/30 to-background" data-section="opportunities">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-bold">
              {hasActiveFilters ? `Search Results (${displayedTrends.length})` : 'Latest Opportunities'}
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              className="ml-2"
              disabled={isGenerating}
            >
              <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {hasActiveFilters 
              ? 'Filtered business opportunities matching your criteria'
              : 'Freshly discovered business opportunities with AI-generated market analysis and action plans'
            }
          </p>
        </div>

        <SearchFilters
          filters={filters}
          updateFilter={updateFilter}
          clearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          resultCount={displayedTrends.length}
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

        {filteredTrends.length > 12 && (
          <div className="text-center mt-8">
            <p className="text-muted-foreground text-sm">
              Showing {displayedTrends.length} of {filteredTrends.length} opportunities
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default TrendingSection;