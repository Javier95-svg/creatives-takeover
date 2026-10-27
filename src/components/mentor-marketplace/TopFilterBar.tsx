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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, ChevronDown } from "lucide-react";
import { MentorFilters } from "./FilterSidebar";
import { cn } from "@/lib/utils";
import { TIMEZONE_OPTIONS } from "@/utils/mentorTimezone";
import { MENTOR_LANGUAGE_OPTIONS, MENTOR_STARTUP_STAGES } from "@/data/mentorTraits";

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

  const handleCoachingFormatToggle = (format: string) => {
    const newFormat = filters.coachingFormat.includes(format)
      ? filters.coachingFormat.filter((f) => f !== format)
      : [...filters.coachingFormat, format];
    onFiltersChange({ ...filters, coachingFormat: newFormat });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      expertise: [],
      coachingFormat: [],
      timezone: null,
      industries: [], languages: [], startupStages: [], location: null, maxRate: null,
    });
  };

  const handleTimezoneChange = (value: string) => {
    onFiltersChange({
      ...filters,
      timezone: value === "any" ? null : value,
    });
  };

  const hasActiveFilters =
    filters.expertise.length > 0 ||
    filters.coachingFormat.length > 0 ||
    !!filters.timezone || Boolean(filters.industries?.length) || Boolean(filters.languages?.length) || Boolean(filters.startupStages?.length) || Boolean(filters.location) || Boolean(filters.maxRate);

  const expertiseCount = filters.expertise.length;
  const coachingFormatCount = filters.coachingFormat.length;
  const hasTimezoneFilter = !!filters.timezone;
  const traitCount = (filters.industries?.length || 0) + (filters.languages?.length || 0) + (filters.startupStages?.length || 0) + (filters.location ? 1 : 0) + (filters.maxRate ? 1 : 0);
  const toggleArray = (field: 'languages' | 'startupStages', value: string) => {
    const current = filters[field] || [];
    onFiltersChange({ ...filters, [field]: current.includes(value) ? current.filter(item => item !== value) : [...current, value] });
  };

  return (
    <div className="responsive-filter-row flex flex-wrap items-center gap-3 mb-6">
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
        <PopoverContent className="w-[300px] sm:w-80" align="start">
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

      {/* Coaching Format Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-9",
              coachingFormatCount > 0 && "border-primary bg-primary/5"
            )}
          >
            Coaching Format
            {coachingFormatCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {coachingFormatCount}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Coaching Format</Label>
              {coachingFormatCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFiltersChange({ ...filters, coachingFormat: [] })}
                >
                  Clear
                </Button>
              )}
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-format-8week"
                  checked={filters.coachingFormat.includes("8 Week Coaching Program")}
                  onCheckedChange={() => handleCoachingFormatToggle("8 Week Coaching Program")}
                />
                <Label
                  htmlFor="filter-format-8week"
                  className="font-normal cursor-pointer flex-1"
                >
                  8 Week Coaching Program
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-format-hourly"
                  checked={filters.coachingFormat.includes("Hourly Rate Basis")}
                  onCheckedChange={() => handleCoachingFormatToggle("Hourly Rate Basis")}
                />
                <Label
                  htmlFor="filter-format-hourly"
                  className="font-normal cursor-pointer flex-1"
                >
                  Hourly Rate Basis
                </Label>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild><Button variant="outline" className={cn('h-9', traitCount > 0 && 'border-primary bg-primary/5')}>Traits{traitCount > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5">{traitCount}</Badge>}<ChevronDown className="ml-2 h-4 w-4" /></Button></PopoverTrigger>
        <PopoverContent className="w-80" align="start"><div className="space-y-4">
          <div className="flex items-center justify-between"><Label className="font-semibold">Languages and startup stages</Label>{traitCount > 0 && <Button variant="ghost" size="sm" onClick={() => onFiltersChange({ ...filters, industries: [], languages: [], startupStages: [], location: null, maxRate: null })}>Clear</Button>}</div>
          {(filters.industries?.length || filters.location || filters.maxRate) && <div className="flex flex-wrap gap-1">{filters.industries?.map(value => <Badge key={value} variant="outline">{value}</Badge>)}{filters.location && <Badge variant="outline">{filters.location}</Badge>}{filters.maxRate && <Badge variant="outline">Max {Math.round(filters.maxRate / 100)}/hour</Badge>}</div>}
          <Separator /><Label className="text-xs uppercase text-muted-foreground">Languages</Label><div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto">{MENTOR_LANGUAGE_OPTIONS.map(([code, label]) => <label key={code} className="flex items-center gap-2 text-sm"><Checkbox checked={filters.languages?.includes(code)} onCheckedChange={() => toggleArray('languages', code)} />{label}</label>)}</div>
          <Separator /><Label className="text-xs uppercase text-muted-foreground">Startup stages</Label><div className="grid grid-cols-2 gap-2">{MENTOR_STARTUP_STAGES.map(stage => <label key={stage} className="flex items-center gap-2 text-sm"><Checkbox checked={filters.startupStages?.includes(stage)} onCheckedChange={() => toggleArray('startupStages', stage)} />{stage}</label>)}</div>
        </div></PopoverContent>
      </Popover>

      {/* Time Zone Filter */}
      <Select value={filters.timezone ?? "any"} onValueChange={handleTimezoneChange}>
        <SelectTrigger
          className={cn(
            "h-9 w-full sm:w-[320px] max-w-full text-sm font-medium",
            hasTimezoneFilter && "border-primary bg-primary/5"
          )}
        >
          <SelectValue placeholder="Timezone" />
        </SelectTrigger>
        <SelectContent className="w-[min(92vw,420px)]">
          <SelectItem value="any">Timezone (Any)</SelectItem>
          {TIMEZONE_OPTIONS.map((timezone) => (
            <SelectItem key={timezone.value} value={timezone.value}>
              {timezone.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
      <div className="responsive-sort-group ml-auto flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="responsive-sort-trigger w-full sm:w-[180px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
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

