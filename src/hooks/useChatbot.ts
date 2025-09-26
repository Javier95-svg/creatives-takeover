import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { chatbotFAQ, getContextualFAQ } from '@/data/chatbotFAQ';
import { FAQItem, FAQUtils } from '@/types/faq';

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
    
    // First try contextual FAQs with enhanced search
    const contextualFAQs = getContextualFAQ(location.pathname);
    let searchResults = FAQUtils.sortByRelevance(contextualFAQs, input);
    
    if (searchResults.length > 0 && searchResults[0].relevanceScore > 3) {
      return searchResults[0];
    }

    // If no contextual match, search all FAQs with enhanced algorithm
    searchResults = FAQUtils.sortByRelevance(chatbotFAQ, input);
    
    // Return best match if relevance score is above threshold
    if (searchResults.length > 0 && searchResults[0].relevanceScore > 2) {
      return searchResults[0];
    }

    return null;
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
        // Use short answer for quick responses if available, otherwise full answer
        const responseContent = content.length < 20 && faqMatch.shortAnswer 
          ? faqMatch.shortAnswer 
          : faqMatch.answer;
        
        botResponse = {
          id: (Date.now() + 1).toString(),
          content: responseContent,
          isBot: true,
          timestamp: new Date(),
          quickActions: faqMatch.quickActions?.sort((a, b) => (a.priority || 10) - (b.priority || 10))
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
            { text: 'Start Planning', action: 'navigate', href: '/dream2plan' }
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