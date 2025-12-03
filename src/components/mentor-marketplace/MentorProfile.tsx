import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { MentorProfile as MentorProfileType, Review, Testimonial } from "@/types/mentor";
import { Star, Calendar, MessageCircle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface MentorProfileProps {
  mentor: MentorProfileType;
  onBookClick?: () => void;
}

export const MentorProfile = ({ mentor, onBookClick }: MentorProfileProps) => {
  const hourlyRateFormatted = `$${(mentor.hourly_rate / 100).toFixed(0)}/hr`;
  const averageRating = mentor.rating || 0;
  const reviewCount = mentor.review_count || 0;
  const testimonials = mentor.testimonials || [];
  const recentReviews = mentor.recent_reviews || [];

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-4 w-4",
              star <= Math.round(rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 flex-shrink-0">
              <AvatarImage src={mentor.picture} alt={mentor.name} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {mentor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{mentor.name}</h1>
                {averageRating > 0 && (
                  <div className="flex items-center gap-3 mb-2">
                    {renderStars(averageRating)}
                    <span className="text-sm text-muted-foreground">
                      {averageRating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                )}
              </div>

              {/* Hourly Rate - Prominently Displayed */}
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-3xl font-bold text-primary">
                    {hourlyRateFormatted}
                  </span>
                </div>
                {mentor.is_active !== false && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Accepting bookings
                  </Badge>
                )}
              </div>

              {/* Expertise Tags */}
              {mentor.expertise && mentor.expertise.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mentor.expertise.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bio Section */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">About</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {mentor.bio}
          </p>
        </CardContent>
      </Card>

      {/* Testimonials/Reviews Carousel */}
      {(testimonials.length > 0 || recentReviews.length > 0) && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {testimonials.length > 0 ? 'Testimonials' : 'Recent Reviews'}
            </h2>
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent>
                {testimonials.map((testimonial, index) => (
                  <CarouselItem key={`testimonial-${index}`} className="md:basis-1/2">
                    <Card className="h-full">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {renderStars(testimonial.rating)}
                          <p className="text-muted-foreground italic">
                            "{testimonial.text}"
                          </p>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={testimonial.founder_avatar} />
                              <AvatarFallback>
                                {testimonial.founder_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm">
                                {testimonial.founder_name}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
                {recentReviews.map((review, index) => (
                  <CarouselItem key={`review-${review.id || index}`} className="md:basis-1/2">
                    <Card className="h-full">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {renderStars(review.rating)}
                          {review.comment && (
                            <p className="text-muted-foreground">
                              {review.comment}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {(testimonials.length > 1 || recentReviews.length > 1) && (
                <>
                  <CarouselPrevious className="-left-4" />
                  <CarouselNext className="-right-4" />
                </>
              )}
            </Carousel>
          </CardContent>
        </Card>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mentor.total_sessions_completed !== undefined && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-primary">
                {mentor.total_sessions_completed}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Sessions Completed
              </div>
            </CardContent>
          </Card>
        )}
        {averageRating > 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-primary">
                {averageRating.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Average Rating
              </div>
            </CardContent>
          </Card>
        )}
        {mentor.response_time_hours !== undefined && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-primary">
                {mentor.response_time_hours}h
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Avg Response Time
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Book Button */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 -mx-6 md:mx-0">
        <Button
          onClick={onBookClick}
          size="lg"
          className="w-full"
          disabled={mentor.is_active === false}
        >
          <Calendar className="h-5 w-5 mr-2" />
          Book a Session
        </Button>
      </div>
    </div>
  );
};

