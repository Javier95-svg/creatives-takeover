import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Filter, X } from "lucide-react";
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
  priceRangeMax = 50000, // $500/hr max
  className,
}: FilterSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    `$${(filters.priceRange[0] / 100).toFixed(0)}/hr`,
    `$${(filters.priceRange[1] / 100).toFixed(0)}/hr`,
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
            Hourly Rate
          </Label>
          <div className="space-y-3">
            <Slider
              value={filters.priceRange}
              onValueChange={handlePriceRangeChange}
              min={0}
              max={priceRangeMax}
              step={500} // $5 increments
              className="w-full"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{priceRangeDisplay}</span>
            </div>
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

