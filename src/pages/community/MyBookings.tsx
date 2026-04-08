import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Video, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { listMyDiscoveryCalls, type DiscoveryCallBookingItem } from "@/services/discoveryCallService";

const MyBookings = () => {
  const [bookings, setBookings] = useState<DiscoveryCallBookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadBookings = async () => {
      try {
        setLoading(true);
        const response = await listMyDiscoveryCalls();
        if (!cancelled && response.success) {
          setBookings(response.bookings);
        }
      } catch (error) {
        console.error('Failed to load discovery calls:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadBookings();

    return () => {
      cancelled = true;
    };
  }, []);

  const upcomingBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "intent_created" || booking.status === "scheduled"),
    [bookings],
  );

  const pastBookings = useMemo(
    () => bookings.filter((booking) => booking.status !== "intent_created" && booking.status !== "scheduled"),
    [bookings],
  );

  const getStatusBadge = (status: DiscoveryCallBookingItem["status"]) => {
    const variants: Record<DiscoveryCallBookingItem["status"], string> = {
      intent_created: "outline",
      scheduled: "default",
      completed: "secondary",
      cancelled_early: "destructive",
      cancelled_late: "destructive",
      founder_no_show: "destructive",
      mentor_no_show: "outline",
    };
    return variants[status] || "outline";
  };

  const formatStatusLabel = (status: DiscoveryCallBookingItem['status']) => {
    switch (status) {
      case 'intent_created':
        return 'Scheduling in progress';
      case 'scheduled':
        return 'Scheduled';
      case 'completed':
        return 'Completed';
      case 'cancelled_early':
        return 'Cancelled early';
      case 'cancelled_late':
        return 'Cancelled late';
      case 'founder_no_show':
        return 'Founder no-show';
      case 'mentor_no_show':
        return 'Mentor no-show';
      default:
        return status;
    }
  };

  const renderTiming = (booking: DiscoveryCallBookingItem) => {
    if (!booking.scheduledFor) {
      return <span>Awaiting final scheduling in Calendly</span>;
    }

    return (
      <>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {format(new Date(booking.scheduledFor), "PPP")}
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {format(new Date(booking.scheduledFor), "p")}
        </div>
      </>
    );
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

              {loading && (
                <Card className="mb-8">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Loading your discovery calls...
                  </CardContent>
                </Card>
              )}

              {/* Upcoming Bookings */}
              <div className="mb-12">
                <h2 className="text-2xl font-semibold mb-6">Upcoming Sessions</h2>
                {!loading && upcomingBookings.length > 0 ? (
                  <div className="grid gap-4">
                    {upcomingBookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold">{booking.mentorName}</h3>
                                <Badge variant={getStatusBadge(booking.status) as 'default' | 'secondary' | 'destructive' | 'outline'}>
                                  {formatStatusLabel(booking.status)}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                {renderTiming(booking)}
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {booking.durationMinutes} minutes
                                </div>
                              </div>
                              {booking.meetingUrl && (
                                <Button asChild variant="outline" size="sm">
                                  <a href={booking.meetingUrl} target="_blank" rel="noopener noreferrer">
                                    <Video className="h-4 w-4 mr-2" />
                                    Join Meeting
                                  </a>
                                </Button>
                              )}
                              {!booking.scheduledFor && booking.providerBookingUrl && (
                                <Button asChild variant="outline" size="sm">
                                  <a href={booking.providerBookingUrl} target="_blank" rel="noopener noreferrer">
                                    Continue Scheduling
                                  </a>
                                </Button>
                              )}
                            </div>
                            <div className="flex gap-2" />
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
                {!loading && pastBookings.length > 0 ? (
                  <div className="grid gap-4">
                    {pastBookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold">{booking.mentorName}</h3>
                                <Badge variant={getStatusBadge(booking.status) as 'default' | 'secondary' | 'destructive' | 'outline'}>
                                  {formatStatusLabel(booking.status)}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                {renderTiming(booking)}
                                {booking.cancelledReason && <div>{booking.cancelledReason}</div>}
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

