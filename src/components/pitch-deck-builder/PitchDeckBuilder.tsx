import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateGallery } from './TemplateGallery';
import { FrameworkSection } from './FrameworkSection';
import { ToolsSection } from './ToolsSection';

export const PitchDeckBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState('templates');

  return (
    <section className="rounded-[36px] border border-border/60 bg-background/80 p-4 shadow-[0_40px_100px_-70px_rgba(15,23,42,0.9)] backdrop-blur md:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Deck Builder
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Start from a proven template, then sharpen the narrative with frameworks and tools
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Build faster with investor-tested structures, storytelling prompts, and practical
            calculators.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full max-w-xl grid-cols-3 rounded-2xl border border-border/60 bg-muted/40 p-1">
          <TabsTrigger value="templates" className="rounded-xl py-2.5">
            Templates
          </TabsTrigger>
          <TabsTrigger value="frameworks" className="rounded-xl py-2.5">
            Frameworks
          </TabsTrigger>
          <TabsTrigger value="tools" className="rounded-xl py-2.5">
            Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-8">
          <TemplateGallery />
        </TabsContent>

        <TabsContent value="frameworks" className="mt-8">
          <FrameworkSection />
        </TabsContent>

        <TabsContent value="tools" className="mt-8">
          <ToolsSection />
        </TabsContent>
      </Tabs>
    </section>
  );
};
