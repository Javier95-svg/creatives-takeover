import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Handshake, Search, Filter, MapPin, Briefcase, Code, Palette, TrendingUp, Users, Star } from "lucide-react";

const FindCoFounder = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Handshake className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Find Your Perfect Match</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Find a Co-Founder
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Connect with talented entrepreneurs who share your vision and complement your skills
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by skills, industry, or location..."
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <Button variant="outline" className="md:w-auto">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coming Soon Banner */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple/5 mb-12">
            <CardContent className="pt-6 text-center py-12">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                  <Handshake className="w-10 h-10 text-primary" />
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-4">Coming Soon</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
                We're building an intelligent matching system to help you find the perfect co-founder based on skills, experience, and vision alignment.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                <Badge variant="secondary" className="px-4 py-2">
                  <Code className="w-4 h-4 mr-2" />
                  Technical Co-Founders
                </Badge>
                <Badge variant="secondary" className="px-4 py-2">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Business Co-Founders
                </Badge>
                <Badge variant="secondary" className="px-4 py-2">
                  <Palette className="w-4 h-4 mr-2" />
                  Creative Co-Founders
                </Badge>
              </div>
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Join the Waitlist
              </Button>
            </CardContent>
          </Card>

          {/* What to Expect */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Smart Matching
                </CardTitle>
                <CardDescription>
                  AI-powered algorithm matches you with co-founders based on complementary skills and shared values
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Verified Profiles
                </CardTitle>
                <CardDescription>
                  All co-founder profiles are verified to ensure authenticity and serious commitment
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Experience Levels
                </CardTitle>
                <CardDescription>
                  Find co-founders from first-time entrepreneurs to serial founders
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* CTA Section */}
          <Card className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-primary/20">
            <CardContent className="pt-6 text-center py-8">
              <h3 className="text-2xl font-bold mb-2">Want to be notified when we launch?</h3>
              <p className="text-muted-foreground mb-6">
                Be the first to know when co-founder matching goes live
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Notify Me
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FindCoFounder;
