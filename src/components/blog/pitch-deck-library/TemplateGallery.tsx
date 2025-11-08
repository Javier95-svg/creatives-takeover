import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Zap, Code, Rocket, TrendingUp, Users } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  slides: number;
  icon: any;
  recommended: boolean;
  category: string;
}

interface TemplateGalleryProps {
  onSelectTemplate: (templateId: string) => void;
}

const TemplateGallery = ({ onSelectTemplate }: TemplateGalleryProps) => {
  const templates: Template[] = [
    {
      id: "standard",
      name: "Standard Pitch Deck",
      description: "Complete 9-slide deck covering all essential sections: Problem, Solution, Market, Business Model, Team, and Financials",
      slides: 9,
      icon: FileText,
      recommended: true,
      category: "General"
    },
    {
      id: "quick",
      name: "Quick Pitch",
      description: "Concise 5-slide deck for fast meetings and email introductions. Perfect for initial investor outreach",
      slides: 5,
      icon: Zap,
      recommended: false,
      category: "Quick"
    },
    {
      id: "saas",
      name: "SaaS Product Deck",
      description: "Tailored for SaaS companies with focus on product demo, metrics (MRR, CAC, LTV), and roadmap",
      slides: 9,
      icon: Code,
      recommended: true,
      category: "Industry"
    },
    {
      id: "pre-seed",
      name: "Pre-Seed Deck",
      description: "Early-stage focused deck emphasizing vision, market opportunity, and founder story",
      slides: 8,
      icon: Rocket,
      recommended: false,
      category: "Stage"
    },
    {
      id: "series-a",
      name: "Series A Deck",
      description: "Growth-stage deck with emphasis on traction, unit economics, and scaling strategy",
      slides: 12,
      icon: TrendingUp,
      recommended: false,
      category: "Stage"
    },
    {
      id: "b2b",
      name: "B2B Enterprise",
      description: "Enterprise-focused deck highlighting customer logos, case studies, and ROI",
      slides: 10,
      icon: Users,
      recommended: false,
      category: "Industry"
    }
  ];

  const getIconComponent = (Icon: any) => <Icon className="w-8 h-8" />;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-3xl font-bold mb-4">Choose Your Template</h3>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Select a professionally designed template to get started. All templates are fully customizable.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card 
            key={template.id}
            className={"hover:shadow-xl transition-all cursor-pointer " + (template.recommended ? "border-primary border-2" : "")}
          >
            <CardHeader>
              <div className="flex items-start justify-between mb-3">
                <div className={"w-16 h-16 rounded-lg flex items-center justify-center " + (template.recommended ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  {getIconComponent(template.icon)}
                </div>
                {template.recommended && (
                  <Badge className="bg-primary">Recommended</Badge>
                )}
              </div>
              <CardTitle className="text-xl">{template.name}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <Badge variant="outline">{template.category}</Badge>
                <span className="text-muted-foreground">{template.slides} slides</span>
              </div>
              <Button 
                className="w-full"
                onClick={() => onSelectTemplate(template.id)}
                variant={template.recommended ? "default" : "outline"}
              >
                Use This Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3">What is included in every template:</h4>
          <ul className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">✓ Professional design and layout</li>
            <li className="flex items-center gap-2">✓ Guided content for each slide</li>
            <li className="flex items-center gap-2">✓ Customizable colors and fonts</li>
            <li className="flex items-center gap-2">✓ Export to PDF for presentations</li>
            <li className="flex items-center gap-2">✓ Add/remove/reorder slides</li>
            <li className="flex items-center gap-2">✓ Built-in best practices</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateGallery;
