import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Home, Bot, BookOpen, TrendingUp, Users, FileText, Info, DollarSign } from "lucide-react";

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
      <nav className="flex items-center justify-center gap-1 px-1.5">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== "/" && location.pathname.startsWith(item.href));
          const Icon = item.icon || iconMap[item.name];

          return (
            <Tooltip key={item.name}>
              <TooltipTrigger asChild>
                <Link
                  to={item.href}
                  onClick={() => onItemClick?.(item.name)}
                  className={cn(
                    "relative flex min-h-[48px] min-w-[64px] touch-manipulation flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 transition-all duration-200",
                    "text-sm font-medium tracking-[0.01em]",
                    isActive
                      ? "nav-active-indicator active bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.22)]"
                      : "text-muted-foreground hover:bg-muted/55 hover:text-foreground",
                    "nav-item-hover-effect active:scale-95"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span className="max-w-[60px] truncate text-center text-[10px] leading-tight">
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

