import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, X } from "lucide-react";

interface ExampleTemplate {
  id: string;
  emoji: string;
  title: string;
  businessModel: string;
  targetAudience: string;
  description: string;
  category: string;
  promptMessage: string;
}

const templates: ExampleTemplate[] = [
  {
    id: "childcare-app",
    emoji: "📱",
    title: "Mobile App - Childcare Booking",
    businessModel: "B2C Subscription",
    targetAudience: "Busy parents",
    description: "On-demand vetted caregiver marketplace that solves last-minute childcare needs",
    category: "Mobile App",
    promptMessage: "I want to create a mobile app that helps busy parents with last-minute childcare needs. My idea is an on-demand marketplace where parents can book verified, vetted caregivers instantly when their regular childcare falls through or they need emergency coverage."
  },
  {
    id: "saas-pm-tool",
    emoji: "💼",
    title: "SaaS - Project Management Tool",
    businessModel: "B2B Freemium",
    targetAudience: "Creative teams (5-50 people)",
    description: "Visual project management with mood boards and client portals built specifically for creative workflows",
    category: "SaaS",
    promptMessage: "I want to create a SaaS project management tool that helps creative teams with 5-50 people manage their workflows. My idea is a visual PM platform with integrated mood boards and client portals, designed specifically for creative agencies and design teams who need more than traditional task management."
  },
  {
    id: "sustainable-fashion",
    emoji: "🌿",
    title: "E-commerce - Sustainable Fashion",
    businessModel: "B2C Direct-to-Consumer",
    targetAudience: "Eco-conscious shoppers",
    description: "Curated marketplace with sustainability scores featuring only verified sustainable brands",
    category: "E-commerce",
    promptMessage: "I want to create an e-commerce platform that helps eco-conscious shoppers find truly sustainable fashion. My idea is a curated marketplace where every brand is verified for sustainability practices, with transparency scores showing environmental impact, ethical labor practices, and material sourcing."
  }
];

interface ExampleConversationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: ExampleTemplate) => void;
}

export const ExampleConversations = ({ open, onOpenChange, onSelectTemplate }: ExampleConversationsProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelectTemplate = (template: ExampleTemplate) => {
    setSelectedId(template.id);
    setTimeout(() => {
      onSelectTemplate(template);
      onOpenChange(false);
      setSelectedId(null);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Example Business Ideas</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground">
            Get inspired by these complete examples or use them as a starting point for your own idea
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 animate-fade-in">
          {templates.map((template, index) => (
            <Card
              key={template.id}
              className={`group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1 border-2 ${
                selectedId === template.id ? 'border-primary shadow-lg scale-[1.02]' : 'border-border hover:border-primary/50'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-4xl group-hover:scale-110 transition-transform duration-300">
                    {template.emoji}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {template.category}
                  </Badge>
                </div>
                <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                  {template.title}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-fit">Model:</span>
                    <span className="text-muted-foreground">{template.businessModel}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-fit">Audience:</span>
                    <span className="text-muted-foreground">{template.targetAudience}</span>
                  </div>
                </div>

                <CardDescription className="text-sm leading-relaxed min-h-[3rem]">
                  {template.description}
                </CardDescription>

                <Button
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full group/button hover:shadow-md transition-all duration-300 min-h-[44px]"
                  size="default"
                  disabled={selectedId === template.id}
                >
                  {selectedId === template.id ? (
                    <>Loading...</>
                  ) : (
                    <>
                      Start with this template
                      <ArrowRight className="ml-2 h-4 w-4 group-hover/button:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
          <p className="text-sm text-muted-foreground text-center">
            💡 <strong>Tip:</strong> These templates will pre-fill the conversation to help you get started quickly. 
            You can modify any details to match your specific vision.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
