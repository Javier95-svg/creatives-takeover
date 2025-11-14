import { ArrowRight, FileText, TrendingUp, Users, CheckSquare } from "lucide-react";
import { Link } from "react-router-dom";
import PageSection from "@/components/PageSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const guides = [
  {
    id: "pitch-deck",
    title: "How to Create a Pitch Deck",
    description: "Learn essential slides, storytelling tips, and get downloadable templates for your startup pitch.",
    icon: FileText,
    sections: 7,
    readTime: "12 min",
    color: "blue",
    url: "/insighta/pitch-deck",
  },
  {
    id: "funding-works",
    title: "How Startup Funding Works",
    description: "Understand VC, angels, grants, and choose the right funding path for your startup journey.",
    icon: TrendingUp,
    sections: 7,
    readTime: "15 min",
    color: "green",
    url: "/insighta/funding-works",
  },
  {
    id: "investor-discovery",
    title: "Investor Discovery + Outreach",
    description: "Find the right investors, craft compelling outreach messages, and track your conversations.",
    icon: Users,
    sections: 6,
    readTime: "10 min",
    color: "purple",
    url: "/insighta/investor-discovery",
  },
  {
    id: "fundraising-checklist",
    title: "Fundraising Checklist & Roadmap",
    description: "Interactive step-by-step checklist to guide you from defining needs to closing your deal.",
    icon: CheckSquare,
    sections: 6,
    readTime: "8 min",
    color: "orange",
    url: "/insighta/fundraising-checklist",
  },
];

const colorClasses = {
  blue: "hover:border-blue-500/50 group-hover:text-blue-500",
  green: "hover:border-green-500/50 group-hover:text-green-500",
  purple: "hover:border-purple-500/50 group-hover:text-purple-500",
  orange: "hover:border-orange-500/50 group-hover:text-orange-500",
};

const FundingToolkitSection = () => {
  return (
    <PageSection className="bg-muted/30">
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold">Funding Toolkit</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Essential guides to help you navigate the fundraising journey—from crafting your pitch to closing the deal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {guides.map((guide) => {
            const Icon = guide.icon;
            return (
              <Link key={guide.id} to={guide.url} className="group">
                <Card className={`h-full transition-all duration-300 hover:shadow-lg ${colorClasses[guide.color as keyof typeof colorClasses]}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-3 rounded-lg bg-muted group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-6 w-6 text-foreground" />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{guide.sections} sections</span>
                        <span>•</span>
                        <span>{guide.readTime}</span>
                      </div>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {guide.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {guide.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full group/btn">
                      <span>Learn More</span>
                      <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </PageSection>
  );
};

export default FundingToolkitSection;
