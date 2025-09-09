import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Filter, X, TrendingUp, Clock, Star, Users, MessageSquare, Sparkles } from "lucide-react";

interface AdvancedFiltersProps {
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  postType: string;
  onPostTypeChange: (type: string) => void;
  engagement: string;
  onEngagementChange: (engagement: string) => void;
  allTags: string[];
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  selectedTag,
  onTagSelect,
  sort,
  onSortChange,
  postType,
  onPostTypeChange,
  engagement,
  onEngagementChange,
  allTags
}) => {
  const clearAllFilters = () => {
    onTagSelect(null);
    onSortChange("hot");
    onPostTypeChange("all");
    onEngagementChange("all");
  };

  const hasActiveFilters = selectedTag || sort !== "hot" || postType !== "all" || engagement !== "all";

  const sortOptions = [
    { value: "hot", label: "Hot", icon: TrendingUp },
    { value: "new", label: "New", icon: Clock },
    { value: "top", label: "Top", icon: Star },
  ];

  const postTypeOptions = [
    { value: "all", label: "All Posts", icon: MessageSquare },
    { value: "success", label: "Success Stories", icon: Star },
    { value: "question", label: "Questions", icon: MessageSquare },
    { value: "update", label: "Updates", icon: TrendingUp },
    { value: "ai-enhanced", label: "AI Enhanced", icon: Sparkles },
  ];

  const engagementOptions = [
    { value: "all", label: "All Engagement", icon: Users },
    { value: "high", label: "High Engagement", icon: TrendingUp },
    { value: "medium", label: "Medium Engagement", icon: Star },
    { value: "new", label: "New Posts", icon: Clock },
  ];

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Discover
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
        {/* Sort Options */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Sort By</h4>
          <div className="grid grid-cols-1 gap-2">
            {sortOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  variant={sort === option.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onSortChange(option.value)}
                  className="justify-start"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Post Type Filter */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Post Type</h4>
          <Select value={postType} onValueChange={onPostTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select post type" />
            </SelectTrigger>
            <SelectContent>
              {postTypeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Engagement Filter */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Engagement Level</h4>
          <Select value={engagement} onValueChange={onEngagementChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select engagement" />
            </SelectTrigger>
            <SelectContent>
              {engagementOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Popular Tags */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Popular Topics</h4>
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 12).map((tag) => (
              <button
                key={tag}
                onClick={() => onTagSelect(selectedTag === tag ? null : tag)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-all hover:scale-105 ${
                  selectedTag === tag 
                    ? "bg-primary text-primary-foreground border-primary shadow-md" 
                    : "hover:bg-accent hover:text-accent-foreground border-border"
                }`}
              >
                #{tag}
                {selectedTag === tag && <X className="h-3 w-3 ml-1" />}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Community Guidelines */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="text-sm font-semibold mb-2">Community Guidelines</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Be respectful and constructive</li>
            <li>• Share genuine experiences</li>
            <li>• Help fellow entrepreneurs</li>
            <li>• No spam or excessive self-promotion</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedFilters;