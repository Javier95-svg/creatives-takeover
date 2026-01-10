import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PITCH_DECK_TEMPLATES } from '@/data/pitchDeckTemplates';
import { Download, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface TemplateModalProps {
  templateId: string;
  onClose: () => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({ templateId, onClose }) => {
  const template = PITCH_DECK_TEMPLATES.find(t => t.id === templateId);

  if (!template) return null;

  const handleCopyStructure = () => {
    const structure = template.slides
      .map(slide => `Slide ${slide.slideNumber}: ${slide.title}\n${slide.purpose}\n${slide.contentGuidelines.join('\n')}`)
      .join('\n\n');
    navigator.clipboard.writeText(structure);
    toast.success('Template structure copied to clipboard!');
  };

  const handleDownload = () => {
    if (template.downloadUrl) {
      // Create a temporary link element to trigger download
      const link = document.createElement('a');
      link.href = template.downloadUrl;
      link.download = `${template.id}.pptx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Downloading PowerPoint template...');
    } else {
      toast.info('Download coming soon!');
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Metadata */}
          <div className="flex gap-2 flex-wrap">
            <Badge>{template.slideCount} slides</Badge>
            <Badge variant="outline" className="capitalize">{template.stage.replace('-', ' ')}</Badge>
            {template.tags.map(tag => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>

          {/* Slide Breakdown */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Slide Structure</h3>
            {template.slides.map(slide => (
              <Card key={slide.slideNumber} className="p-4">
                <div className="flex items-start gap-3">
                  <Badge className="shrink-0">{slide.slideNumber}</Badge>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{slide.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{slide.purpose}</p>
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Content Guidelines:</p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {slide.contentGuidelines.map((guideline, idx) => (
                          <li key={idx}>{guideline}</li>
                        ))}
                      </ul>
                    </div>
                    {slide.designTips && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-medium text-primary">Design Tips:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {slide.designTips.map((tip, idx) => (
                            <li key={idx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleCopyStructure} variant="outline" className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              Copy Structure
            </Button>
            <Button onClick={handleDownload} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
