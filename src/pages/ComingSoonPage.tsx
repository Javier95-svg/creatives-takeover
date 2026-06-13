import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Rocket, ArrowLeft, Zap, Bell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ComingSoonPageProps {
  title: string;
  description: string;
  highlights?: string[];
}

export default function ComingSoonPage({ title, description, highlights }: ComingSoonPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${title} - Coming Soon | Creatives Takeover`}
        description={description}
        noindex={true}
      />
      <Navigation />

      <main>
        <section className="py-20 px-4 relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
            <div
              className="absolute -top-40 -right-48 w-[50rem] h-[50rem] rounded-full opacity-50 blur-3xl animate-[spin_30s_linear_infinite]"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.2), transparent 60%), radial-gradient(circle at 70% 70%, rgba(16, 185, 129, 0.25), transparent 55%)",
              }}
            />
            <div
              className="absolute -bottom-32 -left-32 w-[40rem] h-[40rem] rounded-full opacity-40 blur-3xl animate-[spin_24s_linear_infinite_reverse]"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.15), transparent 60%)",
              }}
            />
          </div>

          <div className="container mx-auto max-w-3xl relative z-10 space-y-8">
            {/* Hero card */}
            <Card className="border-primary/20 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-info to-success" />
              <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-6">
                {/* Animated icon */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <Rocket className="w-10 h-10 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-warning flex items-center justify-center animate-bounce">
                    <Zap className="w-3.5 h-3.5 text-warning" />
                  </div>
                </div>

                <Badge className="bg-warning-subtle text-warning dark:bg-warning/30 dark:text-warning px-5 py-1.5 text-sm font-semibold tracking-wide">
                  Coming Soon
                </Badge>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold takeover-gradient creatives-font leading-tight pb-1">
                  {title}
                </h1>

                <p className="text-muted-foreground text-base sm:text-lg max-w-xl leading-relaxed">
                  {description}
                </p>

                {/* Feature highlights */}
                {highlights && highlights.length > 0 && (
                  <div className="w-full max-w-md space-y-3 pt-2">
                    {highlights.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 text-left p-3 rounded-lg bg-muted/50 border border-border/50"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{i + 1}</span>
                        </div>
                        <span className="text-sm text-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <div className="pt-4 space-y-4">
                  {user ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Bell className="w-4 h-4 text-primary" />
                      <span>
                        Launching soon. You'll be the first to know when it's live.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Launching soon. Be the first to access it.
                      </p>
                      <Button asChild>
                        <Link to="/signup">
                          Sign Up for Early Access
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-foreground mt-2"
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
