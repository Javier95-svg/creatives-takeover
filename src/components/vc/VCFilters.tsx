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

  const investmentStages = ['pre-seed', 'seed', 'series-a', 'series-b'];
  const industries = ['AI', 'B2B SaaS', 'Fintech', 'Healthcare', 'Climate', 'Developer Tools', 'Consumer', 'Marketplace'];
  const geographicFocus = ['United States', 'Europe', 'India', 'Latin America', 'Southeast Asia', 'Global'];
  const ticketSizes = [
    { key: 'under-250k', label: '<$250K', min: undefined, max: 250000 },
    { key: '250k-1m', label: '$250K-$1M', min: 250000, max: 1000000 },
    { key: '1m-5m', label: '$1M-$5M', min: 1000000, max: 5000000 },
    { key: '5m-plus', label: '$5M+', min: 5000000, max: undefined },
  ];

  const selectedStages = filters.investment_stages || (filters.investment_stage ? [filters.investment_stage] : []);
  const selectedIndustries = filters.industries || (filters.industry ? [filters.industry] : []);
  const selectedGeographies = filters.geographies || (filters.geographic_focus ? [filters.geographic_focus] : []);
  const selectedTicket = filters.ticket_sizes?.[0];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const toggleMultiValue = (selected: string[], value: string) =>
    selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];

  const handleStageToggle = (stage: string) => {
    const nextStages = toggleMultiValue(selectedStages, stage);
    onFiltersChange({
      ...filters,
      investment_stage: undefined,
      investment_stages: nextStages.length > 0 ? nextStages : undefined,
    });
  };

  const handleIndustryToggle = (industry: string) => {
    const nextIndustries = toggleMultiValue(selectedIndustries, industry);
    onFiltersChange({
      ...filters,
      industry: undefined,
      industries: nextIndustries.length > 0 ? nextIndustries : undefined,
    });
  };

  const handleGeographicToggle = (geo: string) => {
    const nextGeographies = toggleMultiValue(selectedGeographies, geo);
    onFiltersChange({
      ...filters,
      geographic_focus: undefined,
      geographies: nextGeographies.length > 0 ? nextGeographies : undefined,
    });
  };

  const handleTicketToggle = (ticketKey: string) => {
    const selectedOption = ticketSizes.find((ticket) => ticket.key === ticketKey);
    const shouldClear = selectedTicket === ticketKey;

    onFiltersChange({
      ...filters,
      ticket_sizes: shouldClear ? undefined : [ticketKey],
      check_size_min: shouldClear ? undefined : selectedOption?.min,
      check_size_max: shouldClear ? undefined : selectedOption?.max,
    });
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    onFiltersChange({});
  };

  const activeFilterCount = [
    ...selectedStages,
    ...selectedIndustries,
    ...selectedGeographies,
    ...(selectedTicket ? [selectedTicket] : []),
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
              {activeFilterCount}
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

          {/* Industry Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Industry</label>
            <div className="flex flex-wrap gap-2">
              {industries.map((industry) => (
                <Button
                  key={industry}
                  variant={selectedIndustries.includes(industry) ? "default" : "outline"}
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
                  variant={selectedGeographies.includes(geo) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleGeographicToggle(geo)}
                >
                  {geo}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Ticket Size</label>
            <div className="flex flex-wrap gap-2">
              {ticketSizes.map((ticket) => (
                <Button
                  key={ticket.key}
                  variant={selectedTicket === ticket.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTicketToggle(ticket.key)}
                >
                  {ticket.label}
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
