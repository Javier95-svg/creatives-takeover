import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Brain, Lightbulb, TrendingUp, Users, ArrowRight } from "lucide-react";

const WhatWeDo = () => {
  const services = [
    {
      icon: <Brain className="w-8 h-8 text-primary" />,
      title: "AI-Powered Analytics",
      description: "Advanced algorithms analyze creative trends and provide actionable insights to optimize your creative strategy."
    },
    {
      icon: <Lightbulb className="w-8 h-8 text-primary" />,
      title: "Creative Enhancement",
      description: "Intelligent tools that amplify your creativity, suggesting improvements and new directions for your projects."
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-primary" />,
      title: "Performance Optimization",
      description: "Data-driven recommendations to maximize the impact and reach of your creative content across all platforms."
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: "Community Connection",
      description: "Connect with like-minded creatives, share insights, and collaborate on innovative projects within our ecosystem."
    }
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
              Our Services
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              We provide comprehensive AI-driven solutions that transform how creatives work, 
              collaborate, and succeed in the digital landscape.
            </p>
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/pricing">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-muted/30" id="what-we-do">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl font-bold mb-6 gradient-text">What We Do</h2>
            <p className="text-xl text-muted-foreground">
              Comprehensive creative solutions designed for modern professionals.
            </p>
          </div>

        <div className="grid md:grid-cols-2 gap-8">
          {services.map((service, index) => (
            <Card key={index} className="glass border-border hover:shadow-lg transition-all duration-500 hover-lift hover:scale-105 animate-slide-in-left" style={{ animationDelay: `${0.2 + index * 0.1}s` }}>
              <CardHeader className="flex flex-row items-start space-y-0 space-x-4">
                <div className="flex-shrink-0 p-3 rounded-lg bg-primary/10 animate-pulse-glow">
                  {service.icon}
                </div>
                <div>
                  <CardTitle className="text-xl">{service.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/pricing">
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default WhatWeDo;