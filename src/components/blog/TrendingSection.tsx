import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, RefreshCw, Sparkles } from "lucide-react";
import TrendCard from "./TrendCard";
import { useTrends } from "@/hooks/useTrends";

const TrendingSection = () => {
  const { trends, isLoading, error, refetch, generateNewTrends } = useTrends();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  // Group trends by category
  const trendsByCategory = trends?.reduce((acc, trend) => {
    if (!acc[trend.category]) {
      acc[trend.category] = [];
    }
    acc[trend.category].push(trend);
    return acc;
  }, {} as Record<string, typeof trends>) || {};

  const categories = ['all', ...Object.keys(trendsByCategory)];
  
  const filteredTrends = selectedCategory === 'all' 
    ? trends?.slice(0, 8) || []
    : trendsByCategory[selectedCategory]?.slice(0, 6) || [];

  const handleRefresh = async () => {
    try {
      setIsGenerating(true);
      if (trends.length === 0) {
        console.log('🚀 No trends found, generating new trends...');
        await generateNewTrends();
      } else {
        console.log('🔄 Refreshing existing trends...');
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
      console.log('🚀 Manually generating new trends...');
      await generateNewTrends();
    } catch (error) {
      console.error('❌ Error generating trends:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading || isGenerating) {
    return (
      <section className="py-16 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              <h2 className="text-3xl font-bold">Trending Now</h2>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {isGenerating ? 'AI is analyzing the latest trends...' : 'AI-powered insights analyzing the latest business trends and opportunities'}
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
      <section className="py-16 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Trending Now</h2>
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
    <section className="py-16 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-bold">Trending Now</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              className="ml-2"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AI-powered insights analyzing the latest business trends and opportunities
          </p>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
          <TabsList className="grid w-full grid-cols-auto mx-auto max-w-2xl">
            {categories.map((category) => (
              <TabsTrigger 
                key={category} 
                value={category}
                className="capitalize"
              >
                {category}
                {category !== 'all' && trendsByCategory[category] && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {trendsByCategory[category].length}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredTrends.map((trend) => (
            <TrendCard 
              key={trend.id} 
              trend={trend}
              onClick={() => {
                // TODO: Open trend detail modal or navigate to trend page
                console.log('Trend clicked:', trend);
              }}
            />
          ))}
        </div>

        {filteredTrends.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No trends available</h3>
            <p className="text-muted-foreground mb-4">
              Let's analyze the latest business trends for you!
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleGenerateNew} disabled={isGenerating}>
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate Trends'}
              </Button>
              <Button onClick={handleRefresh} variant="outline" disabled={isGenerating}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default TrendingSection;