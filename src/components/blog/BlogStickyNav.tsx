import React, { useState } from "react";
import { categories } from "./CategoryTabs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface BlogStickyNavProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onSearchClick?: () => void;
}

const BlogStickyNav: React.FC<BlogStickyNavProps> = ({ 
  selectedCategory, 
  onCategoryChange,
  onSearchClick 
}) => {
  return (
    <nav 
      aria-label="Blog category navigation" 
      className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 shadow-sm"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide">
          {/* Category Navigation */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => onCategoryChange(category.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 touch-manipulation",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" 
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Button */}
          {onSearchClick && (
            <Button
              onClick={onSearchClick}
              variant="outline"
              size="sm"
              className="ml-auto shrink-0"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default BlogStickyNav;
