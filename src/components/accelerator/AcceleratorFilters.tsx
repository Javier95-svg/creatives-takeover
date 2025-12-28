import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter } from "lucide-react";
import { AcceleratorFilters as AcceleratorFiltersType } from "@/types/insighta";

interface AcceleratorFiltersProps {
  filters: AcceleratorFiltersType;
  onFiltersChange: (filters: AcceleratorFiltersType) => void;
  resultCount: number;
}

const AcceleratorFilters = ({ filters, onFiltersChange, resultCount }: AcceleratorFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filters.search || "");

  const locations = ['United States', 'Europe', 'Asia', 'Global', 'Remote'];
  const industries = ['Technology', 'Healthcare', 'Fintech', 'Consumer', 'Climate', 'AI/ML'];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const handleLocationToggle = (location: string) => {
    onFiltersChange({
      ...filters,
      location: filters.location === location ? undefined : location
    });
  };

  const handleIndustryToggle = (industry: string) => {
    onFiltersChange({
      ...filters,
      industry_focus: filters.industry_focus === industry ? undefined : industry
    });
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    onFiltersChange({});
  };

  const hasActiveFilters = filters.location || filters.industry_focus || filters.search;

  return (
    <div className="mb-8 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Search accelerators..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10"
        />
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1">
              {[filters.location, filters.industry_focus, filters.search].filter(Boolean).length}
            </Badge>
          )}
        </Button>
        <div className="text-sm text-muted-foreground">
          {resultCount} {resultCount === 1 ? 'accelerator' : 'accelerators'} found
        </div>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          {/* Location Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Location</label>
            <div className="flex flex-wrap gap-2">
              {locations.map((location) => (
                <Button
                  key={location}
                  variant={filters.location === location ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleLocationToggle(location)}
                >
                  {location}
                </Button>
              ))}
            </div>
          </div>

          {/* Industry Focus Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Industry Focus</label>
            <div className="flex flex-wrap gap-2">
              {industries.map((industry) => (
                <Button
                  key={industry}
                  variant={filters.industry_focus === industry ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleIndustryToggle(industry)}
                >
                  {industry}
                </Button>
              ))}
            </div>
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

export default AcceleratorFilters;
