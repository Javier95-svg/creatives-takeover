import { Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Bot, 
  Lightbulb, 
  FlaskConical, 
  TrendingUp, 
  Users, 
  Info 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformSnippet {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  color: 'planning' | 'action' | 'growth';
}

const platformSnippets: PlatformSnippet[] = [
  {
    name: "Dashboard",
    description: "Founder control center, visualize progress",
    icon: LayoutDashboard,
    route: "/dashboard",
    color: "planning"
  },
  {
    name: "BizMap AI",
    description: "AI-powered business planning and validation",
    icon: Bot,
    route: "/bizmap-ai",
    color: "action"
  },
  {
    name: "Prompt Library",
    description: "Pre-built AI prompts for pitches, emails, interviews",
    icon: Lightbulb,
    route: "/prompt-library",
    color: "growth"
  },
  {
    name: "Product Market Fit Lab",
    description: "Validate your product in the market",
    icon: FlaskConical,
    route: "/bizmap-ai",
    color: "planning"
  },
  {
    name: "Insighta",
    description: "Curated news hub for funding and AI trends",
    icon: TrendingUp,
    route: "/insighta",
    color: "action"
  },
  {
    name: "Community",
    description: "Connect with founders, get feedback, demo days",
    icon: Users,
    route: "/community",
    color: "growth"
  },
  {
    name: "About Us",
    description: "Learn about our mission and vision",
    icon: Info,
    route: "/about",
    color: "planning"
  }
];

const HeroSnippets = () => {
  const getColorClasses = (color: 'planning' | 'action' | 'growth') => {
    const colorMap = {
      planning: {
        glass: 'glass-blue',
        border: 'border-planning/30 hover:border-planning/60',
        shadow: 'hover:shadow-lg hover:shadow-blue/20',
        icon: 'text-planning'
      },
      action: {
        glass: 'glass-red',
        border: 'border-action/30 hover:border-action/60',
        shadow: 'hover:shadow-lg hover:shadow-red/20',
        icon: 'text-action'
      },
      growth: {
        glass: 'glass-green',
        border: 'border-growth/30 hover:border-growth/60',
        shadow: 'hover:shadow-lg hover:shadow-green/20',
        icon: 'text-growth'
      }
    };
    return colorMap[color];
  };

  return (
    <div className="w-full mb-12 sm:mb-16 px-4">
      {/* Horizontal Scrollable Container */}
      <div 
        className="overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none', /* IE and Edge */
          WebkitOverflowScrolling: 'touch' /* iOS smooth scrolling */
        }}
      >
        <div className="flex gap-4 sm:gap-6 lg:gap-8 min-w-max pb-4">
          {platformSnippets.map((snippet, index) => {
            const Icon = snippet.icon;
            const colors = getColorClasses(snippet.color);
            
            return (
              <Link
                key={index}
                to={snippet.route}
                className={cn(
                  "btn-magnetic flex-shrink-0 w-[280px] sm:w-[300px]",
                  "p-4 sm:p-6 bg-card border-2 transition-all duration-300",
                  colors.glass,
                  colors.border,
                  colors.shadow,
                  "snap-start"
                )}
              >
                <div className="flex flex-col items-center text-center h-full">
                  <div className="flex justify-center mb-3">
                    <Icon className={cn("w-6 sm:w-8 h-6 sm:h-8", colors.icon)} />
                  </div>
                  <div className="text-base sm:text-lg font-semibold text-foreground mb-2">
                    {snippet.name}
                  </div>
                  <div className="text-muted-foreground text-xs sm:text-sm">
                    {snippet.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HeroSnippets;

