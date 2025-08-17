import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Bot, User } from "lucide-react";

const ChatbotSection = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      type: "assistant",
      content: "Hello! I'm your AI assistant. How can I help you today?"
    },
    {
      type: "user", 
      content: "What can you help me with?"
    },
    {
      type: "assistant",
      content: "I can assist with a wide range of tasks including answering questions, writing content, analyzing data, coding help, creative projects, and much more. What would you like to explore?"
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
        content: "I understand your question. Let me help you with that..." 
      }]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <section className="py-24 px-4 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Meet Your AI Assistant
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Experience intelligent conversations with our advanced AI chatbot. 
            Get instant answers, creative solutions, and expert assistance.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Features */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold">Powerful Capabilities</h3>
              <div className="grid gap-4">
                {[
                  "Natural language understanding",
                  "Creative writing and content generation", 
                  "Code analysis and programming help",
                  "Data analysis and insights",
                  "Research and fact-checking",
                  "24/7 availability"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <Card className="glass-card">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-2">Why Choose Our AI?</h4>
                <p className="text-sm text-muted-foreground">
                  Built with cutting-edge technology, our AI assistant provides accurate, 
                  helpful responses while maintaining context throughout your conversation. 
                  It's like having a knowledgeable expert available at any time.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <Card className="glass-card h-[600px] flex flex-col">
            <CardContent className="flex flex-col h-full p-0">
              {/* Chat Header */}
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">AI Assistant</h4>
                    <p className="text-sm text-muted-foreground">Online</p>
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
                    <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
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
                    placeholder="Type your message..."
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
                  Try asking: "What can you help me with?" or "Tell me about AI"
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16">
          <Button size="lg" className="bg-primary hover:bg-primary/90">
            Start Chatting Now
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ChatbotSection;