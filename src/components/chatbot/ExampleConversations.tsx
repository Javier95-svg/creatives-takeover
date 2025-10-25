import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Rocket, X, TrendingUp, Users, DollarSign, Target } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExampleBusiness {
  id: string;
  name: string;
  tagline: string;
  industry: string;
  businessModel: string;
  description: string;
  targetMarket: string;
  solution: string;
  keyMetrics: string[];
  answers: Record<string, string>;
}

const exampleBusinesses: ExampleBusiness[] = [
  {
    id: "childcare-app",
    name: "KiddoCare Connect",
    tagline: "On-demand childcare, simplified",
    industry: "Mobile App",
    businessModel: "B2C Subscription",
    description: "A mobile app connecting parents with verified, background-checked babysitters and daycare providers in their area for on-demand and scheduled childcare.",
    targetMarket: "Working parents aged 28-45 with household income $75K+, primarily in urban areas. Tech-savvy, value convenience and safety.",
    solution: "Real-time booking, GPS tracking, background-verified caregivers, in-app payments, review system, and emergency contact features.",
    keyMetrics: [
      "Monthly Active Users (MAU): Target 10K in Year 1",
      "Subscription Rate: $29.99/month or $12.99 per booking",
      "Caregiver Network: 500+ verified providers",
      "Average Booking Value: $45"
    ],
    answers: {
      businessIdea: "Mobile app for on-demand childcare booking",
      targetMarket: "Working parents in urban areas aged 28-45",
      industry: "Mobile App",
      problem: "Parents struggle to find trusted, available childcare on short notice",
      solution: "App connecting parents with verified caregivers instantly",
      goals: "10K users in Year 1, become the Uber of childcare",
      pricing: "Subscription model at $29.99/month or pay-per-booking"
    }
  },
  {
    id: "project-management-saas",
    name: "FlowSync",
    tagline: "Where teams flow in perfect sync",
    industry: "SaaS",
    businessModel: "B2B Freemium",
    description: "AI-powered project management platform that automatically optimizes team workflows, predicts bottlenecks, and suggests resource allocation improvements.",
    targetMarket: "Small to mid-size tech companies (10-100 employees), remote-first teams, agencies, and consulting firms. Decision-makers are CTOs, COOs, and Project Managers.",
    solution: "Intelligent task automation, predictive analytics for project timelines, AI-suggested task assignments, real-time collaboration, and integrations with Slack, GitHub, and Google Workspace.",
    keyMetrics: [
      "Free Users: 5,000 in first 6 months",
      "Conversion Rate: 8% free-to-paid",
      "MRR Target: $50K by Month 12",
      "Pricing: Free tier, Pro at $15/user/month, Enterprise custom"
    ],
    answers: {
      businessIdea: "AI-powered project management SaaS",
      targetMarket: "Small to mid-size tech companies with remote teams",
      industry: "SaaS",
      problem: "Project managers waste hours on manual task assignment and timeline adjustments",
      solution: "AI that predicts bottlenecks and auto-optimizes workflows",
      goals: "Reach $50K MRR within 12 months, 5,000 free users",
      pricing: "Freemium: Free tier, $15/user/month Pro, custom Enterprise"
    }
  },
  {
    id: "sustainable-fashion",
    name: "EcoThreads",
    tagline: "Fashion that doesn't cost the Earth",
    industry: "E-commerce",
    businessModel: "B2C E-commerce",
    description: "Direct-to-consumer sustainable fashion brand offering stylish, affordable clothing made from recycled and organic materials with full supply chain transparency.",
    targetMarket: "Environmentally conscious millennials and Gen Z (ages 22-38), primarily women, income $40K-$80K, active on social media, value transparency and ethics.",
    solution: "Curated collection of sustainable basics and trend pieces, virtual try-on AR feature, carbon-neutral shipping, repair/recycle program, and transparent pricing breakdown showing environmental impact.",
    keyMetrics: [
      "Average Order Value: $85",
      "Target: 500 orders/month by Month 6",
      "Customer Acquisition Cost: $25",
      "Profit Margin: 45% after marketing"
    ],
    answers: {
      businessIdea: "Sustainable fashion e-commerce brand",
      targetMarket: "Eco-conscious millennials and Gen Z, ages 22-38",
      industry: "E-commerce",
      problem: "Sustainable fashion is either too expensive or lacks style",
      solution: "Affordable, stylish clothes from recycled materials with transparent supply chain",
      goals: "500 orders/month by Month 6, build community of 10K followers",
      pricing: "$45-$120 per item, 45% margin after costs"
    }
  }
];

interface ExampleConversationsProps {
  onSelectTemplate: (answers: Record<string, string>, businessName: string) => void;
}

export const ExampleConversations = ({ onSelectTemplate }: ExampleConversationsProps) => {
  const [open, setOpen] = useState(false);

  const handleSelectTemplate = (example: ExampleBusiness) => {
    onSelectTemplate(example.answers, example.name);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="gap-2 hover:scale-105 transition-transform">
          <Lightbulb className="h-4 w-4" />
          See Examples
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-3 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Rocket className="h-6 w-6 text-primary" />
                Example Business Plans
              </DialogTitle>
              <DialogDescription className="mt-2">
                Start with a proven template and customize it for your business
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-[calc(90vh-120px)] px-6 pb-6">
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1 mt-4">
            {exampleBusinesses.map((example) => (
              <Card 
                key={example.id} 
                className="group hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {example.industry}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {example.businessModel}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        {example.name}
                      </CardTitle>
                      <CardDescription className="text-sm italic mt-1">
                        "{example.tagline}"
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {example.description}
                    </p>
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Users className="h-3 w-3" />
                        Target Market
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">
                        {example.targetMarket}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Target className="h-3 w-3" />
                        Solution
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">
                        {example.solution}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      Key Metrics
                    </div>
                    <ul className="space-y-1">
                      {example.keyMetrics.map((metric, idx) => (
                        <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                          <DollarSign className="h-3 w-3 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                          {metric}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Button 
                    onClick={() => handleSelectTemplate(example)}
                    className="w-full mt-4 group-hover:shadow-md transition-shadow"
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    Start with this template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
