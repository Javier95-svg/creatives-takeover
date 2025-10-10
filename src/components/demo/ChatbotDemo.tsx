import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DemoScenario } from "@/utils/demoDataSeeder";
import { MessageSquare, Sparkles, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

interface ChatbotDemoProps {
  scenario: DemoScenario;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const ChatbotDemo = ({ scenario }: ChatbotDemoProps) => {
  const [messages, setMessages] = useState<Message[]>(scenario.chatHistory);
  const [showFullConversation, setShowFullConversation] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const quickActions = [
    "Analyze my competition",
    "Suggest pricing strategy",
    "Create go-to-market plan",
    "Generate launch timeline"
  ];

  const quickActionResponses: Record<string, string> = {
    "Analyze my competition": `Great question! Based on your ${scenario.industry || 'industry'}, here's a competitive analysis:\n\n🎯 **Main Competitors:**\n• Direct competitors offering similar solutions\n• Indirect competitors solving the problem differently\n• Emerging startups in your space\n\n💡 **Your Competitive Advantages:**\n• Unique value proposition\n• Better user experience\n• More affordable pricing\n• Faster implementation\n\nWould you like me to dive deeper into any specific competitor?`,
    "Suggest pricing strategy": `Let me help you develop a pricing strategy for your business:\n\n💰 **Recommended Pricing Model:**\n• Freemium: Free basic tier + paid premium features\n• Starter: $29/month (individual users)\n• Professional: $99/month (small teams)\n• Enterprise: Custom pricing (large organizations)\n\n📊 **Pricing Psychology:**\n• Anchor with highest tier first\n• Offer annual discount (20% off)\n• Add 14-day free trial\n• Clear upgrade path\n\nShould we refine this based on your target market?`,
    "Create go-to-market plan": `Excellent! Here's your go-to-market strategy:\n\n🚀 **Phase 1: Pre-Launch (Weeks 1-4)**\n• Build landing page & waitlist\n• Create social media presence\n• Reach out to early adopters\n\n📢 **Phase 2: Soft Launch (Weeks 5-8)**\n• Launch to beta users\n• Gather feedback\n• Iterate on product\n\n🎉 **Phase 3: Public Launch (Weeks 9-12)**\n• Product Hunt launch\n• Press releases\n• Influencer partnerships\n• Paid advertising campaigns\n\nReady to start with Phase 1?`,
    "Generate launch timeline": `Here's your personalized launch timeline:\n\n📅 **Month 1: Foundation**\nWeek 1-2: MVP development\nWeek 3-4: Beta testing\n\n📅 **Month 2: Preparation**\nWeek 5-6: Marketing materials\nWeek 7-8: Early access program\n\n📅 **Month 3: Launch**\nWeek 9: Soft launch\nWeek 10-11: Gather feedback\nWeek 12: Public launch 🎉\n\n📅 **Month 4+: Growth**\nOngoing: Customer acquisition\nOngoing: Product improvements\n\nWould you like help breaking down any of these phases?`
  };

  const handleQuickAction = async (action: string) => {
    setMessages(prev => [...prev, { role: 'user', content: action }]);
    setShowFullConversation(true);
    setIsTyping(true);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const response = quickActionResponses[action] || "That's a great question! Let me help you with that. In the full version, I can provide detailed analysis and actionable insights tailored to your specific business needs.";
    
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setIsTyping(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">AI Chatbot Demo</h2>
              <p className="text-sm text-muted-foreground">
                Experience the 7-step business planning wizard
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            <Sparkles className="h-3 w-3 mr-1" />
            AI-Powered
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Empathetic AI</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Natural conversations that understand your goals
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Context Memory</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Remembers details across entire conversation
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Smart Insights</span>
            </div>
            <p className="text-xs text-muted-foreground">
              AI analyzes your answers for success factors
            </p>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <Card className="glass-card">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Sample Conversation</h3>
            <p className="text-sm text-muted-foreground">
              See how the AI guides {scenario.name} through business planning
            </p>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {messages.slice(0, showFullConversation ? undefined : 4).map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-4 rounded-lg bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}

              {!showFullConversation && messages.length > 4 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowFullConversation(true)}
                >
                  Show More Messages
                </Button>
              )}

              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm font-semibold mb-3">AI-Suggested Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="justify-start text-sm"
                  onClick={() => handleQuickAction(action)}
                  disabled={isTyping}
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Features Highlight */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Chatbot Capabilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-primary">✅ Natural Language Understanding</h4>
            <p className="text-sm text-muted-foreground">
              Ask questions naturally - no technical jargon needed
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-primary">✅ Industry-Specific Insights</h4>
            <p className="text-sm text-muted-foreground">
              AI trained on thousands of successful business plans
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-primary">✅ Progress Tracking</h4>
            <p className="text-sm text-muted-foreground">
              See your completion status with celebrations at milestones
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-primary">✅ Export to PDF</h4>
            <p className="text-sm text-muted-foreground">
              Get a professional launch report when complete
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Button size="lg" onClick={() => navigate('/dream2plan')}>
          Try the Full Chatbot Experience
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          Start building your own business plan with AI guidance
        </p>
      </div>
    </div>
  );
};

export default ChatbotDemo;
