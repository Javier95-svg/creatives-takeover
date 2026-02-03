import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ComingSoonPageProps {
  title: string;
  description: string;
}

export default function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${title} - Coming Soon | Creatives Takeover`}
        description={description}
      />
      <Navigation />

      <main>
        <section className="py-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
          </div>

          <div className="container mx-auto max-w-2xl relative z-10">
            <Card className="border-primary/20">
              <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-primary" />
                </div>

                <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-4 py-1 text-sm">
                  Coming Soon
                </Badge>

                <h1 className="text-3xl sm:text-4xl font-bold takeover-gradient creatives-font">
                  {title}
                </h1>

                <p className="text-muted-foreground text-base max-w-md leading-relaxed">
                  {description}
                </p>

                <p className="text-sm text-muted-foreground">
                  Launching soon.{" "}
                  {user ? (
                    "Stay tuned for the latest updates."
                  ) : (
                    <Link to="/auth" className="text-primary font-medium hover:underline">
                      Sign in
                    </Link>
                  )}{" "}
                  {!user && "to stay tuned for the latest updates."}
                </p>

                <Button
                  variant="outline"
                  className="gap-2 mt-4"
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go Back
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
