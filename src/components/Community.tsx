import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Image, Video, Heart, MessageCircle } from "lucide-react";

const Community = () => {
  const [message, setMessage] = useState("");

  const mockMessages = [
    {
      id: 1,
      user: "Sarah Chen",
      avatar: "/placeholder.svg",
      time: "2 hours ago",
      content: "Just finished my latest AI-generated artwork series! The results are mind-blowing 🎨",
      type: "text",
      likes: 12,
      replies: 3,
      badge: "Pro Creator"
    },
    {
      id: 2,
      user: "Alex Rodriguez",
      avatar: "/placeholder.svg",
      time: "4 hours ago",
      content: "Check out this video of my AI-enhanced animation process:",
      type: "video",
      mediaUrl: "/placeholder.svg",
      likes: 28,
      replies: 7,
      badge: "Beta Tester"
    },
    {
      id: 3,
      user: "Maya Patel",
      avatar: "/placeholder.svg",
      time: "6 hours ago",
      content: "The new AI analysis feature helped me increase my engagement by 300%! Here's a screenshot of my dashboard:",
      type: "image",
      mediaUrl: "/placeholder.svg",
      likes: 45,
      replies: 12,
      badge: "Success Story"
    },
    {
      id: 4,
      user: "Jordan Smith",
      avatar: "/placeholder.svg",
      time: "1 day ago",
      content: "Anyone else experiencing amazing results with the creative enhancement tools? Would love to hear your experiences!",
      type: "text",
      likes: 18,
      replies: 9,
      badge: "Community Leader"
    }
  ];

  const handleSendMessage = () => {
    if (message.trim()) {
      // In a real app, this would send the message to a backend
      console.log("Sending message:", message);
      setMessage("");
    }
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-6 gradient-text">Community Hub</h2>
            <p className="text-xl text-muted-foreground">
              Connect with fellow creatives, share your progress, and celebrate successes together
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Channels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="p-2 rounded bg-primary/10 text-primary font-medium"># general</div>
                  <div className="p-2 rounded hover:bg-muted/50 cursor-pointer"># showcase</div>
                  <div className="p-2 rounded hover:bg-muted/50 cursor-pointer"># tips-tricks</div>
                  <div className="p-2 rounded hover:bg-muted/50 cursor-pointer"># feedback</div>
                  <div className="p-2 rounded hover:bg-muted/50 cursor-pointer"># announcements</div>
                </CardContent>
              </Card>

              <Card className="glass border-border mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Online Members</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {["Sarah C.", "Alex R.", "Maya P.", "Jordan S.", "+127 more"].map((member, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">{member}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-3">
              <Card className="glass border-border h-[min(70vh,36rem)] min-h-[22rem] md:h-[min(68vh,42rem)] md:min-h-[28rem] lg:h-[600px] flex flex-col">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <span># general</span>
                    <Badge variant="secondary">1,247 members</Badge>
                  </CardTitle>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
                  {mockMessages.map((msg) => (
                    <div key={msg.id} className="flex space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={msg.avatar} />
                        <AvatarFallback>{msg.user[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold">{msg.user}</span>
                          <Badge variant="outline" className="text-xs">{msg.badge}</Badge>
                          <span className="text-xs text-muted-foreground">{msg.time}</span>
                        </div>
                        <p className="text-sm mb-2">{msg.content}</p>
                        
                        {msg.type === "image" && (
                          <div className="w-64 h-32 bg-muted rounded-lg flex items-center justify-center mb-2">
                            <Image className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        
                        {msg.type === "video" && (
                          <div className="w-64 h-32 bg-muted rounded-lg flex items-center justify-center mb-2">
                            <Video className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}

                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <button className="flex items-center space-x-1 hover:text-foreground">
                            <Heart className="w-4 h-4" />
                            <span>{msg.likes}</span>
                          </button>
                          <button className="flex items-center space-x-1 hover:text-foreground">
                            <MessageCircle className="w-4 h-4" />
                            <span>{msg.replies}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>

                {/* Message Input */}
                <div className="border-t border-border p-4">
                  <div className="flex space-x-2">
                    <div className="flex-1 flex space-x-2">
                      <Input
                        placeholder="Share your experience or ask a question..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                        className="flex-1"
                      />
                      <Button size="icon" variant="outline">
                        <Image className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="outline">
                        <Video className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button onClick={handleSendMessage} size="icon">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Community;
