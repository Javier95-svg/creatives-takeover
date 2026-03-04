import React, { useState } from 'react';
import { useMVPBuilder } from '@/hooks/useMVPBuilder';
import { MVPBuilderHeader } from './MVPBuilderHeader';
import { MVPBuilderChat } from './MVPBuilderChat';
import { MVPBuilderPreview } from './MVPBuilderPreview';
import { Button } from '@/components/ui/button';
import { MessageSquare, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

type MobileTab = 'chat' | 'preview';

export const MVPBuilder: React.FC = () => {
  const { messages, currentHtml, isGenerating, projectName, setProjectName, sendMessage, resetProject } =
    useMVPBuilder();

  // Mobile tab state (hidden on desktop via CSS)
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Header spans full width */}
      <MVPBuilderHeader
        projectName={projectName}
        setProjectName={setProjectName}
        onNewProject={resetProject}
      />

      {/* Desktop: side-by-side split. Mobile: tabs */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Mobile tab bar */}
        <div className="flex md:hidden border-b border-border/50 bg-background shrink-0">
          <Button
            variant="ghost"
            className={cn(
              'flex-1 rounded-none h-9 text-xs gap-1.5',
              mobileTab === 'chat' && 'border-b-2 border-primary text-primary'
            )}
            onClick={() => setMobileTab('chat')}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat
          </Button>
          <Button
            variant="ghost"
            className={cn(
              'flex-1 rounded-none h-9 text-xs gap-1.5',
              mobileTab === 'preview' && 'border-b-2 border-primary text-primary'
            )}
            onClick={() => setMobileTab('preview')}
          >
            <Monitor className="h-3.5 w-3.5" />
            Preview
          </Button>
        </div>

        {/* Split pane */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[38%_62%]">
          {/* Chat panel */}
          <div
            className={cn(
              'min-h-0',
              mobileTab !== 'chat' ? 'hidden md:block' : 'block'
            )}
          >
            <MVPBuilderChat
              messages={messages}
              onSend={sendMessage}
              isGenerating={isGenerating}
            />
          </div>

          {/* Preview panel */}
          <div
            className={cn(
              'min-h-0',
              mobileTab !== 'preview' ? 'hidden md:block' : 'block'
            )}
          >
            <MVPBuilderPreview html={currentHtml} isGenerating={isGenerating} />
          </div>
        </div>
      </div>
    </div>
  );
};
