import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PITCH_DECK_TOOLS } from '@/data/pitchDeckTools';
import {
  Calculator,
  Grid3x3,
  CheckSquare,
  MessageSquare,
  FileText,
  ExternalLink,
  BookOpen,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { MarketSizeCalculatorModal } from './tools/MarketSizeCalculatorModal';
import { StorytellingPlaybookModal } from './tools/StorytellingPlaybookModal';
import { InvestorQAPrepModal } from './tools/InvestorQAPrepModal';
import { OneLinerGeneratorModal } from './tools/OneLinerGeneratorModal';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator,
  Grid3x3,
  CheckSquare,
  MessageSquare,
  FileText,
  ExternalLink,
  BookOpen,
  HelpCircle
};

const categoryColors: Record<string, string> = {
  generator: 'bg-blue-100 text-blue-700 border-blue-200',
  validator: 'bg-green-100 text-green-700 border-green-200',
  helper: 'bg-purple-100 text-purple-700 border-purple-200',
  resource: 'bg-orange-100 text-orange-700 border-orange-200'
};

export const ToolsSection: React.FC = () => {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const handleToolAction = (tool: typeof PITCH_DECK_TOOLS[0]) => {
    if (tool.actionType === 'modal') {
      setActiveModal(tool.id);
    } else if (tool.actionType === 'link') {
      window.open(tool.action, '_blank');
    } else if (tool.actionType === 'download') {
      const link = document.createElement('a');
      link.href = tool.action;
      link.download = tool.action.split('/').pop() || 'download.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Downloading resource...');
    }
  };

  const groupedTools = PITCH_DECK_TOOLS.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, typeof PITCH_DECK_TOOLS>);

  return (
    <>
      <div className="space-y-8">
        {Object.entries(groupedTools).map(([category, tools]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold capitalize mb-4">{category}s</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.map(tool => {
                const IconComponent = iconMap[tool.icon] || FileText;

                return (
                  <Card key={tool.id} className="hover:shadow-md transition-shadow group">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold">{tool.name}</h4>
                            <Badge
                              variant="outline"
                              className={`text-xs capitalize ${categoryColors[tool.category]}`}
                            >
                              {tool.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{tool.description}</p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <Button
                        variant="ghost"
                        className="w-full group-hover:bg-primary/10"
                        onClick={() => handleToolAction(tool)}
                      >
                        {tool.actionType === 'download' ? 'Download' : 'Open Tool'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {activeModal === 'market-size-calculator' && (
        <MarketSizeCalculatorModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'storytelling-playbook' && (
        <StorytellingPlaybookModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'investor-qa-prep' && (
        <InvestorQAPrepModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'one-liner-generator' && (
        <OneLinerGeneratorModal onClose={() => setActiveModal(null)} />
      )}
    </>
  );
};
