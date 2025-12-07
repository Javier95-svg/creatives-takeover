import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Gift, Home, Bot, BookOpen, TrendingUp, Users, FileText, Info, DollarSign } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  tooltip?: string;
  icon?: React.ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
}

interface TabletNavigationProps {
  navItems: NavItem[];
  onItemClick?: (itemName: string) => void;
}

// Icon mapping for navigation items
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "Home": Home,
  "BizMap AI": Bot,
  "Prompt Library": BookOpen,
  "Insighta": TrendingUp,
  "Community": Users,
  "Stories": FileText,
  "About Us": Info,
  "Pricing": DollarSign,
};

export const TabletNavigation: React.FC<TabletNavigationProps> = ({
  navItems,
  onItemClick,
}) => {
  const location = useLocation();
  const { user } = useAuth();

  const visibleItems = navItems.filter(item => !item.requiresAuth || user);

  return (
    <TooltipProvider>
      <nav className="flex items-center justify-center gap-3 lg:gap-4 px-4">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== "/" && location.pathname.startsWith(item.href));
          const Icon = item.icon || iconMap[item.name];
          
          // Color-code navigation items semantically
          let colorClass = '';
          if (item.name === 'BizMap AI' || item.name === 'Prompt Library') {
            colorClass = 'hover:text-planning';
          } else if (item.name === 'Community' || item.name === 'Stories' || item.name === 'About Us') {
            colorClass = 'hover:text-action';
          } else if (item.name === 'Insighta' || item.name === 'Pricing') {
            colorClass = 'hover:text-growth';
          } else {
            colorClass = 'hover:text-foreground';
          }

          return (
            <Tooltip key={item.name}>
              <TooltipTrigger asChild>
                <Link
                  to={item.href}
                  onClick={() => onItemClick?.(item.name)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 relative",
                    "px-3 py-2.5 rounded-lg transition-all duration-250",
                    "min-h-[48px] min-w-[60px] touch-manipulation",
                    "text-sm font-medium",
                    isActive
                      ? "text-primary bg-primary/10 shadow-sm scale-105"
                      : `text-muted-foreground ${colorClass} hover:bg-muted/50`,
                    "active:scale-95 hover:scale-105"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span className="text-[10px] leading-tight text-center max-w-[60px] truncate">
                    {item.name}
                  </span>
                </Link>
              </TooltipTrigger>
              {item.tooltip && (
                <TooltipContent>
                  <p>{item.tooltip}</p>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
};

