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

type SnippetColor = 'planning' | 'dashboard' | 'chat' | 'pmf' | 'prompt' | 'insighta' | 'community';

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
    color: "planning"
  },
  {
    name: "Dashboard",
    description: "Track your progress, manage tasks, and monitor your business metrics in one place",
    icon: LayoutDashboard,
    route: "/dashboard",
    color: "dashboard"
  },
  {
    name: "BizMap AI Chat",
    description: "Get strategic business advice from your AI co-founder through conversation",
    icon: MessageSquare,
    route: "/bizmap-ai",
    color: "chat"
  },
  {
    name: "Product Market Fit Lab",
    description: "Validate your product-market fit with customer analysis and validation experiments",
    icon: FlaskConical,
    route: "/bizmap-ai",
    color: "pmf"
  },
  {
    name: "Prompt Library",
    description: "Access ready-to-use AI prompts for pitches, emails, and customer interviews",
    icon: Lightbulb,
    route: "/prompt-library",
    color: "prompt"
  },
  {
    name: "Insighta",
    description: "Assess your fundraising readiness, find matched investors, and discover funding opportunities",
    icon: TrendingUp,
    route: "/insighta",
    color: "insighta"
  },
  {
    name: "Community",
    description: "Connect with founders, get feedback, and find accountability partners",
    icon: Users,
    route: "/community",
    color: "community"
  }
];

const HeroSnippets = () => {
  // Duplicate snippets to create seamless infinite loop
  const duplicatedSnippets = [...platformSnippets, ...platformSnippets];

  const getColorClasses = (color: SnippetColor) => {
    const colorMap = {
      planning: {
        glass: 'glass-blue',
        border: 'border-blue-500/30 hover:border-blue-500/60',
        shadow: 'hover:shadow-lg hover:shadow-blue-500/20',
        icon: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-500/10 hover:bg-blue-500/20'
      },
      dashboard: {
        glass: 'glass-blue',
        border: 'border-indigo-500/30 hover:border-indigo-500/60',
        shadow: 'hover:shadow-lg hover:shadow-indigo-500/20',
        icon: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-500/10 hover:bg-indigo-500/20'
      },
      chat: {
        glass: 'glass-green',
        border: 'border-teal-500/30 hover:border-teal-500/60',
        shadow: 'hover:shadow-lg hover:shadow-teal-500/20',
        icon: 'text-teal-600 dark:text-teal-400',
        bg: 'bg-teal-500/10 hover:bg-teal-500/20'
      },
      pmf: {
        glass: 'glass-red',
        border: 'border-orange-500/30 hover:border-orange-500/60',
        shadow: 'hover:shadow-lg hover:shadow-orange-500/20',
        icon: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-500/10 hover:bg-orange-500/20'
      },
      prompt: {
        glass: 'glass-green',
        border: 'border-amber-500/30 hover:border-amber-500/60',
        shadow: 'hover:shadow-lg hover:shadow-amber-500/20',
        icon: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10 hover:bg-amber-500/20'
      },
      insighta: {
        glass: 'glass-blue',
        border: 'border-purple-500/30 hover:border-purple-500/60',
        shadow: 'hover:shadow-lg hover:shadow-purple-500/20',
        icon: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-500/10 hover:bg-purple-500/20'
      },
      community: {
        glass: 'glass-red',
        border: 'border-pink-500/30 hover:border-pink-500/60',
        shadow: 'hover:shadow-lg hover:shadow-pink-500/20',
        icon: 'text-pink-600 dark:text-pink-400',
        bg: 'bg-pink-500/10 hover:bg-pink-500/20'
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
                  background: `linear-gradient(135deg, ${colors.bg.split(' ')[0]}/5, transparent)`
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
                
                {/* Subtle glow effect on hover */}
                <div className="absolute -inset-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-md -z-10" style={{
                  background: colors.shadow.includes('blue') ? 'rgba(59, 130, 246, 0.2)' :
                              colors.shadow.includes('indigo') ? 'rgba(99, 102, 241, 0.2)' :
                              colors.shadow.includes('teal') ? 'rgba(20, 184, 166, 0.2)' :
                              colors.shadow.includes('orange') ? 'rgba(249, 115, 22, 0.2)' :
                              colors.shadow.includes('amber') ? 'rgba(245, 158, 11, 0.2)' :
                              colors.shadow.includes('purple') ? 'rgba(168, 85, 247, 0.2)' :
                              'rgba(236, 72, 153, 0.2)'
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

