import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, User, Lightbulb, Target, Rocket, CheckCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";

const BizMapAI = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      type: "assistant",
      content: "Welcome to BizMap AI! I'm here to help you transform your business ideas into actionable business plans. What's your business idea or concept you'd like to work on?"
    }
  ]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    setMessages([...messages, { type: "user", content: message }]);
    setMessage("");
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        type: "assistant", 
        content: "That's an exciting goal! Let me help you break this down into actionable steps. First, let's clarify your vision and then we'll create a structured plan to achieve it." 
      }]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const examplePrompts = [
    "I want to start an e-commerce business",
    "I have an idea for a mobile app",
    "I want to open a local restaurant",
    "I'm planning a consulting business"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>BizMap AI - Transform Business Ideas into Action Plans</title>
        <meta name="description" content="Turn your business ideas into actionable business plans with our AI-powered BizMap AI assistant. Get step-by-step guidance to launch and grow your business." />
      </Helmet>
      
      <Navigation />
      
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              BizMap AI
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your business ideas into actionable plans with AI guidance
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Instructions Panel */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    How to Use BizMap AI
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-xs font-semibold text-primary">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Share Your Business Idea</h4>
                        <p className="text-sm text-muted-foreground">Tell me about your business concept, startup idea, or business plan. Be as specific or general as you'd like.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-xs font-semibold text-primary">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Get Business Strategy</h4>
                        <p className="text-sm text-muted-foreground">I'll help you break down your business idea into manageable steps and create a strategic business plan.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-xs font-semibold text-primary">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Receive Business Plan</h4>
                        <p className="text-sm text-muted-foreground">Get a detailed business roadmap with market analysis, financial projections, and actionable next steps.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    What I Can Help With
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      "Business strategy and planning",
                      "Market research and analysis",
                      "Financial planning and projections", 
                      "Marketing and sales strategies",
                      "Product development roadmaps",
                      "Funding and investment guidance",
                      "Operations and scaling plans",
                      "Risk assessment and mitigation"
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-primary" />
                    Try These Examples
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {examplePrompts.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left h-auto p-3"
                        onClick={() => setMessage(prompt)}
                      >
                        "{prompt}"
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-3">
              <Card className="glass-card h-[700px] flex flex-col">
                <CardContent className="flex flex-col h-full p-0">
                  {/* Chat Header */}
                  <div className="p-4 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">BizMap AI Assistant</h4>
                        <p className="text-sm text-muted-foreground">Ready to help you plan your business</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                      <div key={index} className={`flex gap-3 ${msg.type === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          msg.type === "user" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        }`}>
                          {msg.type === "user" ? 
                            <User className="w-4 h-4" /> : 
                            <Bot className="w-4 h-4" />
                          }
                        </div>
                        <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                          msg.type === "user"
                            ? "bg-primary text-primary-foreground rounded-br-none"
                            : "bg-muted rounded-bl-none"
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-border/50">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Describe your business idea or business plan..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage} size="icon">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Share your business idea and I'll help you create a business plan
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BizMapAI;