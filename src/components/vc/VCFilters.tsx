import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter } from "lucide-react";
import { VCFilters as VCFiltersType } from "@/types/insighta";

interface VCFiltersProps {
  filters: VCFiltersType;
  onFiltersChange: (filters: VCFiltersType) => void;
  resultCount: number;
}

const VCFilters = ({ filters, onFiltersChange, resultCount }: VCFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filters.search || "");

  const investmentStages = ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c+'];
  const industries = ['Technology', 'Healthcare', 'Fintech', 'Consumer', 'Enterprise', 'Climate'];
  const geographicFocus = ['United States', 'Europe', 'Asia', 'Global'];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const handleStageToggle = (stage: string) => {
    onFiltersChange({
      ...filters,
      investment_stage: filters.investment_stage === stage ? undefined : stage
    });
  };

  const handleIndustryToggle = (industry: string) => {
    onFiltersChange({
      ...filters,
      industry: filters.industry === industry ? undefined : industry
    });
  };

  const handleGeographicToggle = (geo: string) => {
    onFiltersChange({
      ...filters,
      geographic_focus: filters.geographic_focus === geo ? undefined : geo
    });
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    onFiltersChange({});
  };

  const hasActiveFilters = filters.investment_stage || filters.industry || filters.geographic_focus || filters.search;

  return (
    <div className="mb-8 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Search VCs by name, firm, or thesis..."
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
              {[filters.investment_stage, filters.industry, filters.geographic_focus, filters.search].filter(Boolean).length}
            </Badge>
          )}
        </Button>
        <div className="text-sm text-muted-foreground">
          {resultCount} {resultCount === 1 ? 'VC' : 'VCs'} found
        </div>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          {/* Investment Stage Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Investment Stage</label>
            <div className="flex flex-wrap gap-2">
              {investmentStages.map((stage) => (
                <Button
                  key={stage}
                  variant={filters.investment_stage === stage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStageToggle(stage)}
                  className="capitalize"
                >
                  {stage}
                </Button>
              ))}
            </div>
          </div>

          {/* Industry Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Industry</label>
            <div className="flex flex-wrap gap-2">
              {industries.map((industry) => (
                <Button
                  key={industry}
                  variant={filters.industry === industry ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleIndustryToggle(industry)}
                >
                  {industry}
                </Button>
              ))}
            </div>
          </div>

          {/* Geographic Focus Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Geographic Focus</label>
            <div className="flex flex-wrap gap-2">
              {geographicFocus.map((geo) => (
                <Button
                  key={geo}
                  variant={filters.geographic_focus === geo ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleGeographicToggle(geo)}
                >
                  {geo}
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

export default VCFilters;
