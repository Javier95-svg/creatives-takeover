import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Booking } from "@/types/mentor";
import { Calendar, Clock, Video, ArrowLeft, X } from "lucide-react";
import { format } from "date-fns";

// Mock bookings - will be replaced with database queries
const MOCK_BOOKINGS: Booking[] = [];

const MyBookings = () => {
  const upcomingBookings = MOCK_BOOKINGS.filter(
    (b) => b.status === "pending" || b.status === "confirmed"
  );
  const pastBookings = MOCK_BOOKINGS.filter(
    (b) => b.status === "completed" || b.status === "cancelled"
  );

  const getStatusBadge = (status: Booking["status"]) => {
    const variants: Record<Booking["status"], string> = {
      pending: "outline",
      confirmed: "default",
      completed: "secondary",
      cancelled: "destructive",
      refunded: "destructive",
    };
    return variants[status] || "outline";
  };

  return (
    <>
      <Helmet>
        <title>My Bookings | Mentor Marketplace</title>
        <meta name="description" content="Manage your mentor session bookings" />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <div className="relative z-10">
          <Navigation />
          <div className="pt-16">
            <div className="container mx-auto px-4 py-8">
              <div className="mb-6">
                <Button variant="ghost" size="sm" asChild className="mb-4">
                  <Link to="/community" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Marketplace
                  </Link>
                </Button>
                <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
                <p className="text-muted-foreground">
                  Manage your upcoming and past mentor sessions
                </p>
              </div>

              {/* Upcoming Bookings */}
              <div className="mb-12">
                <h2 className="text-2xl font-semibold mb-6">Upcoming Sessions</h2>
                {upcomingBookings.length > 0 ? (
                  <div className="grid gap-4">
                    {upcomingBookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold">Mentor Session</h3>
                                <Badge variant={getStatusBadge(booking.status) as any}>
                                  {booking.status}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {format(new Date(booking.scheduled_time), "PPP")}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {format(new Date(booking.scheduled_time), "p")}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {booking.duration_minutes} minutes
                                </div>
                              </div>
                              {booking.zoom_link && (
                                <Button asChild variant="outline" size="sm">
                                  <a href={booking.zoom_link} target="_blank" rel="noopener noreferrer">
                                    <Video className="h-4 w-4 mr-2" />
                                    Join Zoom Meeting
                                  </a>
                                </Button>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {booking.status === "confirmed" && (
                                <Button variant="outline" size="sm">
                                  Reschedule
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground mb-4">
                        You don't have any upcoming sessions yet.
                      </p>
                      <Button asChild>
                        <Link to="/community">Browse Mentors</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Past Bookings */}
              <div>
                <h2 className="text-2xl font-semibold mb-6">Past Sessions</h2>
                {pastBookings.length > 0 ? (
                  <div className="grid gap-4">
                    {pastBookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold">Mentor Session</h3>
                                <Badge variant={getStatusBadge(booking.status) as any}>
                                  {booking.status}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {format(new Date(booking.scheduled_time), "PPP")}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {format(new Date(booking.scheduled_time), "p")}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground">
                        No past sessions to display.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </>
  );
};

export default MyBookings;

