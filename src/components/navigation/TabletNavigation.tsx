import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { getPublicTabState } from "@/config/publicTabVisibility";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  Bot,
  BookOpen,
  TrendingUp,
  Users,
  FileText,
  Info,
  DollarSign,
  ChevronDown,
  GraduationCap,
  Handshake,
  Sparkles,
  Lock,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  tooltip?: string;
  icon?: React.ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
}

interface SubmenuItem {
  name: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface TabletNavigationProps {
  navItems: NavItem[];
  onItemClick?: (itemName: string) => void;
}

const communitySubmenu: SubmenuItem[] = [
  { name: "Find a Mentor", href: "/community", icon: GraduationCap, description: "Connect with experienced mentors" },
  { name: "Find a Co-Founder", href: "/community/co-founders", icon: Handshake, description: "Meet your business soulmate" },
  { name: "Find your Angel", href: "/community/angels", icon: Sparkles, description: "Connect with angel investors" },
];

// Icon mapping for navigation items
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "Home": Home,
  "BizMap AI": Bot,
  "Prompt Library": BookOpen,
  "Insighta": TrendingUp,
  "Community": Users,
  "More": FileText,
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
          const hasCommunitySubmenu = item.name === "Community";
          
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

          const triggerClassName = cn(
            "flex flex-col items-center justify-center gap-1 relative",
            "px-3 py-2.5 rounded-lg transition-all duration-250",
            "min-h-[48px] min-w-[60px] touch-manipulation",
            "text-sm font-medium",
            isActive
              ? "text-primary bg-primary/10 shadow-sm scale-105"
              : `text-muted-foreground ${colorClass} hover:bg-muted/50`,
            "active:scale-95 hover:scale-105"
          );

          if (hasCommunitySubmenu) {
            return (
              <DropdownMenu key={item.name}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger className={triggerClassName}>
                      {Icon && <Icon className="h-4 w-4" />}
                      <span className="flex items-center gap-1 text-[10px] leading-tight text-center max-w-[70px]">
                        <span className="truncate">{item.name}</span>
                        <ChevronDown className="h-3 w-3 flex-shrink-0" />
                      </span>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  {item.tooltip && (
                    <TooltipContent>
                      <p>{item.tooltip}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
                <DropdownMenuContent align="center" className="w-64">
	                  {communitySubmenu.map((subItem) => {
	                    const SubIcon = subItem.icon;
	                    const isSubActive = location.pathname === subItem.href || location.pathname.startsWith(`${subItem.href}/`);
                      const publicTabState = !user ? getPublicTabState(subItem.href) : 'accessible';

                      if (publicTabState === 'hidden') {
                        return null;
                      }

	                    return (
	                      <DropdownMenuItem key={subItem.href} asChild>
	                        <Link
	                          to={subItem.href}
	                          onClick={() => onItemClick?.(`${item.name} - ${subItem.name}`)}
	                          className={cn("cursor-pointer", isSubActive && "bg-primary/5")}
	                        >
                          <div className="relative mr-2">
	                            <SubIcon className={cn("h-4 w-4", publicTabState === 'locked' && "text-muted-foreground")} />
                            {publicTabState === 'locked' && (
                              <Lock className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-background text-primary" />
                            )}
                          </div>
	                          <div className="flex flex-col">
	                            <span className="font-medium">{subItem.name}</span>
	                            <span className="text-xs text-muted-foreground">
                                {publicTabState === 'locked' ? 'Sign up to unlock' : subItem.description}
                              </span>
	                          </div>
	                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          return (
            <Tooltip key={item.name}>
              <TooltipTrigger asChild>
                <Link
                  to={item.href}
                  onClick={() => onItemClick?.(item.name)}
                  className={triggerClassName}
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

