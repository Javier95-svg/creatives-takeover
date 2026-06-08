import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePulseWidget } from '@/hooks/usePulseWidget';
import { useIsMobile } from '@/hooks/use-mobile';
import { PulseBubble } from './PulseBubble';
import { PulseProactiveMessage } from './PulseProactiveMessage';
import { PulsePanel } from './PulsePanel';

const PulseWidget = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const compactMobileHomepage = isMobile && location.pathname === '/';
  const {
    isOpen,
    activeTab,
    setActiveTab,
    openPanel,
    closePanel,
    proactiveMessage,
    proactiveVisible,
    dismissProactive,
    messages,
    isStreaming,
    sendMessage,
    getQuickReplies,
    userName,
  } = usePulseWidget();

  // Close panel on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closePanel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closePanel]);

  return (
    <>
      {/* Proactive message bubble */}
      {proactiveVisible && proactiveMessage && !isOpen && (
        <PulseProactiveMessage
          message={proactiveMessage}
          onDismiss={dismissProactive}
          onClick={openPanel}
        />
      )}

      {/* Chat panel */}
      <PulsePanel
        isOpen={isOpen}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onClose={closePanel}
        messages={messages}
        isStreaming={isStreaming}
        quickReplies={getQuickReplies()}
        onSendMessage={sendMessage}
        userName={userName}
        compactMobileHomepage={compactMobileHomepage}
      />

      {/* Floating bubble (hidden when panel is open) */}
      {!isOpen && (
        <PulseBubble
          hasUnread={proactiveVisible}
          onClick={openPanel}
          compactMobileHomepage={compactMobileHomepage}
        />
      )}
    </>
  );
};

export default PulseWidget;
