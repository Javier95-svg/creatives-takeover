import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, User, Lightbulb, Target, Rocket, CheckCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";

const Dream2Plan = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      type: "assistant",
      content: "Welcome to Dream2Plan! I'm here to help you transform your dreams into actionable plans. What's your dream or goal you'd like to work on?"
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
    "I want to start my own business",
    "I dream of learning a new language",
    "I want to get fit and healthy",
    "I'd like to write a book"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Dream2Plan - Transform Dreams into Action Plans</title>
        <meta name="description" content="Turn your dreams into actionable plans with our AI-powered Dream2Plan assistant. Get step-by-step guidance to achieve your goals." />
      </Helmet>
      
      <Navigation />
      
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Dream2Plan
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your dreams into actionable plans with AI guidance
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Instructions Panel */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    How to Use Dream2Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-xs font-semibold text-primary">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Share Your Dream</h4>
                        <p className="text-sm text-muted-foreground">Tell me about your goal, dream, or aspiration. Be as specific or general as you'd like.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-xs font-semibold text-primary">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Get Strategic Guidance</h4>
                        <p className="text-sm text-muted-foreground">I'll help you break down your dream into manageable steps and create a structured approach.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-xs font-semibold text-primary">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Receive Action Plan</h4>
                        <p className="text-sm text-muted-foreground">Get a detailed roadmap with timelines, milestones, and practical next steps.</p>
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
                      "Career and business goals",
                      "Personal development",
                      "Health and fitness plans", 
                      "Learning new skills",
                      "Creative projects",
                      "Financial objectives",
                      "Relationship goals",
                      "Travel and adventure plans"
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
                        <h4 className="font-semibold">Dream2Plan Assistant</h4>
                        <p className="text-sm text-muted-foreground">Ready to help you plan</p>
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
                        placeholder="Describe your dream or goal..."
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
                      Share your dream and I'll help you create an action plan
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

export default Dream2Plan;