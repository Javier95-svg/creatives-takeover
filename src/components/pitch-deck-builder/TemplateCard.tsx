import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PitchDeckTemplate } from '@/data/pitchDeckTemplates';
import { FileText, ArrowRight } from 'lucide-react';

interface TemplateCardProps {
  template: PitchDeckTemplate;
  onSelect: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={onSelect}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="p-3 rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <Badge variant="outline" className="capitalize">
            {template.category.replace('-', ' ')}
          </Badge>
        </div>
        <h3 className="font-semibold text-lg mt-4">{template.name}</h3>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
        <div className="flex flex-wrap gap-2">
          {template.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter>
        <Button variant="ghost" className="w-full group-hover:bg-primary/10">
          View Template
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
