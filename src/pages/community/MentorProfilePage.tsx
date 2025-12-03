import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { MentorProfile } from "@/components/mentor-marketplace/MentorProfile";
import { BookingModal } from "@/components/mentor-marketplace/BookingModal";
import { Button } from "@/components/ui/button";
import { MentorProfile as MentorProfileType } from "@/types/mentor";
import { useMentors } from "@/hooks/useMentors";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Loader2, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
  id: "1",
  name: "Sarah Chen",
  picture: "/lovable-uploads/maya-chen-avatar.jpg",
  bio: "Serial entrepreneur with 15+ years of experience. Successfully scaled 3 startups from idea to exit. Expert in product-market fit, fundraising, and growth strategies.\n\nI've helped over 100 founders navigate the early stages of their startup journey. My approach is practical, data-driven, and focused on execution.\n\nAreas of expertise:\n• Product-market fit validation\n• Seed and Series A fundraising\n• Go-to-market strategies\n• Team building and scaling",
  hourly_rate: 20000,
  expertise: ["Product Development", "Fundraising", "Strategy"],
  rating: 4.8,
  review_count: 42,
  is_active: true,
  testimonials: [
    {
      id: "1",
      mentor_id: "1",
      founder_name: "Alex Thompson",
      text: "Sarah helped me refine my pitch and connect with the right investors. Her advice was invaluable during our fundraising round.",
      rating: 5,
      created_at: new Date().toISOString(),
    },
    {
      id: "2",
      mentor_id: "1",
      founder_name: "Maria Garcia",
      text: "Best mentor I've worked with. Very practical advice and always available when I needed guidance.",
      rating: 5,
      created_at: new Date().toISOString(),
    },
  ],
  total_sessions_completed: 156,
  response_time_hours: 4,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MentorProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';
  const { fetchMentorById, loading } = useMentors();
  const [mentor, setMentor] = useState<MentorProfileType | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadMentor(id);
    }
  }, [id]);

  const loadMentor = async (mentorId: string) => {
    const found = await fetchMentorById(mentorId);
    if (found) {
      setMentor(found as MentorProfileType);
    }
  };

  const handleBookClick = () => {
    setBookingModalOpen(true);
  };

  const handleBookingConfirm = (date: Date, timeSlot: string) => {
    // Navigate to booking page
    window.location.href = `/community/book/${id}`;
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading mentor profile...</p>
        </div>
      </>
    );
  }

  if (!mentor) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <p>Mentor not found</p>
          <Button asChild className="mt-4">
            <Link to="/community/discover">Browse Mentors</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{mentor.name} | Mentor Profile</title>
        <meta name="description" content={mentor.bio.substring(0, 160)} />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <div className="relative z-10">
          <Navigation />
          <div className="pt-16">
            <div className="container mx-auto px-4 py-8">
              <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/community/discover" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Discover
                  </Link>
                </Button>
                {isAdmin && mentor && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/community/admin/edit/${mentor.id}`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Mentor
                  </Button>
                )}
              </div>

              <MentorProfile mentor={mentor} onBookClick={handleBookClick} />
            </div>
          </div>
          <Footer />
        </div>
      </div>

      <BookingModal
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        mentor={mentor}
        onConfirm={handleBookingConfirm}
      />
    </>
  );
};

export default MentorProfilePage;

