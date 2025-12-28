import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Star } from "lucide-react";
import { EmailTemplate } from "@/types/insighta";

interface EmailTemplateCardProps {
  template: EmailTemplate;
  onViewTemplate: (template: EmailTemplate) => void;
}

const EmailTemplateCard = ({ template, onViewTemplate }: EmailTemplateCardProps) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cold-outreach':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'warm-introduction':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'follow-up':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'thank-you':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'update':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 group border-0 bg-gradient-to-br from-background to-muted/20 h-full flex flex-col cursor-pointer"
      onClick={() => onViewTemplate(template)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2">
              {template.title}
            </h3>
          </div>
          {template.popularity >= 85 && (
            <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 shrink-0 text-xs">
              <Star className="h-3 w-3 fill-current mr-1" />
              Popular
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className={`text-xs font-medium capitalize ${getCategoryColor(template.category)}`}>
            {template.category.replace('-', ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3 flex-grow flex flex-col">
        <p className="text-sm text-muted-foreground line-clamp-3 flex-grow">
          {template.useCase}
        </p>

        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <Button size="sm" className="w-full mt-auto">
          <Mail className="h-3 w-3 mr-1" />
          View Template
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmailTemplateCard;
