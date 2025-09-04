import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter, RotateCcw } from "lucide-react";
import { SearchFilters as Filters } from "@/hooks/useSearch";

interface SearchFiltersProps {
  filters: Filters;
  updateFilter: (key: keyof Filters, value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  resultCount: number;
}

const SearchFilters = ({ 
  filters, 
  updateFilter, 
  clearFilters, 
  hasActiveFilters, 
  resultCount 
}: SearchFiltersProps) => {
  const categories = [
    { value: "all", label: "All Categories" },
    { value: "business", label: "Business" },
    { value: "technology", label: "Technology" },
    { value: "finance", label: "Finance" },
    { value: "healthcare", label: "Healthcare" },
    { value: "education", label: "Education" },
    { value: "sustainability", label: "Sustainability" },
    { value: "retail", label: "Retail" },
    { value: "entertainment", label: "Entertainment" }
  ];

  const difficulties = [
    { value: "all", label: "Any Difficulty" },
    { value: "easy", label: "Easy (1-3)" },
    { value: "medium", label: "Medium (4-6)" },
    { value: "hard", label: "Hard (7-10)" }
  ];

  const marketSizes = [
    { value: "all", label: "Any Market Size" },
    { value: "small", label: "Small Market" },
    { value: "medium", label: "Medium Market" },
    { value: "large", label: "Large Market" },
    { value: "unknown", label: "Unknown" }
  ];

  const sentiments = [
    { value: "all", label: "Any Sentiment" },
    { value: "positive", label: "Positive" },
    { value: "neutral", label: "Neutral" },
    { value: "negative", label: "Negative" }
  ];

  const sortOptions = [
    { value: "opportunity_score", label: "Opportunity Score" },
    { value: "trend_score", label: "Trend Score" },
    { value: "created_at", label: "Most Recent" },
    { value: "difficulty", label: "Easiest First" },
    { value: "title", label: "Alphabetical" }
  ];

  return (
    <Card className="p-4 mb-6 bg-muted/20 border-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              {resultCount} results
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="text-xs h-8"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <Select value={filters.category} onValueChange={(value) => updateFilter("category", value)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.difficulty} onValueChange={(value) => updateFilter("difficulty", value)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            {difficulties.map(diff => (
              <SelectItem key={diff.value} value={diff.value}>
                {diff.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.marketSize} onValueChange={(value) => updateFilter("marketSize", value)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Market Size" />
          </SelectTrigger>
          <SelectContent>
            {marketSizes.map(size => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sentiment} onValueChange={(value) => updateFilter("sentiment", value)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Sentiment" />
          </SelectTrigger>
          <SelectContent>
            {sentiments.map(sent => (
              <SelectItem key={sent.value} value={sent.value}>
                {sent.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sortBy} onValueChange={(value) => updateFilter("sortBy", value)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map(sort => (
              <SelectItem key={sort.value} value={sort.value}>
                {sort.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
};

export default SearchFilters;