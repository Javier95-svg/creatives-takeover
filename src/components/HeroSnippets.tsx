import { Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Bot, 
  Lightbulb, 
  FlaskConical, 
  TrendingUp, 
  Users, 
  Info,
  Target,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

type SnippetColor = 'planning' | 'dashboard' | 'chat' | 'pmf' | 'prompt' | 'insighta' | 'community' | 'white';

interface PlatformSnippet {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  color: SnippetColor;
}

const platformSnippets: PlatformSnippet[] = [
  {
    name: "Business Planning",
    description: "Generate your complete business plan with market analysis in just 3 minutes",
    icon: Target,
    route: "/bizmap-ai",
    color: "planning" // blue
  },
  {
    name: "Dashboard",
    description: "Track your progress, manage tasks, and monitor your business metrics in one place",
    icon: LayoutDashboard,
    route: "/dashboard",
    color: "dashboard" // yellow - contrasts with blue
  },
  {
    name: "Insighta",
    description: "Assess your fundraising readiness, find matched investors, and discover funding opportunities",
    icon: TrendingUp,
    route: "/insighta",
    color: "insighta" // purple - contrasts with yellow
  },
  {
    name: "BizMap AI",
    description: "Get strategic business advice from your AI co-founder through conversation",
    icon: MessageSquare,
    route: "/bizmap-ai",
    color: "chat" // green - contrasts with purple
  },
  {
    name: "Prompt Library",
    description: "Access ready-to-use AI prompts for pitches, emails, and customer interviews",
    icon: Lightbulb,
    route: "/prompt-library",
    color: "pmf" // orange - contrasts with green
  },
  {
    name: "PMF Lab",
    description: "Validate your product-market fit with customer analysis and validation experiments",
    icon: FlaskConical,
    route: "/bizmap-ai",
    color: "white" // white - contrasts with orange
  },
  {
    name: "Community",
    description: "Find expert mentors and get practical guidance to streamline your startup growth",
    icon: Users,
    route: "/mentorship",
    color: "prompt" // red - contrasts with purple, and when looping back to blue also good
  }
];

const HeroSnippets = () => {
  // Duplicate snippets to create seamless infinite loop
  const duplicatedSnippets = [...platformSnippets, ...platformSnippets];

  const getColorClasses = (color: SnippetColor) => {
    const colorMap = {
      planning: {
        glass: 'glass-blue',
        border: 'border-info/50 hover:border-info/80',
        shadow: 'hover:shadow-lg hover:shadow-info/30',
        icon: 'text-info dark:text-info',
        bg: 'bg-info/15 hover:bg-info/30',
        colorName: 'blue'
      },
      dashboard: {
        glass: 'glass-green',
        border: 'border-warning/50 hover:border-warning/80',
        shadow: 'hover:shadow-lg hover:shadow-warning/30',
        icon: 'text-warning dark:text-warning',
        bg: 'bg-warning/15 hover:bg-warning/30',
        colorName: 'yellow'
      },
      chat: {
        glass: 'glass-green',
        border: 'border-success/50 hover:border-success/80',
        shadow: 'hover:shadow-lg hover:shadow-success/30',
        icon: 'text-success dark:text-success',
        bg: 'bg-success/15 hover:bg-success/30',
        colorName: 'green'
      },
      pmf: {
        glass: 'glass-red',
        border: 'border-warning/50 hover:border-warning/80',
        shadow: 'hover:shadow-lg hover:shadow-warning/30',
        icon: 'text-warning dark:text-warning',
        bg: 'bg-warning/15 hover:bg-warning/30',
        colorName: 'orange'
      },
      prompt: {
        glass: 'glass-red',
        border: 'border-destructive/50 hover:border-destructive/80',
        shadow: 'hover:shadow-lg hover:shadow-destructive/30',
        icon: 'text-destructive dark:text-destructive',
        bg: 'bg-destructive/15 hover:bg-destructive/30',
        colorName: 'red'
      },
      insighta: {
        glass: 'glass-blue',
        border: 'border-purple-500/50 hover:border-purple-500/80',
        shadow: 'hover:shadow-lg hover:shadow-purple-500/30',
        icon: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-500/15 hover:bg-purple-500/30',
        colorName: 'purple'
      },
      community: {
        glass: 'glass-red',
        border: 'border-pink-500/50 hover:border-pink-500/80',
        shadow: 'hover:shadow-lg hover:shadow-pink-500/30',
        icon: 'text-pink-600 dark:text-pink-400',
        bg: 'bg-pink-500/15 hover:bg-pink-500/30',
        colorName: 'pink'
      },
      white: {
        glass: 'glass-blue',
        border: 'border-border/60 hover:border-border/90 dark:border-border/60 dark:hover:border-border/90',
        shadow: 'hover:shadow-lg hover:shadow-gray-400/40 dark:hover:shadow-gray-500/40',
        icon: 'text-muted-foreground dark:text-muted-foreground',
        bg: 'bg-gray-400/15 hover:bg-gray-400/25 dark:bg-gray-500/15 dark:hover:bg-gray-500/25',
        colorName: 'white'
      }
    };
    return colorMap[color];
  };

  return (
    <div className="w-full mb-12 sm:mb-16 px-4">
      {/* Auto-Scrolling Container with CSS Animation */}
      <div className="relative overflow-hidden -mx-4 sm:-mx-6 px-4 sm:px-6">
        <style>{`
          @keyframes scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(calc(-50% - 1rem));
            }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-8px);
            }
          }
          @keyframes pulse-glow {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }
          .auto-scroll {
            animation: scroll 60s linear infinite;
          }
          .auto-scroll:hover {
            animation-play-state: paused;
          }
          .snippet-card {
            animation: fadeInUp 0.6s ease-out backwards;
          }
          .snippet-card:hover {
            transform: translateY(-8px) scale(1.02);
          }
          .snippet-icon {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .snippet-card:hover .snippet-icon {
            transform: scale(1.15) rotate(5deg);
            animation: float 2s ease-in-out infinite;
          }
        `}</style>
        <div 
          className="flex gap-4 sm:gap-6 lg:gap-8 auto-scroll"
          style={{ width: 'max-content' }}
        >
          {duplicatedSnippets.map((snippet, index) => {
            const Icon = snippet.icon;
            const colors = getColorClasses(snippet.color);
            const animationDelay = (index % platformSnippets.length) * 0.1;
            
            return (
              <Link
                key={`${snippet.name}-${index}`}
                to={snippet.route}
                className={cn(
                  "snippet-card btn-magnetic flex-shrink-0 w-[280px] sm:w-[300px]",
                  "h-[200px] sm:h-[220px]",
                  "p-4 sm:p-6 bg-card border-2 transition-all duration-500",
                  "flex flex-col items-center justify-center text-center",
                  "relative overflow-hidden group",
                  colors.glass,
                  colors.border,
                  colors.shadow
                )}
                style={{ 
                  animationDelay: `${animationDelay}s`,
                  background: `linear-gradient(135deg, ${colors.bg.split(' ')[0]}/10, transparent)`
                }}
              >
                {/* Animated background gradient on hover */}
                <div className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                  colors.bg
                )} />
                
                {/* Icon with animation */}
                <div className="flex justify-center mb-3 relative z-10">
                  <div className={cn(
                    "p-3 rounded-lg transition-all duration-300",
                    colors.bg
                  )}>
                    <Icon className={cn("snippet-icon w-6 sm:w-8 h-6 sm:h-8", colors.icon)} />
                  </div>
                </div>
                
                {/* Content */}
                <div className="relative z-10 w-full">
                  <div className="text-base sm:text-lg font-semibold text-foreground mb-2 group-hover:text-foreground transition-colors">
                    {snippet.name}
                  </div>
                  <div className="text-muted-foreground text-xs sm:text-sm group-hover:text-foreground/80 transition-colors leading-relaxed">
                    {snippet.description}
                  </div>
                </div>
                
                {/* Enhanced glow effect on hover */}
                <div className="absolute -inset-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-md -z-10" style={{
                  background: colors.colorName === 'blue' ? 'rgba(59, 130, 246, 0.4)' :
                              colors.colorName === 'yellow' ? 'rgba(234, 179, 8, 0.4)' :
                              colors.colorName === 'green' ? 'rgba(34, 197, 94, 0.4)' :
                              colors.colorName === 'orange' ? 'rgba(249, 115, 22, 0.4)' :
                              colors.colorName === 'red' ? 'rgba(239, 68, 68, 0.4)' :
                              colors.colorName === 'purple' ? 'rgba(168, 85, 247, 0.4)' :
                              colors.colorName === 'pink' ? 'rgba(236, 72, 153, 0.4)' :
                              'rgba(156, 163, 175, 0.4)'
                }} />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HeroSnippets;

