import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateGallery } from './TemplateGallery';
import { FrameworkSection } from './FrameworkSection';
import { ToolsSection } from './ToolsSection';

export const PitchDeckBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState('templates');

  return (
    <div className="max-w-7xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
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
    </div>
  );
};
