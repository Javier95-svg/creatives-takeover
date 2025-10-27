import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import JobApplicationForm from "@/components/JobApplicationForm";

interface JobPosition {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
}

const Careers = () => {
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobPositions();
  }, []);

  const fetchJobPositions = async () => {
    try {
      const { data, error } = await supabase
        .from("job_positions")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setJobPositions(data || []);
    } catch (error) {
      console.error("Error fetching job positions:", error);
      toast({
        title: "Error",
        description: "Failed to load job positions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyClick = (position: JobPosition) => {
    setSelectedPosition(position);
    setIsFormOpen(true);
  };

  const getPositionIcon = (title: string) => {
    if (title.toLowerCase().includes("developer")) return <Briefcase className="h-6 w-6" />;
    if (title.toLowerCase().includes("marketer")) return <Target className="h-6 w-6" />;
    if (title.toLowerCase().includes("sales")) return <Users className="h-6 w-6" />;
    return <Briefcase className="h-6 w-6" />;
  };

  return (
    <>
      <Helmet>
        <title>Creatives Takeover</title>
        <meta 
          name="description" 
          content="Join Creatives Takeover and help shape the future of creative entrepreneurship. Explore open positions for Full Stack Developer, Growth Marketer, and Sales Development Representative." 
        />
        <meta name="keywords" content="careers, jobs, hiring, full stack developer, growth marketer, sales representative, creatives takeover jobs" />
        <link rel="canonical" href="/careers" />
      </Helmet>

      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          
          {/* Hero Section */}
          <section className="relative pt-32 pb-24 px-4 overflow-hidden">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 pointer-events-none" />
            
            {/* Decorative Elements */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
            
            <div className="container mx-auto max-w-5xl text-center relative z-10">
              <Badge variant="secondary" className="text-sm px-4 py-2 mb-6 animate-fade-in">
                🚀 We're Hiring
              </Badge>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Build the Future
                <br />
                <span className="text-primary">With Us</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-fade-in leading-relaxed">
                Be part of a passionate team building tools that empower 
                <span className="text-foreground font-semibold"> creators and entrepreneurs across the globe.</span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-fade-in">
                <Button size="lg" className="text-lg px-8 py-6 hover-scale" asChild>
                  <a href="#positions">View Open Positions</a>
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 hover-scale" asChild>
                  <Link to="/about">Learn About Our Culture</Link>
                </Button>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-8 border-t border-border/50 animate-fade-in">
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-2">3+</div>
                  <div className="text-sm text-muted-foreground">Open Roles</div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-2">100%</div>
                  <div className="text-sm text-muted-foreground">Remote First</div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-2">∞</div>
                  <div className="text-sm text-muted-foreground">Growth Potential</div>
                </div>
              </div>
            </div>
          </section>

          {/* Open Positions Section */}
          <section id="positions" className="py-16 px-4 scroll-mt-20">
            <div className="container mx-auto max-w-6xl">
              <div className="text-center mb-12 animate-fade-in">
                <h2 className="text-4xl font-bold mb-4">
                  Open Positions
                </h2>
                <p className="text-lg text-muted-foreground">
                  Find your perfect role and start making an impact
                </p>
              </div>

              {loading ? (
                <div className="grid md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-6 bg-muted rounded mb-2"></div>
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded"></div>
                          <div className="h-4 bg-muted rounded"></div>
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : jobPositions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No open positions at the moment. Check back soon!</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-6">
                  {jobPositions.map((position) => (
                    <Card key={position.id} className="flex flex-col hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            {getPositionIcon(position.title)}
                          </div>
                        </div>
                        <CardTitle className="text-xl">{position.title}</CardTitle>
                        <CardDescription>{position.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <div className="space-y-4 flex-1">
                          <div>
                            <h4 className="font-semibold mb-2 text-sm">Key Requirements:</h4>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              {position.requirements.slice(0, 3).map((req, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleApplyClick(position)}
                          className="w-full mt-6"
                        >
                          Apply Now
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Why Join Us Section */}
          <section className="py-16 px-4 bg-muted/30">
            <div className="container mx-auto max-w-4xl">
              <h2 className="text-3xl font-bold text-center mb-12 animate-fade-in">
                Why Creatives Takeover?
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center animate-fade-in group">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20 group-hover:shadow-lg">
                    <Target className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="font-semibold mb-2 transition-colors duration-300 group-hover:text-primary">Impact</h3>
                  <p className="text-sm text-muted-foreground">
                    Work on products that empower creators and entrepreneurs worldwide
                  </p>
                </div>
                <div className="text-center animate-fade-in [animation-delay:150ms] group">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20 group-hover:shadow-lg">
                    <Users className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="font-semibold mb-2 transition-colors duration-300 group-hover:text-primary">Culture</h3>
                  <p className="text-sm text-muted-foreground">
                    Join a collaborative team of passionate innovators and creatives
                  </p>
                </div>
                <div className="text-center animate-fade-in [animation-delay:300ms] group">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20 group-hover:shadow-lg">
                    <Briefcase className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="font-semibold mb-2 transition-colors duration-300 group-hover:text-primary">Growth</h3>
                  <p className="text-sm text-muted-foreground">
                    Rapid growth opportunities with cutting-edge technologies
                  </p>
                </div>
              </div>
            </div>
          </section>

          <Footer />
        </div>
      </div>

      <JobApplicationForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedPosition(null);
        }}
        position={selectedPosition}
      />
    </>
  );
};

export default Careers;
