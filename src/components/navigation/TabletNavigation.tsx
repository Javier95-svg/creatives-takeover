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
                    "px-2 py-2 rounded-lg transition-all duration-200",
                    "min-h-[44px] min-w-[50px] touch-manipulation",
                    "text-sm font-medium",
                    isActive
                      ? "text-primary bg-primary/10"
                      : `text-muted-foreground ${colorClass}`,
                    "active:scale-95"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span className="text-[10px] leading-tight text-center max-w-[60px] truncate">
                    {item.name}
                  </span>
                  {item.name === 'BizMap AI' && (
                    <Gift className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 text-planning animate-bounce" />
                  )}
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

