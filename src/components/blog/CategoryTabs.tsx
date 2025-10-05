import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Lightbulb, DollarSign, Zap, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";

export const categories = [
  { id: "all", label: "All", icon: Grid3x3 },
  { id: "ai-tech", label: "AI & Tech", icon: Sparkles },
  { id: "business", label: "Business", icon: TrendingUp },
  { id: "marketing", label: "Marketing", icon: Lightbulb },
  { id: "funding", label: "Funding", icon: DollarSign },
  { id: "productivity", label: "Productivity", icon: Zap },
];

interface CategoryTabsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  resultCount?: number;
}

const CategoryTabs = ({ selectedCategory, onCategoryChange, resultCount }: CategoryTabsProps) => {
  return (
    <div className="w-full mb-8">
      <div className="relative">
        {/* Gradient fade on edges for scroll indication */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        {/* Horizontal scrolling container */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 px-1 py-2 min-w-max">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              
              return (
                <Button
                  key={category.id}
                  onClick={() => onCategoryChange(category.id)}
                  variant={isActive ? "default" : "outline"}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap transition-all duration-200 touch-manipulation h-11 px-6",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                      : "hover:bg-muted"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{category.label}</span>
                  {isActive && resultCount !== undefined && (
                    <span className="ml-1 px-2 py-0.5 bg-primary-foreground/20 rounded-full text-xs font-semibold">
                      {resultCount}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryTabs;
