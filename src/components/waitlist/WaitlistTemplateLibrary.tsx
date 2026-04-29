import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { WAITLIST_TEMPLATE_LIBRARY, type WaitlistTemplateDefinition } from '@/lib/waitlistTemplates';

interface WaitlistTemplateLibraryProps {
  onSelectTemplate: (template: WaitlistTemplateDefinition) => void;
  onBack: () => void;
}

const categories = ['All', ...WAITLIST_TEMPLATE_LIBRARY.map((template) => template.productType)];

function TemplateMiniPreview({ template }: { template: WaitlistTemplateDefinition }) {
  const content = template.content;
  const colors = content.colors;
  const accent = colors?.buttonBackground || '#4f46e5';

  return (
    <div
      className="relative h-52 overflow-hidden rounded-lg border p-4"
      style={{
        borderColor: colors?.borderColor,
        backgroundColor: colors?.pageBackground,
        color: colors?.textPrimary,
        fontFamily: content.typography?.bodyFamily,
      }}
    >
      <div className="absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] font-semibold" style={{ backgroundColor: accent, color: colors?.buttonText }}>
        {template.previewLabel}
      </div>
      <div className={cn('flex h-full flex-col justify-between', content.layout === 'split' && 'max-w-[64%]')}>
        <div>
          <div className="mb-3 h-2 w-16 rounded-full" style={{ backgroundColor: accent }} />
          <div className="space-y-2">
            <div className="h-4 w-40 rounded" style={{ backgroundColor: colors?.textPrimary, opacity: 0.92 }} />
            <div className="h-4 w-32 rounded" style={{ backgroundColor: colors?.textPrimary, opacity: 0.72 }} />
            <div className="mt-3 h-2 w-44 rounded" style={{ backgroundColor: colors?.textSecondary, opacity: 0.5 }} />
            <div className="h-2 w-36 rounded" style={{ backgroundColor: colors?.textSecondary, opacity: 0.35 }} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 flex-1 rounded border" style={{ borderColor: colors?.borderColor, backgroundColor: colors?.inputBackground }} />
          <div className="h-8 w-20 rounded" style={{ backgroundColor: colors?.buttonBackground }} />
        </div>
      </div>
      {content.layout === 'split' ? (
        <div
          className="absolute bottom-4 right-4 top-12 w-[30%] rounded-lg border"
          style={{ borderColor: colors?.borderColor, background: `linear-gradient(135deg, ${accent}55, transparent)` }}
        />
      ) : null}
    </div>
  );
}

export default function WaitlistTemplateLibrary({ onSelectTemplate, onBack }: WaitlistTemplateLibraryProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return WAITLIST_TEMPLATE_LIBRARY.filter((template) => {
      const matchesCategory = category === 'All' || template.productType === category;
      const matchesQuery =
        !normalizedQuery ||
        template.name.toLowerCase().includes(normalizedQuery) ||
        template.productType.toLowerCase().includes(normalizedQuery) ||
        template.description.toLowerCase().includes(normalizedQuery) ||
        template.bestFor.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-2">
      <div className="flex flex-col gap-4 rounded-[28px] border border-border/60 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl space-y-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-1 -ml-2 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary">Manual Build library</p>
          <h2 className="text-2xl font-semibold md:text-3xl">Choose a founder-grade landing page direction</h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            Every design is built to pitch a product clearly, create early trust, and collect waitlist signups before the MVP exists.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product type..." className="pl-9" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={category === item ? 'default' : 'outline'}
            onClick={() => setCategory(item)}
            className="shrink-0"
          >
            {item}
          </Button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="group overflow-hidden border-border/60 bg-white/85 p-4 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl dark:border-white/10 dark:bg-slate-950/75">
            <TemplateMiniPreview template={template} />
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">{template.name}</h3>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {template.productType}
                  </span>
                </div>
                <p className="mt-2 min-h-12 text-sm leading-relaxed text-muted-foreground">{template.description}</p>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground dark:border-white/10">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{template.bestFor}</span>
              </div>
              <Button className="w-full justify-between" onClick={() => onSelectTemplate(template)}>
                <span>Use this design</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
