import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PITCH_DECK_TEMPLATES } from '@/data/pitchDeckTemplates';
import { Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

interface TemplateModalProps {
  templateId: string;
  onClose: () => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({ templateId, onClose }) => {
  const template = PITCH_DECK_TEMPLATES.find((item) => item.id === templateId);

  if (!template) return null;

  const handleCopyStructure = async () => {
    const structure = template.slides
      .map(
        (slide) =>
          `Slide ${slide.slideNumber}: ${slide.title}\nPurpose: ${slide.purpose}\n${slide.contentGuidelines.join('\n')}`
      )
      .join('\n\n');

    await navigator.clipboard.writeText(structure);
    toast.success('Template structure copied to clipboard');
  };

  const handleDownload = () => {
    if (!template.downloadUrl) {
      toast.info('Download coming soon');
      return;
    }

    const link = document.createElement('a');
    link.href = template.downloadUrl;
    link.download = `${template.id}.pptx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloading PowerPoint template...');
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl overflow-hidden border-border/60 bg-background p-0 sm:max-h-[85vh]">
        <div className="max-h-[85vh] overflow-y-auto">
          <div
            className="relative overflow-hidden border-b border-white/10 px-6 py-6 sm:px-8"
            style={{ background: template.previewTheme?.canvas }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))]" />
            <DialogHeader className="relative max-w-3xl text-left">
              <DialogTitle className="text-2xl font-semibold text-white sm:text-3xl">
                {template.name}
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-white/75">
                {template.description}
              </DialogDescription>
            </DialogHeader>

            <div className="relative mt-5 flex flex-wrap gap-2">
              <Badge className="bg-white/12 text-white hover:bg-white/12">
                {template.slideCount} slides
              </Badge>
              <Badge variant="outline" className="border-white/20 bg-transparent capitalize text-white">
                {template.stage.replace('-', ' ')}
              </Badge>
              {template.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="border-white/12 bg-white/8 text-white/85">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-5 p-6 sm:p-8">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {template.slides.map((slide) => (
                <Card key={slide.slideNumber} className="rounded-[24px] border-border/60 p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold"
                      style={{
                        backgroundColor: template.previewTheme?.surface,
                        color: template.previewTheme?.accent,
                      }}
                    >
                      {slide.slideNumber}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold">{slide.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">{slide.purpose}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {slide.contentGuidelines.slice(0, 4).map((guideline, index) => (
                      <div key={`${slide.slideNumber}-${index}`} className="flex items-start gap-2 text-sm">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: template.previewTheme?.accent }}
                        />
                        <span className="text-muted-foreground">{guideline}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-border/60 pt-2 sm:flex-row">
              <Button onClick={handleCopyStructure} variant="outline" className="flex-1 rounded-2xl">
                <Copy className="mr-2 h-4 w-4" />
                Copy structure
              </Button>
              <Button onClick={handleDownload} className="flex-1 rounded-2xl">
                <Download className="mr-2 h-4 w-4" />
                Download PPT template
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
