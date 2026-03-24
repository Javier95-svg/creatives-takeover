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

  const stages = ['idea', 'pre-seed', 'seed', 'series-a'];
  const geographies = ['Global', 'United States', 'Europe', 'Latin America', 'Asia', 'Africa'];
  const industries = ['AI', 'B2B SaaS', 'Fintech', 'Climate', 'Healthtech', 'Deep Tech', 'Developer Tools', 'Consumer'];
  const formats = ['Remote', 'Hybrid', 'In-person'];
  const equityOptions = ['No equity', 'Program equity', 'Varies'];

  const selectedStages = filters.focus_stage || [];
  const selectedSectors = filters.sectors || (filters.industry_focus ? [filters.industry_focus] : []);
  const selectedGeographies = filters.geographies || (filters.location ? [filters.location] : []);
  const selectedFormats = filters.formats || [];
  const selectedEquity = filters.equity || [];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const toggleMultiValue = (selected: string[], value: string) =>
    selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];

  const handleStageToggle = (stage: string) => {
    const next = toggleMultiValue(selectedStages, stage);
    onFiltersChange({ ...filters, focus_stage: next.length > 0 ? next : undefined });
  };

  const handleGeographyToggle = (geography: string) => {
    const next = toggleMultiValue(selectedGeographies, geography);
    onFiltersChange({
      ...filters,
      location: undefined,
      geographies: next.length > 0 ? next : undefined,
    });
  };

  const handleIndustryToggle = (industry: string) => {
    const next = toggleMultiValue(selectedSectors, industry);
    onFiltersChange({
      ...filters,
      industry_focus: undefined,
      sectors: next.length > 0 ? next : undefined,
    });
  };

  const handleFormatToggle = (format: string) => {
    const next = toggleMultiValue(selectedFormats, format);
    onFiltersChange({ ...filters, formats: next.length > 0 ? next : undefined });
  };

  const handleEquityToggle = (equity: string) => {
    const next = toggleMultiValue(selectedEquity, equity);
    onFiltersChange({ ...filters, equity: next.length > 0 ? next : undefined });
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    onFiltersChange({});
  };

  const activeFilterCount = [
    ...selectedStages,
    ...selectedGeographies,
    ...selectedSectors,
    ...selectedFormats,
    ...selectedEquity,
    ...(filters.search ? [filters.search] : []),
  ].length;
  const hasActiveFilters = activeFilterCount > 0;

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
              {activeFilterCount}
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
          <div>
            <label className="text-sm font-medium mb-2 block">Stage</label>
            <div className="flex flex-wrap gap-2">
              {stages.map((stage) => (
                <Button
                  key={stage}
                  variant={selectedStages.includes(stage) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStageToggle(stage)}
                  className="capitalize"
                >
                  {stage.replace('-', ' ')}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Sector</label>
            <div className="flex flex-wrap gap-2">
              {industries.map((industry) => (
                <Button
                  key={industry}
                  variant={selectedSectors.includes(industry) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleIndustryToggle(industry)}
                >
                  {industry}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Geography</label>
            <div className="flex flex-wrap gap-2">
              {geographies.map((geography) => (
                <Button
                  key={geography}
                  variant={selectedGeographies.includes(geography) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleGeographyToggle(geography)}
                >
                  {geography}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Format</label>
            <div className="flex flex-wrap gap-2">
              {formats.map((format) => (
                <Button
                  key={format}
                  variant={selectedFormats.includes(format) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFormatToggle(format)}
                >
                  {format}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Equity</label>
            <div className="flex flex-wrap gap-2">
              {equityOptions.map((equity) => (
                <Button
                  key={equity}
                  variant={selectedEquity.includes(equity) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleEquityToggle(equity)}
                >
                  {equity}
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
