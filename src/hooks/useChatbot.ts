import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { chatbotFAQ, getContextualFAQ, FAQItem } from '@/data/chatbotFAQ';

export interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  quickActions?: Array<{
    text: string;
    action: string;
    href?: string;
  }>;
}

export const useChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const location = useLocation();

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: '1',
        content: "👋 Hi! I'm your AI assistant. I'm here to help you with any questions about BizMap AI, our business planning platform, pricing, or features. What would you like to know?",
        isBot: true,
        timestamp: new Date(),
        quickActions: [
          { text: 'What is BizMap?', action: 'faq', href: 'what-is-bizmap' },
          { text: 'Pricing Info', action: 'faq', href: 'pricing' },
          { text: 'How It Works', action: 'faq', href: 'how-it-works' },
          { text: 'Start Planning', action: 'navigate', href: '/dream2plan' }
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);

  const findBestMatch = useCallback((userInput: string): FAQItem | null => {
    const input = userInput.toLowerCase();
    
    // First try contextual FAQs
    const contextualFAQs = getContextualFAQ(location.pathname);
    let bestMatch = contextualFAQs.find(item => 
      item.keywords.some(keyword => input.includes(keyword.toLowerCase()))
    );

    // If no contextual match, search all FAQs
    if (!bestMatch) {
      bestMatch = chatbotFAQ.find(item => 
        item.keywords.some(keyword => input.includes(keyword.toLowerCase()))
      );
    }

    return bestMatch || null;
  }, [location.pathname]);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const faqMatch = findBestMatch(content);
      
      let botResponse: ChatMessage;
      
      if (faqMatch) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          content: faqMatch.answer,
          isBot: true,
          timestamp: new Date(),
          quickActions: faqMatch.quickActions
        };
      } else {
        // Default response for unmatched queries
        botResponse = {
          id: (Date.now() + 1).toString(),
          content: "I'd be happy to help! While I don't have a specific answer for that question, I can help you with information about our business planning platform, pricing, features, or connect you with our support team.",
          isBot: true,
          timestamp: new Date(),
          quickActions: [
            { text: 'Contact Support', action: 'navigate', href: '/contact' },
            { text: 'View FAQ', action: 'navigate', href: '/faq' },
            { text: 'Schedule Demo', action: 'navigate', href: '/demo-calls' }
          ]
        };
      }

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
  }, [findBestMatch]);

  const handleQuickAction = useCallback((action: string, href?: string) => {
    if (action === 'navigate' && href) {
      window.location.href = href;
    } else if (action === 'faq' && href) {
      const faqItem = chatbotFAQ.find(item => item.id === href);
      if (faqItem) {
        sendMessage(faqItem.question);
      }
    } else if (action === 'scroll' && href) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [sendMessage]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    messages,
    isTyping,
    sendMessage,
    handleQuickAction,
    clearChat,
    toggleChat,
    setIsOpen
  };
};