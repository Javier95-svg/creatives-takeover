import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Filter, X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const handleScrollUp = () => {
    // Move to higher budget range
    const step = 10000; // $100 increment
    const rangeSize = filters.priceRange[1] - filters.priceRange[0];
    const newMin = Math.max(0, Math.min(filters.priceRange[0] + step, priceRangeMax - rangeSize));
    const newMax = newMin + rangeSize;
    if (newMax <= priceRangeMax) {
      onFiltersChange({
        ...filters,
        priceRange: [newMin, newMax],
      });
    }
  };

  const handleScrollDown = () => {
    // Move to lower budget range
    const step = 10000; // $100 increment
    const rangeSize = filters.priceRange[1] - filters.priceRange[0];
    const newMin = Math.max(0, filters.priceRange[0] - step);
    const newMax = newMin + rangeSize;
    if (newMin >= 0) {
      onFiltersChange({
        ...filters,
        priceRange: [newMin, newMax],
      });
    }
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
          <div className="space-y-3">
            {/* Scroll Button at Top/Beginning */}
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={handleScrollUp}
              disabled={filters.priceRange[1] >= priceRangeMax}
              className="w-full h-10 flex items-center justify-center"
            >
              <ChevronUp className="h-4 w-4 mr-2" />
              Scroll to Higher Range
            </Button>
            
            {/* Range Display */}
            <div className="text-center py-3 px-4 bg-muted/50 rounded-md">
              <span className="text-base font-semibold text-foreground">
                {priceRangeDisplay}
              </span>
            </div>

            {/* Scroll Button at Bottom/End */}
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={handleScrollDown}
              disabled={filters.priceRange[0] <= 0}
              className="w-full h-10 flex items-center justify-center"
            >
              <ChevronDown className="h-4 w-4 mr-2" />
              Scroll to Lower Range
            </Button>
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

