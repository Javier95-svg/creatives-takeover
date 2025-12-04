import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useMentors } from "@/hooks/useMentors";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Mentor } from "@/types/mentor";

const MentorBookingPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { fetchMentorById, loading: mentorLoading } = useMentors();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth?redirect=/community/book/" + id);
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
    // TODO: Create Stripe checkout session
    setLoading(true);
    // Mock implementation - will be replaced with actual Stripe checkout
    setTimeout(() => {
      setLoading(false);
      // Navigate to success page
    }, 2000);
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
            <Link to="/community">Browse Mentors</Link>
          </Button>
        </div>
      </>
    );
  }

  const hourlyRate = mentor.hourly_rate / 100;
  const platformFee = hourlyRate * 0.1;
  const total = hourlyRate + platformFee;

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
                <Link to={`/community/mentors/${id}`} className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Profile
                </Link>
              </Button>

              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">Complete Your Booking</h1>
                    <p className="text-muted-foreground">
                      Review your session details and proceed to payment
                    </p>
                  </div>

                  {/* Mentor Info */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Mentor: {mentor.name}</h3>
                    <p className="text-sm text-muted-foreground">8 Week Coaching Program</p>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-2">
                    <h3 className="font-semibold">Pricing Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">8 Week Coaching Program Fee</span>
                        <span>${hourlyRate.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Platform Fee (10%)</span>
                        <span>${platformFee.toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Button */}
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
                      "Proceed to Payment"
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Secure payment powered by Stripe
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

