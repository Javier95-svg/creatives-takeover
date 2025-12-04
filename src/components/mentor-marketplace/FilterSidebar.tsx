import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Filter, X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface MentorFilters {
  expertise: string[];
  priceRange: [number, number]; // In cents [min, max]
  stage: string[];
  availableNow: boolean;
}

interface FilterSidebarProps {
  filters: MentorFilters;
  onFiltersChange: (filters: MentorFilters) => void;
  availableExpertise: string[];
  availableStages: string[];
  priceRangeMax: number; // Maximum hourly rate in cents
  className?: string;
}

const EXPERTISE_OPTIONS = [
  "Product Development",
  "Marketing & Growth",
  "Sales & Business Development",
  "Fundraising",
  "Operations",
  "Strategy",
  "Finance",
  "Legal",
  "HR & Team Building",
  "Technology",
  "Design",
  "Content Creation",
];

const STAGE_OPTIONS = [
  "Idea Stage",
  "Pre-Seed",
  "Seed",
  "Series A",
  "Series B+",
];

export const FilterSidebar = ({
  filters,
  onFiltersChange,
  availableExpertise = EXPERTISE_OPTIONS,
  availableStages = STAGE_OPTIONS,
  priceRangeMax = 500000, // $5000 max for 8-week program
  className,
}: FilterSidebarProps) => {
  const handleExpertiseToggle = (expertise: string) => {
    const newExpertise = filters.expertise.includes(expertise)
      ? filters.expertise.filter((e) => e !== expertise)
      : [...filters.expertise, expertise];
    
    onFiltersChange({
      ...filters,
      expertise: newExpertise,
    });
  };

  const handleStageToggle = (stage: string) => {
    const newStage = filters.stage.includes(stage)
      ? filters.stage.filter((s) => s !== stage)
      : [...filters.stage, stage];
    
    onFiltersChange({
      ...filters,
      stage: newStage,
    });
  };

  const handlePriceRangeChange = (values: number[]) => {
    onFiltersChange({
      ...filters,
      priceRange: [values[0], values[1]],
    });
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
    onFiltersChange({
      ...filters,
      availableNow: checked,
    });
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

  const priceRangeDisplay = [
    `$${(filters.priceRange[0] / 100).toFixed(0)}`,
    `$${(filters.priceRange[1] / 100).toFixed(0)}`,
  ].join(" - ");

  return (
    <Card className={cn("sticky top-4", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Price Range */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">
            Coaching Program Fee
          </Label>
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
              step={100} // $1 increments for smoother control
              className="w-full"
            />
          </div>
        </div>

        <Separator />

        {/* Expertise */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">
            Expertise
          </Label>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {availableExpertise.map((expertise) => (
              <div
                key={expertise}
                className="flex items-center space-x-2 p-2 rounded hover:bg-accent/50"
              >
                <Checkbox
                  id={`expertise-${expertise}`}
                  checked={filters.expertise.includes(expertise)}
                  onCheckedChange={() => handleExpertiseToggle(expertise)}
                />
                <Label
                  htmlFor={`expertise-${expertise}`}
                  className="cursor-pointer flex-1 font-normal text-sm"
                >
                  {expertise}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Stage */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">
            Stage Focus
          </Label>
          <div className="space-y-2">
            {availableStages.map((stage) => (
              <div
                key={stage}
                className="flex items-center space-x-2 p-2 rounded hover:bg-accent/50"
              >
                <Checkbox
                  id={`stage-${stage}`}
                  checked={filters.stage.includes(stage)}
                  onCheckedChange={() => handleStageToggle(stage)}
                />
                <Label
                  htmlFor={`stage-${stage}`}
                  className="cursor-pointer flex-1 font-normal text-sm"
                >
                  {stage}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Availability */}
        <div>
          <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent/50">
            <Checkbox
              id="available-now"
              checked={filters.availableNow}
              onCheckedChange={handleAvailableNowToggle}
            />
            <Label
              htmlFor="available-now"
              className="cursor-pointer flex-1 font-normal text-sm"
            >
              Available Now
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

