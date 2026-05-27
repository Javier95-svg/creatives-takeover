import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUpgradePrompt } from "@/contexts/UpgradePromptContext";
import { useMentors } from "@/hooks/useMentors";
import { Loader2, ArrowLeft } from "lucide-react";
import { Mentor } from "@/types/mentor";
import { toast } from "sonner";
import {
  buildDiscoveryCallRedirectUrl,
  createDiscoveryCallIntent,
  openDeferredExternalTab,
} from "@/services/discoveryCallService";
import { createIdempotencyKey } from "@/lib/idempotency";

const MentorBookingPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { openUpgradePrompt } = useUpgradePrompt();
  const { fetchMentorById, loading: mentorLoading } = useMentors();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate(`/signup?source=book-discovery-call&return=${encodeURIComponent(id ? `/mentorship/book/${id}` : "/mentorship")}`);
    }
  }, [isAuthenticated, authLoading, navigate, id]);

  useEffect(() => {
    if (id && isAuthenticated) {
      loadMentor();
    }
  }, [id, isAuthenticated]);

  const loadMentor = async () => {
    if (!id) return;
    const found = await fetchMentorById(id);
    if (found) {
      setMentor(found);
    }
  };

  const handleProceedToPayment = async () => {
    if (!mentor || !user) {
      navigate(`/signup?source=book-discovery-call&return=${encodeURIComponent(id ? `/mentorship/book/${id}` : "/mentorship")}`);
      return;
    }

    const bookingUrl = mentor.calendly_url?.trim();
    if (!bookingUrl) {
      toast.error("This mentor does not have a booking link configured yet.");
      navigate(`/mentorship/mentors/${mentor.id}`);
      return;
    }

    const bookingTab = openDeferredExternalTab();
    if (!bookingTab) {
      toast.error("Popup blocked. Please allow popups and try again.");
      return;
    }

    setLoading(true);
    try {
      const bookingIntent = await createDiscoveryCallIntent({
        mentorId: mentor.id,
        mentorName: mentor.name,
        source: "mentor_booking_page",
        idempotencyKey: createIdempotencyKey(`mentor-booking-page-${mentor.id}`),
        metadata: { mentor_id: mentor.id, mentor_name: mentor.name },
      });

      if (!bookingIntent.success || !bookingIntent.callId) {
        bookingTab.close();

        if (bookingIntent.errorCode === "INSUFFICIENT_CREDITS") {
          openUpgradePrompt({
            reason: "credits",
            featureName: "Discovery Calls",
            requiredCredits: bookingIntent.requiredCredits ?? 10,
            description: bookingIntent.error || "You need 10 credits to book a discovery call.",
          });
          return;
        }

        if (bookingIntent.errorCode === "PLAN_UPGRADE_REQUIRED") {
          toast.error(bookingIntent.error || "Unable to book this discovery call on your current plan.");
          navigate("/pricing");
          return;
        }

        toast.error(bookingIntent.error || "Unable to process booking. Please try again.");
        return;
      }

      bookingTab.location.href = buildDiscoveryCallRedirectUrl(bookingUrl, bookingIntent.callId);
      toast.success("Booking opened in a new tab.");
    } catch (error) {
      bookingTab.close();
      console.error("Error creating discovery call intent:", error);
      toast.error("Unable to process booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || mentorLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (!mentor) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground mb-4">Mentor not found</p>
          <Button asChild>
            <Link to="/mentorship">Browse Mentors</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Book Session | Mentor Marketplace</title>
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <div className="relative z-10">
          <Navigation />
          <div className="pt-16">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
              <Button variant="ghost" size="sm" asChild className="mb-6">
                <Link to={`/mentorship/mentors/${id}`} className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Profile
                </Link>
              </Button>

              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">Book Your Discovery Call</h1>
                    <p className="text-muted-foreground">
                      Review the mentor details, then continue to the mentor's booking calendar.
                    </p>
                  </div>

                  {/* Mentor Info */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Mentor: {mentor.name}</h3>
                    <p className="text-sm text-muted-foreground">Discovery Call</p>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                    Discovery calls are available on every plan and cost 10 credits only after your booking is confirmed.
                  </div>

                  <Button
                    onClick={handleProceedToPayment}
                    disabled={loading}
                    size="lg"
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Continue to Booking Calendar"
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    The calendar opens in a new tab so your place in Creatives Takeover is preserved.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </>
  );
};

export default MentorBookingPage;

