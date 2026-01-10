import React, { useState, useMemo } from 'react';
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
    return PITCH_DECK_TEMPLATES.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           template.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || selectedCategory === 'all' ||
                             template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <>
      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map(category => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => setSelectedCategory(category === 'all' ? null : category)}
            >
              {category.replace('-', ' ')}
            </Badge>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={() => setSelectedTemplate(template.id)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No templates found matching your search.</p>
        </div>
      )}

      {/* Template Modal */}
      {selectedTemplate && (
        <TemplateModal
          templateId={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </>
  );
};
