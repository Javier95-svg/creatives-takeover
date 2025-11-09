import React from "react";
import { categories } from "./CategoryTabs";
import { cn } from "@/lib/utils";

interface BlogStickyNavProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const BlogStickyNav: React.FC<BlogStickyNavProps> = ({ 
  selectedCategory, 
  onCategoryChange
}) => {
  return (
    <nav 
      aria-label="Blog category navigation" 
      className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 shadow-sm"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide">
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
      </div>
    </nav>
  );
};

export default BlogStickyNav;
