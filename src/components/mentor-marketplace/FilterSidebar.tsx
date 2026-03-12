import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MentorFilters {
  expertise: string[];
  coachingFormat: string[]; // "8 Week Coaching Program" or "Hourly Rate Basis"
  timezone: string | null; // Selected GMT offset value (e.g., "-5", "0", "1")
}

interface FilterSidebarProps {
  filters: MentorFilters;
  onFiltersChange: (filters: MentorFilters) => void;
  availableExpertise: string[];
  availableStages: string[];
  priceRangeMax: number; // Maximum hourly rate in cents (kept for compatibility but not used)
  className?: string;
}

const EXPERTISE_OPTIONS = [
  "Product Development",
  "Growth Marketing",
  "Sales",
  "Business Development",
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

const COACHING_FORMAT_OPTIONS = [
  "8 Week Coaching Program",
  "Hourly Rate Basis",
];

export const FilterSidebar = ({
  filters,
  onFiltersChange,
  availableExpertise = EXPERTISE_OPTIONS,
  availableStages = [],
  priceRangeMax = 500000, // Kept for compatibility but not used
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

  const handleCoachingFormatToggle = (format: string) => {
    const newFormat = filters.coachingFormat.includes(format)
      ? filters.coachingFormat.filter((f) => f !== format)
      : [...filters.coachingFormat, format];
    
    onFiltersChange({
      ...filters,
      coachingFormat: newFormat,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      expertise: [],
      coachingFormat: [],
      timezone: null,
    });
  };

  const hasActiveFilters =
    filters.expertise.length > 0 ||
    filters.coachingFormat.length > 0 ||
    !!filters.timezone;

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

        {/* Coaching Format */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">
            Coaching Format
          </Label>
          <div className="space-y-2">
            {COACHING_FORMAT_OPTIONS.map((format) => (
              <div
                key={format}
                className="flex items-center space-x-2 p-2 rounded hover:bg-accent/50"
              >
                <Checkbox
                  id={`coaching-format-${format}`}
                  checked={filters.coachingFormat.includes(format)}
                  onCheckedChange={() => handleCoachingFormatToggle(format)}
                />
                <Label
                  htmlFor={`coaching-format-${format}`}
                  className="cursor-pointer flex-1 font-normal text-sm"
                >
                  {format}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

