import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { MentorFilters } from "./FilterSidebar";
import { cn } from "@/lib/utils";

interface TopFilterBarProps {
  filters: MentorFilters;
  onFiltersChange: (filters: MentorFilters) => void;
  availableExpertise: string[];
  availableStages: string[];
  priceRangeMax: number;
  mentorCount: number;
  onSortChange: (sort: string) => void;
  sortBy: string;
}

export const TopFilterBar = ({
  filters,
  onFiltersChange,
  availableExpertise,
  availableStages,
  priceRangeMax,
  mentorCount,
  onSortChange,
  sortBy,
}: TopFilterBarProps) => {
  const handleExpertiseToggle = (expertise: string) => {
    const newExpertise = filters.expertise.includes(expertise)
      ? filters.expertise.filter((e) => e !== expertise)
      : [...filters.expertise, expertise];
    onFiltersChange({ ...filters, expertise: newExpertise });
  };

  const handleStageToggle = (stage: string) => {
    const newStages = filters.stage.includes(stage)
      ? filters.stage.filter((s) => s !== stage)
      : [...filters.stage, stage];
    onFiltersChange({ ...filters, stage: newStages });
  };

  const handlePriceRangeChange = (values: number[]) => {
    onFiltersChange({ ...filters, priceRange: [values[0], values[1]] });
  };

  const handleMinPriceChange = (newMin: number) => {
    const clampedMin = Math.max(0, Math.min(newMin, filters.priceRange[1] - 100));
    onFiltersChange({
      ...filters,
      priceRange: [clampedMin, filters.priceRange[1]],
    });
  };

  const handleMaxPriceChange = (newMax: number) => {
    const clampedMax = Math.max(filters.priceRange[0] + 100, Math.min(newMax, priceRangeMax));
    onFiltersChange({
      ...filters,
      priceRange: [filters.priceRange[0], clampedMax],
    });
  };

  const handleAvailableNowToggle = (checked: boolean) => {
    onFiltersChange({ ...filters, availableNow: checked });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      expertise: [],
      priceRange: [0, priceRangeMax],
      stage: [],
      availableNow: false,
    });
  };

  const hasActiveFilters =
    filters.expertise.length > 0 ||
    filters.stage.length > 0 ||
    filters.availableNow ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < priceRangeMax;

  const expertiseCount = filters.expertise.length;
  const stageCount = filters.stage.length;
  const hasPriceFilter = filters.priceRange[0] > 0 || filters.priceRange[1] < priceRangeMax;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Expertise Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-9",
              expertiseCount > 0 && "border-primary bg-primary/5"
            )}
          >
            Expertise
            {expertiseCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {expertiseCount}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Expertise</Label>
              {expertiseCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onFiltersChange({ ...filters, expertise: [] })
                  }
                >
                  Clear
                </Button>
              )}
            </div>
            <Separator />
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {availableExpertise.map((expertise) => (
                <div
                  key={expertise}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={`filter-expertise-${expertise}`}
                    checked={filters.expertise.includes(expertise)}
                    onCheckedChange={() => handleExpertiseToggle(expertise)}
                  />
                  <Label
                    htmlFor={`filter-expertise-${expertise}`}
                    className="font-normal cursor-pointer flex-1"
                  >
                    {expertise}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Price Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-9",
              hasPriceFilter && "border-primary bg-primary/5"
            )}
          >
            Program Fee
            {hasPriceFilter && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {`$${(filters.priceRange[0] / 100).toFixed(0)} - $${(filters.priceRange[1] / 100).toFixed(0)}`}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <Label className="font-semibold">Coaching Program Fee</Label>
            <Separator />
            <div className="space-y-4">
              {/* Price Inputs with Scroll Buttons */}
              <div className="grid grid-cols-2 gap-3">
                {/* Minimum Price */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Min Budget</Label>
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-8 rounded-b-none border-b-0 p-0"
                        onClick={() => handleMinPriceChange(filters.priceRange[0] + 100)}
                        disabled={filters.priceRange[0] >= filters.priceRange[1] - 100}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-8 rounded-t-none p-0"
                        onClick={() => handleMinPriceChange(filters.priceRange[0] - 100)}
                        disabled={filters.priceRange[0] <= 0}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={(filters.priceRange[0] / 100).toFixed(0)}
                        onChange={(e) => {
                          const value = Math.max(0, Math.min(parseInt(e.target.value) || 0, (filters.priceRange[1] / 100) - 1));
                          handleMinPriceChange(value * 100);
                        }}
                        min={0}
                        max={(filters.priceRange[1] / 100) - 1}
                        className="pl-7 h-10 text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Maximum Price */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Max Budget</Label>
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-8 rounded-b-none border-b-0 p-0"
                        onClick={() => handleMaxPriceChange(filters.priceRange[1] + 100)}
                        disabled={filters.priceRange[1] >= priceRangeMax}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-8 rounded-t-none p-0"
                        onClick={() => handleMaxPriceChange(filters.priceRange[1] - 100)}
                        disabled={filters.priceRange[1] <= filters.priceRange[0] + 100}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={(filters.priceRange[1] / 100).toFixed(0)}
                        onChange={(e) => {
                          const value = Math.max((filters.priceRange[0] / 100) + 1, Math.min(parseInt(e.target.value) || priceRangeMax / 100, priceRangeMax / 100));
                          handleMaxPriceChange(value * 100);
                        }}
                        min={(filters.priceRange[0] / 100) + 1}
                        max={priceRangeMax / 100}
                        className="pl-7 h-10 text-sm"
                        placeholder="5000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Range Display */}
              <div className="text-center py-2 px-3 bg-muted/50 rounded-md">
                <span className="text-sm font-medium text-foreground">
                  ${(filters.priceRange[0] / 100).toFixed(0)} - ${(filters.priceRange[1] / 100).toFixed(0)}
                </span>
              </div>

              {/* Slider */}
              <Slider
                value={filters.priceRange}
                onValueChange={handlePriceRangeChange}
                min={0}
                max={priceRangeMax}
                step={100}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Availability Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-9",
              filters.availableNow && "border-primary bg-primary/5"
            )}
          >
            Availability
            {filters.availableNow && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                Available now
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-4">
            <Label className="font-semibold">Availability</Label>
            <Separator />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-available"
                checked={filters.availableNow}
                onCheckedChange={handleAvailableNowToggle}
              />
              <Label htmlFor="filter-available" className="font-normal cursor-pointer">
                Available Now
              </Label>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Stage Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-9",
              stageCount > 0 && "border-primary bg-primary/5"
            )}
          >
            Stage
            {stageCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {stageCount}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Stage Focus</Label>
              {stageCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFiltersChange({ ...filters, stage: [] })}
                >
                  Clear
                </Button>
              )}
            </div>
            <Separator />
            <div className="space-y-2">
              {availableStages.map((stage) => (
                <div key={stage} className="flex items-center space-x-2">
                  <Checkbox
                    id={`filter-stage-${stage}`}
                    checked={filters.stage.includes(stage)}
                    onCheckedChange={() => handleStageToggle(stage)}
                  />
                  <Label
                    htmlFor={`filter-stage-${stage}`}
                    className="font-normal cursor-pointer flex-1"
                  >
                    {stage}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear All */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="h-9 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear all
        </Button>
      )}

      {/* Sort */}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recommended">Our top picks</SelectItem>
            <SelectItem value="rating">Highest rated</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="newest">Newest first</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

