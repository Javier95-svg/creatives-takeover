import React, { useMemo, useState } from 'react';
import { PITCH_DECK_TEMPLATES } from '@/data/pitchDeckTemplates';
import { TemplateCard } from './TemplateCard';
import { TemplateModal } from './TemplateModal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

export const TemplateGallery: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const categories = ['all', 'structure', 'storytelling', 'design', 'industry-specific'];

  const filteredTemplates = useMemo(() => {
    return PITCH_DECK_TEMPLATES.filter((template) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some((tag) => tag.toLowerCase().includes(query));
      const matchesCategory =
        !selectedCategory || selectedCategory === 'all' || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <>
      <div className="mb-8 rounded-[32px] border border-border/60 bg-background/75 p-5 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.8)] backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              Template Library
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Investor-ready deck structures with editable PPT downloads
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Start from a proven narrative and adapt it to your stage, traction profile, and
              fundraising story.
            </p>
          </div>

          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates, tags, or stages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 rounded-2xl border-border/60 bg-background/80 pl-11"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((category) => {
            const isActive =
              (category === 'all' && !selectedCategory) || selectedCategory === category;

            return (
              <Badge
                key={category}
                variant={isActive ? 'default' : 'outline'}
                className="cursor-pointer rounded-full px-4 py-2 capitalize transition-colors"
                onClick={() => setSelectedCategory(category === 'all' ? null : category)}
              >
                {category.replace('-', ' ')}
              </Badge>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={() => setSelectedTemplate(template.id)}
          />
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-border/60 bg-muted/20 py-14 text-center">
          <p className="text-base font-medium">No templates matched that filter</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a broader keyword or switch back to all categories.
          </p>
        </div>
      )}

      {selectedTemplate && (
        <TemplateModal templateId={selectedTemplate} onClose={() => setSelectedTemplate(null)} />
      )}
    </>
  );
};
