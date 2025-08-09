import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { Link } from "react-router-dom";

const PricingComparison = () => {
  const features = [
    {
      category: "AI-Powered Tools",
      items: [
        { feature: "AI Design Assistant", starter: "Basic", elite: "Advanced", teams: "Advanced" },
        { feature: "Smart Templates", starter: "50", elite: "500+", teams: "500+" },
        { feature: "AI Content Generation", starter: false, elite: true, teams: true },
        { feature: "Auto Background Removal", starter: "10/month", elite: "Unlimited", teams: "Unlimited" },
        { feature: "AI Analytics & Insights", starter: false, elite: true, teams: true }
      ]
    },
    {
      category: "Creative Resources",
      items: [
        { feature: "Template Library Access", starter: "1,000+", elite: "10,000+", teams: "10,000+" },
        { feature: "Stock Photos & Images", starter: "100/month", elite: "Unlimited", teams: "Unlimited" },
        { feature: "Premium Fonts", starter: "50", elite: "500+", teams: "500+" },
        { feature: "Design Assets", starter: "Basic", elite: "Premium", teams: "Premium" },
        { feature: "Video Templates", starter: false, elite: true, teams: true }
      ]
    },
    {
      category: "Collaboration & Sharing",
      items: [
        { feature: "Team Members", starter: "1", elite: "3", teams: "6" },
        { feature: "Cloud Storage", starter: "10GB", elite: "100GB", teams: "500GB" },
        { feature: "Real-time Collaboration", starter: false, elite: true, teams: true },
        { feature: "Project Sharing", starter: "Basic", elite: "Advanced", teams: "Advanced" },
        { feature: "Version History", starter: "7 days", elite: "30 days", teams: "Unlimited" }
      ]
    },
    {
      category: "Support & Community",
      items: [
        { feature: "Community Access", starter: true, elite: true, teams: true },
        { feature: "Email Support", starter: true, elite: true, teams: true },
        { feature: "Priority Support", starter: false, elite: true, teams: true },
        { feature: "1-on-1 Consultations", starter: false, elite: false, teams: true },
        { feature: "Advanced Tutorials", starter: "Basic", elite: "All Access", teams: "All Access" }
      ]
    }
  ];

  const renderFeatureValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-5 h-5 text-green-500 mx-auto" />
      ) : (
        <X className="w-5 h-5 text-muted-foreground mx-auto" />
      );
    }
    return <span className="text-sm font-medium">{value}</span>;
  };

  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6">
            Feature Comparison
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            Compare AI Solopreneur Plans
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See exactly what's included in each AI solopreneur pricing plan. 
            Choose the perfect tier for your creative business needs.
          </p>
        </div>

        {/* Mobile-friendly comparison */}
        <div className="lg:hidden space-y-8 mb-16">
          {["Starter", "Elite", "Teams"].map((plan) => (
            <Card key={plan} className="glass border-border">
              <CardHeader>
                <CardTitle className="text-center text-2xl gradient-text">
                  {plan}
                  {plan === "Elite" && (
                    <Badge className="ml-2 bg-primary text-white">Most Popular</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {features.map((category) => (
                  <div key={category.category}>
                    <h4 className="font-semibold text-lg mb-4 text-primary">{category.category}</h4>
                    <div className="space-y-3">
                      {category.items.map((item) => (
                        <div key={item.feature} className="flex justify-between items-center">
                          <span className="text-sm">{item.feature}</span>
                          <div className="text-right">
                            {renderFeatureValue(item[plan.toLowerCase() as keyof typeof item])}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop comparison table */}
        <div className="hidden lg:block">
          <Card className="glass border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-6 font-semibold">Features</th>
                    <th className="text-center p-6 font-semibold text-lg">
                      Starter
                      <div className="text-sm font-normal text-muted-foreground mt-1">$9.99/month</div>
                    </th>
                    <th className="text-center p-6 font-semibold text-lg bg-primary/5 relative">
                      Elite
                      <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs">
                        Most Popular
                      </Badge>
                      <div className="text-sm font-normal text-muted-foreground mt-1">$19.99/month</div>
                    </th>
                    <th className="text-center p-6 font-semibold text-lg">
                      Teams
                      <div className="text-sm font-normal text-muted-foreground mt-1">$29.99/month</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((category) => (
                    <React.Fragment key={category.category}>
                      <tr>
                        <td colSpan={4} className="p-4 bg-muted/50">
                          <h4 className="font-semibold text-primary">{category.category}</h4>
                        </td>
                      </tr>
                      {category.items.map((item, index) => (
                        <tr key={item.feature} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                          <td className="p-4 font-medium">{item.feature}</td>
                          <td className="p-4 text-center">{renderFeatureValue(item.starter)}</td>
                          <td className="p-4 text-center bg-primary/5">{renderFeatureValue(item.elite)}</td>
                          <td className="p-4 text-center">{renderFeatureValue(item.teams)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h3 className="text-2xl font-bold mb-6 gradient-text">
            Ready to Start Your AI Solopreneur Journey?
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6">
              Get Started
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/services">
                View All Features
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingComparison;