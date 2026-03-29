import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PitchDeckTemplate } from '@/data/pitchDeckTemplates';
import { ArrowRight, Download, Layers3 } from 'lucide-react';

interface TemplateCardProps {
  template: PitchDeckTemplate;
  onSelect: () => void;
}

function TemplateThumbnail({ template }: { template: PitchDeckTemplate }) {
  const previewSlides = template.slides.slice(0, 3);

  return (
    <div
      className="relative aspect-[16/10] overflow-hidden rounded-[24px] border border-white/10 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.9)]"
      style={{ background: template.previewTheme?.canvas }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0))]" />
      <div
        className="absolute left-4 top-4 h-20 w-20 rounded-full blur-3xl"
        style={{ backgroundColor: template.previewTheme?.accent || '#60a5fa', opacity: 0.35 }}
      />

      <div className="relative flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/65">
              PPT Template
            </p>
            <h3 className="mt-2 max-w-[13rem] text-sm font-semibold leading-5 text-white">
              {template.previewHeadline || template.name}
            </h3>
          </div>
          <div
            className="rounded-full border px-2.5 py-1 text-[10px] font-medium text-white/80"
            style={{ backgroundColor: template.previewTheme?.surface }}
          >
            {template.slideCount} slides
          </div>
        </div>

        <div className="space-y-2">
          {previewSlides.map((slide, index) => (
            <div
              key={`${template.id}-${slide.slideNumber}`}
              className="rounded-2xl border p-3 shadow-sm backdrop-blur"
              style={{
                backgroundColor: template.previewTheme?.surface,
                borderColor: 'rgba(255,255,255,0.12)',
                marginLeft: `${index * 12}px`,
                marginRight: `${Math.max(0, 16 - index * 6)}px`,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">
                    Slide {slide.slideNumber}
                  </p>
                  <p className="truncate text-xs font-medium text-white">{slide.title}</p>
                </div>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: template.previewTheme?.accent || '#60a5fa' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect }) => {
  return (
    <Card
      className="group overflow-hidden rounded-[28px] border-border/60 bg-card/70 transition-all duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_30px_80px_-50px_rgba(15,23,42,0.8)]"
      onClick={onSelect}
    >
      <CardContent className="space-y-5 p-4">
        <TemplateThumbnail template={template} />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize bg-background/60">
              {template.category.replace('-', ' ')}
            </Badge>
            <Badge variant="secondary" className="capitalize">
              {template.stage.replace('-', ' ')}
            </Badge>
          </div>

          <div>
            <h3 className="text-lg font-semibold tracking-tight">{template.name}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {template.description}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Layers3 className="h-3.5 w-3.5" />
              {template.slideCount}-slide structure
            </span>
            {template.downloadUrl && (
              <span className="inline-flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" />
                PPTX included
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-muted/60 text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-4 pb-4 pt-0">
        <Button
          variant="ghost"
          className="w-full justify-between rounded-2xl border border-border/60 bg-background/50 px-4 hover:bg-primary/5"
        >
          Preview template
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Button>
      </CardFooter>
    </Card>
  );
};
