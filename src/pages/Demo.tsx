import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { ArrowRight, Upload, Search, Users, BarChart3, Lightbulb, Rocket, Heart, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Demo = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Creatives Takeover - Where Ideas Meet Investors | Turn Your Vision Into Reality</title>
        <meta
          name="description"
          content="The platform connecting creative entrepreneurs with investors. Showcase your project, get discovered, and turn your ideas into funded businesses. Join the creative revolution."
        />
      </Helmet>

      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
          <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container mx-auto max-w-6xl text-center">
          <div className="inline-block mb-6 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 animate-fade-in">
            <span className="text-sm font-semibold text-primary">🚀 Empowering Creators Worldwide</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-fade-in">
            Where Ideas Meet Investors
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto animate-fade-in">
            Turn your creative vision into a funded business. Connect with investors who believe in your potential.
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-16 animate-fade-in">
            <Button size="lg" className="gap-2 text-lg px-8 py-6 hover-scale" asChild>
              <Link to="/signup">
                Join the Takeover
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-lg px-8 py-6 hover-scale" asChild>
              <Link to="/community">
                Explore Projects
                <Search className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto animate-fade-in">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">10K+</div>
              <div className="text-sm text-muted-foreground">Active Creators</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-2">$50M+</div>
              <div className="text-sm text-muted-foreground">Funding Raised</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-secondary mb-2">500+</div>
              <div className="text-sm text-muted-foreground">Investors</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">95%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem → Solution → Impact Story */}
      <section className="py-20 px-4 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Problem */}
            <div className="p-8 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover-scale">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                <Shield className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold mb-4">The Problem</h3>
              <p className="text-muted-foreground leading-relaxed">
                Creative entrepreneurs struggle to get visibility. Amazing ideas die in obscurity because there's no platform to showcase them to the right investors.
              </p>
            </div>

            {/* Solution */}
            <div className="p-8 rounded-2xl bg-card border border-primary/50 shadow-lg hover:shadow-xl transition-all duration-300 hover-scale relative">
              <div className="absolute -top-4 -right-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                Our Solution
              </div>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Lightbulb className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Creatives Takeover</h3>
              <p className="text-muted-foreground leading-relaxed">
                We give your idea a stage. Upload your project, tell your story, and get discovered by investors actively looking for the next big thing.
              </p>
            </div>

            {/* Impact */}
            <div className="p-8 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover-scale">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                <Rocket className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold mb-4">The Impact</h3>
              <p className="text-muted-foreground leading-relaxed">
                Ideas become businesses. Creators get funded. Investors discover untapped potential. Everyone wins in the creative economy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Get Funded</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A complete platform designed for creators and investors to connect, collaborate, and succeed together.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Showcase Your Project</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Upload your pitch deck, demos, prototypes, and story. Make your idea shine with rich media support and beautiful presentation tools.
              </p>
              <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
                <div className="text-center">
                  <Upload className="h-12 w-12 text-primary/40 mx-auto mb-2" />
                  <span className="text-sm text-muted-foreground">Project Upload Preview</span>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Search className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Connect With Investors</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Get discovered by investors actively seeking creative projects. Smart matching connects you with the right funding partners.
              </p>
              <div className="aspect-video rounded-xl bg-gradient-to-br from-accent/20 to-secondary/20 flex items-center justify-center border border-accent/20">
                <div className="text-center">
                  <Search className="h-12 w-12 text-accent/40 mx-auto mb-2" />
                  <span className="text-sm text-muted-foreground">Investor Discovery Preview</span>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="h-7 w-7 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Community Feedback</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Get valuable feedback from fellow creators and potential customers. Iterate and improve before you launch.
              </p>
              <div className="aspect-video rounded-xl bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center border border-secondary/20">
                <div className="text-center">
                  <Users className="h-12 w-12 text-secondary/40 mx-auto mb-2" />
                  <span className="text-sm text-muted-foreground">Community Collaboration Preview</span>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Transparent Analytics</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Track views, engagement, and investor interest in real-time. Know exactly who's interested in your project.
              </p>
              <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-primary/40 mx-auto mb-2" />
                  <span className="text-sm text-muted-foreground">Analytics Dashboard Preview</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gradient-to-b from-muted/20 to-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Your Journey to <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Success</span>
            </h2>
            <p className="text-xl text-muted-foreground">Simple steps, powerful results</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connection lines */}
            <div className="hidden md:block absolute top-16 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-secondary opacity-20" style={{ top: '4rem' }} />

            <div className="text-center relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 border-4 border-primary shadow-lg hover-scale">
                <span className="text-3xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Create Profile</h3>
              <p className="text-muted-foreground">Sign up and build your creator profile in minutes</p>
            </div>

            <div className="text-center relative">
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6 border-4 border-accent shadow-lg hover-scale">
                <span className="text-3xl font-bold text-accent">2</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Upload Project</h3>
              <p className="text-muted-foreground">Share your vision with compelling visuals and story</p>
            </div>

            <div className="text-center relative">
              <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-6 border-4 border-secondary shadow-lg hover-scale">
                <span className="text-3xl font-bold text-secondary">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Get Discovered</h3>
              <p className="text-muted-foreground">Investors find you through our smart matching system</p>
            </div>

            <div className="text-center relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 border-4 border-primary shadow-lg hover-scale">
                <span className="text-3xl font-bold text-primary">4</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Get Funded</h3>
              <p className="text-muted-foreground">Connect, negotiate, and turn your idea into reality</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-accent to-secondary p-12 md:p-16 text-center shadow-2xl">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-semibold">Limited Early Access</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                Ready to Turn Your Idea Into Reality?
              </h2>
              <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
                Join thousands of creators who have already found their investors and launched successful businesses.
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center">
                <Button size="lg" variant="secondary" className="gap-2 text-lg px-8 py-6 hover-scale" asChild>
                  <Link to="/signup">
                    Get Early Access
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2 text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white/30 hover-scale" asChild>
                  <Link to="/contact">
                    Talk to Our Team
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founders Vision Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Heart className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Our Vision</h2>
          </div>

          <div className="prose prose-lg mx-auto text-muted-foreground">
            <p className="text-xl leading-relaxed mb-6">
              We believe every creative person deserves a chance to turn their ideas into impact. Too many brilliant projects never see the light of day because they lack visibility and funding.
            </p>
            <p className="text-xl leading-relaxed mb-6">
              <strong className="text-foreground">Creatives Takeover</strong> exists to change that. We're building more than a platform—we're building a movement where creativity meets capital, where ideas become businesses, and where dreamers become founders.
            </p>
            <p className="text-xl leading-relaxed">
              Join us in democratizing access to funding and empowering the next generation of creative entrepreneurs.
            </p>
          </div>

          <div className="mt-12 p-8 rounded-2xl bg-card border border-primary/20 shadow-lg">
            <p className="text-lg italic text-muted-foreground mb-4">
              "Our mission is simple: give every creative entrepreneur the platform, tools, and connections they need to succeed."
            </p>
            <p className="font-semibold text-primary">— The Creatives Takeover Team</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Demo;
