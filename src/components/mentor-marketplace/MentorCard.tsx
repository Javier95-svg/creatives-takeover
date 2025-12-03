import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mentor } from "@/types/mentor";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MentorCardProps {
  mentor: Mentor;
  className?: string;
}

export const MentorCard = ({ mentor, className }: MentorCardProps) => {
  const hourlyRateFormatted = `$${(mentor.hourly_rate / 100).toFixed(0)}/hr`;
  
  // Truncate bio if too long
  const bioMaxLength = 150;
  const truncatedBio = mentor.bio.length > bioMaxLength 
    ? mentor.bio.substring(0, bioMaxLength) + '...'
    : mentor.bio;

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-200 hover:shadow-md hover:shadow-primary/5",
        className
      )}
    >
      <Link to={`/community/mentors/${mentor.id}`}>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            {/* Avatar and Name */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 flex-shrink-0">
                <AvatarImage src={mentor.picture} alt={mentor.name} />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {mentor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground mb-1 truncate">
                  {mentor.name}
                </h3>
                {/* Hourly Rate - Prominently Displayed */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">
                    {hourlyRateFormatted}
                  </span>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {truncatedBio}
              </p>
            </div>

            {/* View Profile CTA */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">View profile</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};

