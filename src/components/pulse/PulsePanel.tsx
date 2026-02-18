import { X, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PulseChatView } from './PulseChatView';
import { PulseFeedbackView } from './PulseFeedbackView';
import type { PulseMessage } from '@/hooks/usePulseWidget';

interface PulsePanelProps {
  isOpen: boolean;
  activeTab: 'chat' | 'feedback';
  onTabChange: (tab: 'chat' | 'feedback') => void;
  onClose: () => void;
  messages: PulseMessage[];
  isStreaming: boolean;
  quickReplies: string[];
  onSendMessage: (text: string) => void;
  userName: string | null;
}

export const PulsePanel = ({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  messages,
  isStreaming,
  quickReplies,
  onSendMessage,
  userName,
}: PulsePanelProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-32px)] h-[480px] max-h-[70vh] bg-background border rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Pulse</h3>
            <p className="text-xs text-muted-foreground">
              {userName ? `Hi, ${userName.split(' ')[0]}` : 'AI Assistant'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          aria-label="Close Pulse"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => onTabChange(v as 'chat' | 'feedback')}
        className="flex flex-col flex-1 min-h-0"
      >
        <TabsList className="grid grid-cols-2 mx-4 mt-2">
          <TabsTrigger value="chat" className="text-xs">Chat</TabsTrigger>
          <TabsTrigger value="feedback" className="text-xs">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 min-h-0 flex flex-col mt-0">
          <PulseChatView
            messages={messages}
            isStreaming={isStreaming}
            quickReplies={quickReplies}
            onSendMessage={onSendMessage}
          />
        </TabsContent>

        <TabsContent value="feedback" className="flex-1 min-h-0 flex flex-col mt-0">
          <PulseFeedbackView />
        </TabsContent>
      </Tabs>
    </div>
  );
};
