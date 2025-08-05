import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Target,
  Rocket,
  Award
} from "lucide-react";

const ServiceBenefits = () => {
  const benefits = [
    {
      icon: <Clock className="w-12 h-12 text-primary" />,
      title: "Save 80% Time",
      description: "Streamlined creative workflows and AI automation reduce project completion time significantly.",
      stat: "80% faster",
      cta: "See How"
    },
    {
      icon: <DollarSign className="w-12 h-12 text-primary" />,
      title: "Reduce Costs",
      description: "Replace expensive freelancers and multiple tool subscriptions with one comprehensive platform.",
      stat: "Save $2000+/month",
      cta: "Calculate Savings"
    },
    {
      icon: <TrendingUp className="w-12 h-12 text-primary" />,
      title: "Boost Performance",
      description: "Data-driven insights and optimized templates increase engagement and conversion rates.",
      stat: "3x better results",
      cta: "View Results"
    }
  ];

  const whyChooseUs = [
    {
      icon: <Target className="w-8 h-8 text-primary" />,
      title: "Tailored for Creatives",
      description: "Built specifically for creative professionals, agencies, and businesses who value quality design."
    },
    {
      icon: <Rocket className="w-8 h-8 text-primary" />,
      title: "Rapid Implementation",
      description: "Get started in minutes with our intuitive platform and extensive onboarding resources."
    },
    {
      icon: <Award className="w-8 h-8 text-primary" />,
      title: "Proven Success",
      description: "Trusted by 10,000+ creatives and businesses worldwide with 98% satisfaction rate."
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        {/* Main Benefits */}
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl font-bold mb-6 gradient-text">
            Transform Your Creative Business
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Join thousands of creatives who have revolutionized their workflow with our 
            unlimited design subscription and creative platform services.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {benefits.map((benefit, index) => (
            <Card 
              key={index} 
              className="text-center glass border-border hover:shadow-xl transition-all duration-500 hover-lift animate-slide-in-up" 
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <CardHeader>
                <div className="mx-auto p-6 rounded-full bg-primary/10 w-fit mb-4">
                  {benefit.icon}
                </div>
                <CardTitle className="text-2xl mb-2">{benefit.title}</CardTitle>
                <div className="text-3xl font-bold text-primary mb-4">{benefit.stat}</div>
                <CardDescription className="text-base">
                  {benefit.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  {benefit.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Why Choose Us */}
        <div className="bg-muted/30 rounded-2xl p-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 gradient-text">
              Why Choose Our Creative Platform?
            </h2>
            <p className="text-lg text-muted-foreground">
              We're not just another design tool - we're your complete creative partner.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {whyChooseUs.map((item, index) => (
              <div key={index} className="text-center">
                <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit mb-4">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center space-y-4">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/pricing">
                Start Your Free Trial Today
              </Link>
            </Button>
            <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-primary transition-colors">
                ← Back to Home
              </Link>
              <Link to="/faq" className="hover:text-primary transition-colors">
                View FAQ →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceBenefits;