import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { Link } from "react-router-dom";

const FeatureComparison = () => {
  const features = [
    {
      category: "Creative Assets",
      items: [
        { feature: "Template Library Access", starter: "1,000+", plus: "Unlimited", family: "Unlimited" },
        { feature: "Stock Photos", starter: "100/month", plus: "Unlimited", family: "Unlimited" },
        { feature: "Custom Fonts", starter: "50", plus: "500+", family: "500+" },
        { feature: "Vector Graphics", starter: false, plus: true, family: true },
        { feature: "Premium Assets", starter: false, plus: true, family: true }
      ]
    },
    {
      category: "AI-Powered Tools",
      items: [
        { feature: "AI Design Assistant", starter: "Basic", plus: "Advanced", family: "Advanced" },
        { feature: "Auto Background Removal", starter: "10/month", plus: "Unlimited", family: "Unlimited" },
        { feature: "Smart Crop & Resize", starter: true, plus: true, family: true },
        { feature: "AI Content Generation", starter: false, plus: true, family: true },
        { feature: "Brand Style Analysis", starter: false, plus: true, family: true }
      ]
    },
    {
      category: "Collaboration & Sharing",
      items: [
        { feature: "Team Members", starter: "1", plus: "3", family: "6" },
        { feature: "Shared Workspaces", starter: false, plus: true, family: true },
        { feature: "Real-time Collaboration", starter: false, plus: true, family: true },
        { feature: "Comment & Review System", starter: false, plus: true, family: true },
        { feature: "Version History", starter: "7 days", plus: "30 days", family: "Unlimited" }
      ]
    },
    {
      category: "Export & Quality",
      items: [
        { feature: "Export Formats", starter: "PNG, JPG", plus: "All Formats", family: "All Formats" },
        { feature: "Maximum Resolution", starter: "1080p", plus: "4K", family: "4K" },
        { feature: "Bulk Export", starter: false, plus: true, family: true },
        { feature: "Print Quality", starter: false, plus: true, family: true },
        { feature: "Commercial License", starter: false, plus: true, family: true }
      ]
    },
    {
      category: "Support & Training",
      items: [
        { feature: "Support Response Time", starter: "48 hours", plus: "12 hours", family: "6 hours" },
        { feature: "Live Chat", starter: false, plus: true, family: true },
        { feature: "Phone Support", starter: false, plus: false, family: true },
        { feature: "Dedicated Account Manager", starter: false, plus: false, family: true },
        { feature: "Creative Workshops", starter: false, plus: "Monthly", family: "Weekly" }
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
    <section className="py-20 bg-muted/30" id="feature-comparison">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl font-bold mb-6 gradient-text">
            Feature Comparison
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Compare all features across our membership tiers to find the perfect plan for your creative needs.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Mobile-friendly comparison */}
          <div className="lg:hidden space-y-6">
            {["Starter", "Plus", "Family"].map((plan) => (
              <Card key={plan} className="glass border-border">
                <CardHeader>
                  <CardTitle className="text-center text-2xl gradient-text">{plan}</CardTitle>
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
                      <th className="text-center p-6 font-semibold text-lg">Starter</th>
                      <th className="text-center p-6 font-semibold text-lg bg-primary/5 relative">
                        Plus
                        <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Popular</span>
                      </th>
                      <th className="text-center p-6 font-semibold text-lg">Family</th>
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
                            <td className="p-4 text-center bg-primary/5">{renderFeatureValue(item.plus)}</td>
                            <td className="p-4 text-center">{renderFeatureValue(item.family)}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="#pricing-plans">
                Choose Your Plan
              </Link>
            </Button>
            <div className="flex justify-center space-x-6 mt-6 text-sm text-muted-foreground">
              <Link to="/services" className="hover:text-primary transition-colors">
                View All Services →
              </Link>
              <Link to="/faq" className="hover:text-primary transition-colors">
                Have Questions? →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureComparison;