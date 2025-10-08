import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import TrendCard from "./TrendCard";
import { useTrends } from "@/hooks/useTrends";

const FundingOpportunitiesSection = () => {
  const { trends, isLoading, error, refetch } = useTrends();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filter for funding-related opportunities
  const fundingTrends = trends.filter(trend => {
    const category = trend.category?.toLowerCase() || "";
    const keywords = trend.keywords?.map(k => k.toLowerCase()) || [];
    const title = trend.title?.toLowerCase() || "";
    const description = trend.description?.toLowerCase() || "";
    const allTerms = [category, title, description, ...keywords].join(" ");
    
    return allTerms.includes("funding") || 
           allTerms.includes("investment") || 
           allTerms.includes("accelerator") || 
           allTerms.includes("contest") ||
           allTerms.includes("grant") ||
           allTerms.includes("venture") ||
           allTerms.includes("capital") ||
           allTerms.includes("incubator");
  }).slice(0, 6); // Show max 6 funding opportunities

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

  if (isLoading) {
    return (
      <section className="py-16 px-4 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Discover Funding Opportunities
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-48 bg-muted" />
                <CardContent className="space-y-3 pt-6">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-5/6" />
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
      <section className="py-16 px-4 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-7xl">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6 text-center">
              <p className="text-destructive mb-4">Failed to load funding opportunities</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

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

        {fundingTrends.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center py-12">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                No funding opportunities available at the moment
              </p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Check for Updates
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fundingTrends.map((trend) => (
                <TrendCard 
                  key={trend.id} 
                  trend={trend}
                />
              ))}
            </div>
            
            {fundingTrends.length >= 6 && (
              <div className="text-center mt-8 text-muted-foreground flex items-center justify-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Showing {fundingTrends.length} funding opportunities</span>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default FundingOpportunitiesSection;
