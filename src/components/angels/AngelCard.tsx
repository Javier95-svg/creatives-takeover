import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AngelInvestor } from "@/types/angel";
import { Linkedin, Globe, Building2, Mail, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";

interface AngelCardProps {
  angel: AngelInvestor;
  className?: string;
  priority?: boolean;
}

const getStageColor = (stage: string): string => {
  switch (stage.toLowerCase()) {
    case 'pre-seed':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400';
    case 'seed':
      return 'bg-success-subtle text-success dark:bg-success/30 dark:text-success';
    case 'series a':
      return 'bg-info-subtle text-info dark:bg-info/30 dark:text-info';
    case 'series b':
      return 'bg-warning-subtle text-warning dark:bg-warning/30 dark:text-warning';
    case 'series c+':
      return 'bg-destructive-subtle text-destructive dark:bg-destructive/30 dark:text-destructive';
    default:
      return 'bg-muted text-foreground dark:bg-gray-800 dark:text-muted-foreground';
  }
};

export const AngelCard = ({ angel, className, priority = false }: AngelCardProps) => {
  return (
    <Card className={cn(
      "border-2 border-border/60 rounded-lg hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-background",
      className
    )}>
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <div className="flex gap-4 sm:gap-6 lg:gap-8">
          {/* Left: Avatar (responsive sizing for mobile) */}
          <div className="flex-shrink-0">
            <div className="relative group">
              <Avatar className="h-14 w-14 sm:h-20 sm:w-20 lg:h-24 lg:w-24 ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300 group-hover:scale-105 shadow-lg">
                <AvatarImage
                  src={angel.picture || undefined}
                  alt={angel.name}
                  className="object-cover"
                  loading={priority ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={priority ? "high" : "auto"}
                />
                <AvatarFallback className="bg-muted text-foreground font-semibold text-sm sm:text-lg lg:text-xl">
                  {angel.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Center: Content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Name */}
            <h3 className="text-lg lg:text-xl font-bold text-foreground">
              {angel.name}
            </h3>

            {/* Venture Capital Firm */}
            <div className="flex items-center gap-2 text-sm lg:text-base text-muted-foreground">
              <Building2 className="h-4 w-4 flex-shrink-0 text-primary/70" />
              <span className="font-medium">{angel.firm_name}</span>
            </div>

            {/* Investment Stages */}
            {angel.investment_stages && angel.investment_stages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {angel.investment_stages.map((stage) => (
                  <Badge
                    key={stage}
                    className={cn("text-xs font-semibold px-3 py-1", getStageColor(stage))}
                  >
                    {stage}
                  </Badge>
                ))}
              </div>
            )}

            {angel.sectors && angel.sectors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {angel.sectors
                  .slice()
                  .sort((a, b) => a.localeCompare(b))
                  .map((sector) => (
                  <Badge
                    key={sector}
                    className="bg-destructive text-white text-xs font-medium px-3 py-1 hover:bg-destructive"
                  >
                    {sector}
                  </Badge>
                ))}
              </div>
            )}

            {/* Social Links */}
            {(angel.email || angel.website_url || angel.linkedin_url || angel.twitter_x_url) && (
              <div className="flex items-center gap-4 pt-1">
                {angel.email && (
                  <a
                    href={`mailto:${angel.email}`}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Email"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="hidden sm:inline">Email</span>
                  </a>
                )}
                {angel.linkedin_url && (
                  <a
                    href={angel.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-info transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-4 w-4" />
                    <span className="hidden sm:inline">LinkedIn</span>
                  </a>
                )}
                {angel.twitter_x_url && (
                  <a
                    href={angel.twitter_x_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="X"
                  >
                    <Twitter className="h-4 w-4" />
                    <span className="hidden sm:inline">X</span>
                  </a>
                )}
                {angel.website_url && (
                  <a
                    href={angel.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Website"
                  >
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">Website</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
