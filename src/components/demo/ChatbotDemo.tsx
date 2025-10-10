import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DemoScenario } from "@/utils/demoDataSeeder";
import { MessageSquare, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface ChatbotDemoProps {
  scenario: DemoScenario;
}

const ChatbotDemo = ({ scenario }: ChatbotDemoProps) => {
  const [showFullConversation, setShowFullConversation] = useState(false);
  const navigate = useNavigate();

  const quickActions = [
    "Analyze my competition",
    "Suggest pricing strategy",
    "Create go-to-market plan",
    "Generate launch timeline"
  ];

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
              {scenario.chatHistory.slice(0, showFullConversation ? undefined : 4).map((message, idx) => (
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

              {!showFullConversation && scenario.chatHistory.length > 4 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowFullConversation(true)}
                >
                  Show More Messages
                </Button>
              )}
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
