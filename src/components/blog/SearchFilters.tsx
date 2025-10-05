import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Filter, RotateCcw, Search, Clock, TrendingUp } from "lucide-react";
import { SearchFilters as Filters } from "@/hooks/useSearch";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SearchFiltersProps {
  filters: Filters;
  updateFilter: (key: keyof Filters, value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  resultCount: number;
  onSearchChange?: (searchTerm: string) => void;
  searchTerm?: string;
}

const SearchFilters = ({ 
  filters, 
  updateFilter, 
  clearFilters, 
  hasActiveFilters, 
  resultCount,
  onSearchChange,
  searchTerm = ""
}: SearchFiltersProps) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Popular search suggestions
  const popularSearches = [
    "AI automation",
    "SaaS business",
    "E-commerce trends",
    "Marketing strategies",
    "Startup funding",
    "Remote work tools"
  ];

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recentSearches");
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse recent searches", e);
      }
    }
  }, []);

  // Save search to recent searches
  const saveSearch = (term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearchTerm.trim()) {
      saveSearch(localSearchTerm);
      onSearchChange?.(localSearchTerm);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setLocalSearchTerm(suggestion);
    saveSearch(suggestion);
    onSearchChange?.(suggestion);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setLocalSearchTerm("");
    onSearchChange?.("");
  };
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
    <div className="mb-6 space-y-4">
      {/* Enhanced Search Bar */}
      <Card className="p-4 bg-muted/20 border-0">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by keyword, topic, or trend..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              className="pl-10 pr-10 h-11"
            />
            {localSearchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Suggestions Dropdown */}
          {showSuggestions && (localSearchTerm || recentSearches.length > 0 || popularSearches.length > 0) && (
            <Card className="absolute top-full left-0 right-0 mt-2 p-2 z-50 shadow-lg">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Recent Searches</span>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSuggestionClick(search)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              {popularSearches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    <span>Popular Searches</span>
                  </div>
                  <div className="flex flex-wrap gap-2 px-2 py-2">
                    {popularSearches.map((search, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => handleSuggestionClick(search)}
                      >
                        {search}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </form>
      </Card>

      {/* Filter Chips - Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.category !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Category: {filters.category}
              <button
                onClick={() => updateFilter("category", "all")}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.difficulty !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Difficulty: {filters.difficulty}
              <button
                onClick={() => updateFilter("difficulty", "all")}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.marketSize !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Market: {filters.marketSize}
              <button
                onClick={() => updateFilter("marketSize", "all")}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.sentiment !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Sentiment: {filters.sentiment}
              <button
                onClick={() => updateFilter("sentiment", "all")}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="text-xs h-7"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>
      )}

      {/* Advanced Filters */}
      <Card className="p-4 bg-muted/20 border-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Advanced Filters</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                {resultCount} results
              </Badge>
            )}
          </div>
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
    </div>
  );
};

export default SearchFilters;