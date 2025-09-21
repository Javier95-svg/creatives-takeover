import { useState, useCallback } from 'react';

interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
}

interface ChatFlow {
  step: 'greeting' | 'interest' | 'features' | 'demo' | 'ended';
  userInfo: {
    name?: string;
    interest?: string;
    experience?: string;
  };
}

const CONVERSATION_FLOWS = {
  greeting: {
    message: "Hi! I'm your AI assistant. I'm here to help you discover how our platform can transform your business ideas into reality. What brings you here today?",
    options: [
      { text: "I want to validate a business idea", value: "validation" },
      { text: "I need help with market research", value: "research" },
      { text: "I'm looking for business planning tools", value: "planning" },
      { text: "Just browsing", value: "browsing" }
    ]
  },
  interest: {
    validation: "Perfect! Our Dream2Plan tool helps you validate ideas through AI-powered market analysis. Would you like to see how it works?",
    research: "Great choice! We provide real-time market intelligence and competitor analysis. Want to explore our research features?",
    planning: "Excellent! Our sprint-based planning system breaks down complex business goals into actionable tasks. Interested in a demo?",
    browsing: "No problem! Feel free to explore. I'm here if you have any questions about our features or want to see what we can do for you."
  },
  features: {
    message: "Here's what makes us special:\n\n🎯 AI-powered business validation\n📊 Real-time market research\n🚀 Sprint-based action planning\n👥 Community collaboration\n📞 Live demo calls\n\nWhat interests you most?"
  },
  demo: {
    message: "I'd love to show you around! You can either:\n\n✨ Try our Dream2Plan tool right now (it's free!)\n📅 Join our next community demo call\n💬 Continue chatting with me for a quick tour\n\nWhat sounds best?"
  }
};

export const useChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [flow, setFlow] = useState<ChatFlow>({
    step: 'greeting',
    userInfo: {}
  });
  const [isTyping, setIsTyping] = useState(false);

  const addMessage = useCallback((content: string, isBot: boolean = false) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      isBot,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const handleUserResponse = useCallback((response: string, value?: string) => {
    addMessage(response, false);
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      let botResponse = '';
      let nextStep: ChatFlow['step'] = flow.step;

      switch (flow.step) {
        case 'greeting':
          if (value) {
            flow.userInfo.interest = value;
            botResponse = CONVERSATION_FLOWS.interest[value as keyof typeof CONVERSATION_FLOWS.interest] || CONVERSATION_FLOWS.interest.browsing;
            nextStep = 'features';
          }
          break;
        case 'features':
          botResponse = CONVERSATION_FLOWS.demo.message;
          nextStep = 'demo';
          break;
        case 'demo':
          if (response.toLowerCase().includes('dream2plan') || response.toLowerCase().includes('try')) {
            botResponse = "Perfect! I'll take you to Dream2Plan where you can start validating your business idea. It's completely free and takes just a few minutes!";
            setTimeout(() => {
              window.location.href = '/dream2plan';
            }, 2000);
          } else if (response.toLowerCase().includes('demo') || response.toLowerCase().includes('call')) {
            botResponse = "Great! I'll show you our upcoming demo calls where you can see real entrepreneurs presenting their validated business ideas.";
            setTimeout(() => {
              window.location.href = '/demo-calls';
            }, 2000);
          } else {
            botResponse = "I'm here to help! What would you like to know more about? Our AI validation tools, market research features, or community collaboration?";
          }
          nextStep = 'ended';
          break;
        default:
          botResponse = "Thanks for chatting! Feel free to explore the platform, and don't hesitate to reach out if you need any help. Good luck with your entrepreneurial journey! 🚀";
      }

      setFlow(prev => ({ ...prev, step: nextStep }));
      addMessage(botResponse, true);
      setIsTyping(false);
    }, 1500);
  }, [flow, addMessage]);

  const openChat = useCallback(() => {
    setIsOpen(true);
    if (messages.length === 0) {
      setTimeout(() => {
        addMessage(CONVERSATION_FLOWS.greeting.message, true);
      }, 500);
    }
  }, [messages.length, addMessage]);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    messages,
    flow,
    isTyping,
    openChat,
    closeChat,
    handleUserResponse,
    conversationOptions: flow.step === 'greeting' ? CONVERSATION_FLOWS.greeting.options : []
  };
};