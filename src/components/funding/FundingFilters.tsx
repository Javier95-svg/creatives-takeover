import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter } from "lucide-react";
import { FundingType, FundingFilters as FundingFiltersType } from "@/types/funding";
import { HelpTooltip } from "@/components/ui/HelpTooltip";

interface FundingFiltersProps {
  filters: FundingFiltersType;
  onFiltersChange: (filters: FundingFiltersType) => void;
  availableLocations: string[];
  resultCount: number;
}

const FundingFilters = ({ 
  filters, 
  onFiltersChange, 
  availableLocations, 
  resultCount 
}: FundingFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filters.search || "");

  const fundingTypes: FundingType[] = ['grant', 'accelerator', 'contest', 'microfund'];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const handleTypeToggle = (type: FundingType) => {
    if (filters.type === type) {
      onFiltersChange({ ...filters, type: undefined });
    } else {
      onFiltersChange({ ...filters, type });
    }
  };

  const handleLocationToggle = (location: string) => {
    if (filters.location === location) {
      onFiltersChange({ ...filters, location: undefined });
    } else {
      onFiltersChange({ ...filters, location });
    }
  };

  const handleFeaturedToggle = () => {
    onFiltersChange({ ...filters, featured: filters.featured ? undefined : true });
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    onFiltersChange({});
  };

  const hasActiveFilters = filters.type || filters.location || filters.search || filters.featured;

  return (
    <div className="mb-8 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Search funding opportunities..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10"
          aria-label="Search funding opportunities"
          aria-describedby="search-help"
        />
        <span id="search-help" className="sr-only">
          Search by title, description, or keywords. Results update as you type.
        </span>
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => handleSearch("")}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Filter Toggle & Results Count */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
            aria-label={showFilters ? 'Hide filters' : 'Show filters'}
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1">
                {[filters.type, filters.location, filters.search, filters.featured].filter(Boolean).length}
              </Badge>
            )}
          </Button>
          <HelpTooltip
            content="Filter funding opportunities by type (grant, accelerator, contest, microfund), location, or search by keywords. Featured opportunities are highlighted."
            side="bottom"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {resultCount} {resultCount === 1 ? 'opportunity' : 'opportunities'} found
        </div>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          {/* Type Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block" id="type-filter-label">
              Type
            </label>
            <div 
              className="flex flex-wrap gap-2"
              role="group"
              aria-labelledby="type-filter-label"
            >
              {fundingTypes.map((type) => (
                <Button
                  key={type}
                  variant={filters.type === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTypeToggle(type)}
                  className="capitalize"
                  aria-pressed={filters.type === type}
                  aria-label={`Filter by ${type} funding type`}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Location Filter */}
          {availableLocations.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block" id="location-filter-label">
                Location
              </label>
              <div 
                className="flex flex-wrap gap-2 max-h-32 overflow-y-auto"
                role="group"
                aria-labelledby="location-filter-label"
              >
                {availableLocations.map((location) => (
                  <Button
                    key={location}
                    variant={filters.location === location ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleLocationToggle(location)}
                    aria-pressed={filters.location === location}
                    aria-label={`Filter by ${location} location`}
                  >
                    {location}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Featured Filter */}
          <div>
            <Button
              variant={filters.featured ? "default" : "outline"}
              size="sm"
              onClick={handleFeaturedToggle}
            >
              ⭐ Featured Only
            </Button>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Clear All Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default FundingFilters;

