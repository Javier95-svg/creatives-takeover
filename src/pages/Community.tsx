import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  TrendingUp, 
  MessageSquare, 
  Heart, 
  Share2, 
  Calendar,
  Award,
  Lightbulb,
  Target,
  DollarSign,
  Clock
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";

const Community = () => {
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());

  const communityStats = [
    { label: "Active Members", value: "2,400+", icon: Users },
    { label: "Business Plans Created", value: "1,200+", icon: Target },
    { label: "Success Stories", value: "340+", icon: Award },
    { label: "Total Funding Raised", value: "$12M+", icon: DollarSign },
  ];

  const featuredPosts = [
    {
      id: 1,
      author: {
        name: "Sarah Chen",
        avatar: "/placeholder-avatar.jpg",
        badge: "Top Contributor",
        joinDate: "6 months ago"
      },
      title: "How I Validated My SaaS Idea in 2 Weeks",
      category: "Success Story",
      content: "Used BizMap AI to create my business plan for a project management tool for design agencies. The validation experiments suggested were spot-on! I ran landing page tests and customer interviews, got 150 sign-ups in 2 weeks. Now in MVP development phase.",
      tags: ["SaaS", "Validation", "B2B"],
      timestamp: "2 hours ago",
      likes: 23,
      comments: 8,
      businessType: "SaaS",
      stage: "MVP Development"
    },
    {
      id: 2,
      author: {
        name: "Marcus Rodriguez", 
        avatar: "/placeholder-avatar.jpg",
        badge: "Entrepreneur",
        joinDate: "3 months ago"
      },
      title: "From Idea to $50K Revenue: My E-commerce Journey",
      category: "Case Study",
      content: "Started with a sustainable product idea and BizMap AI's blueprint. Followed the 4-phase plan exactly - validation took 3 weeks, MVP launch in 2 months. Now at $50K monthly revenue selling eco-friendly home products. AMA about the journey!",
      tags: ["E-commerce", "Sustainability", "Revenue"],
      timestamp: "1 day ago",
      likes: 67,
      comments: 24,
      businessType: "E-commerce",
      stage: "Scaling"
    },
    {
      id: 3,
      author: {
        name: "Emma Thompson",
        avatar: "/placeholder-avatar.jpg", 
        badge: "Community Helper",
        joinDate: "1 year ago"
      },
      title: "Budget-Friendly Validation Experiments That Actually Work",
      category: "Tips & Advice",
      content: "Compiled a list of validation experiments you can do for under $100. These are the ones that gave me the clearest signals about market demand. Perfect for bootstrapped founders who need to validate before building.",
      tags: ["Validation", "Bootstrap", "Tips"],
      timestamp: "3 days ago", 
      likes: 45,
      comments: 15,
      businessType: "General",
      stage: "Validation"
    },
    {
      id: 4,
      author: {
        name: "David Kim",
        avatar: "/placeholder-avatar.jpg",
        badge: "Startup Founder",
        joinDate: "8 months ago"
      },
      title: "Local Business Success: From BizMap to 5-Star Reviews",
      category: "Success Story", 
      content: "Used BizMap AI to plan my local fitness coaching business. The local business strategies were incredibly detailed. Now running 3 locations with 200+ members and 4.9-star average review. The community support here was amazing too!",
      tags: ["Local Business", "Fitness", "Growth"],
      timestamp: "5 days ago",
      likes: 38,
      comments: 12,
      businessType: "Local Business",
      stage: "Scaling"
    }
  ];

  const upcomingEvents = [
    {
      id: 1,
      title: "Monthly Startup Pitch Practice",
      date: "Tomorrow, 7:00 PM EST",
      description: "Practice your pitch with fellow entrepreneurs and get feedback",
      attendees: 45
    },
    {
      id: 2, 
      title: "BizMap AI Tips & Tricks Workshop",
      date: "Friday, 2:00 PM EST",
      description: "Learn advanced techniques for getting better business plans",
      attendees: 78
    },
    {
      id: 3,
      title: "Success Stories Panel Discussion", 
      date: "Next Monday, 8:00 PM EST",
      description: "Hear from community members who've built successful businesses",
      attendees: 120
    }
  ];

  const toggleLike = (postId: number) => {
    const newLikedPosts = new Set(likedPosts);
    if (newLikedPosts.has(postId)) {
      newLikedPosts.delete(postId);
    } else {
      newLikedPosts.add(postId);
    }
    setLikedPosts(newLikedPosts);
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "Validation": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "MVP Development": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Scaling": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Community - Connect with Fellow Entrepreneurs | BizMap AI</title>
        <meta name="description" content="Join our thriving community of entrepreneurs. Share your journey, get feedback on your business plans, and learn from success stories." />
      </Helmet>
      
      <Navigation />
      
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Community
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Connect with fellow entrepreneurs, share your journey, and learn from those who've successfully built businesses using BizMap AI.
            </p>
          </div>

          {/* Community Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {communityStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="glass-card text-center">
                  <CardContent className="p-6">
                    <Icon className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="featured" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="featured" className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Featured
                  </TabsTrigger>
                  <TabsTrigger value="recent" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Recent
                  </TabsTrigger>
                  <TabsTrigger value="success" className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Success Stories
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="featured" className="space-y-6">
                  {featuredPosts.map((post) => (
                    <Card key={post.id} className="glass-card">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={post.author.avatar} />
                            <AvatarFallback>{post.author.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{post.author.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {post.author.badge}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{post.timestamp}</span>
                              <Badge variant="secondary">{post.category}</Badge>
                              <Badge variant="outline" className={getStageColor(post.stage)}>
                                {post.stage}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <CardTitle className="text-lg">{post.title}</CardTitle>
                      </CardHeader>
                      
                      <CardContent>
                        <p className="text-muted-foreground mb-4">{post.content}</p>
                        
                        <div className="flex flex-wrap gap-1 mb-4">
                          {post.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center gap-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLike(post.id)}
                            className={`flex items-center gap-2 ${likedPosts.has(post.id) ? 'text-red-500' : ''}`}
                          >
                            <Heart className={`w-4 h-4 ${likedPosts.has(post.id) ? 'fill-current' : ''}`} />
                            {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
                          </Button>
                          <Button variant="ghost" size="sm" className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            {post.comments}
                          </Button>
                          <Button variant="ghost" size="sm" className="flex items-center gap-2">
                            <Share2 className="w-4 h-4" />
                            Share
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="recent" className="space-y-6">
                  <Card className="glass-card">
                    <CardContent className="p-8 text-center">
                      <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Recent Discussions</h3>
                      <p className="text-muted-foreground mb-4">
                        Check back soon for the latest community discussions and updates.
                      </p>
                      <Button variant="outline">Join the Conversation</Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="success" className="space-y-6">
                  {featuredPosts.filter(post => post.category === "Success Story" || post.category === "Case Study").map((post) => (
                    <Card key={post.id} className="glass-card border-green-200">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={post.author.avatar} />
                            <AvatarFallback>{post.author.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{post.author.name}</h4>
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                Success Story
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {post.timestamp} • {post.businessType}
                            </div>
                          </div>
                        </div>
                        <CardTitle className="text-lg">{post.title}</CardTitle>
                      </CardHeader>
                      
                      <CardContent>
                        <p className="text-muted-foreground mb-4">{post.content}</p>
                        
                        <div className="flex flex-wrap gap-1 mb-4">
                          {post.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center gap-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLike(post.id)}
                            className={`flex items-center gap-2 ${likedPosts.has(post.id) ? 'text-red-500' : ''}`}
                          >
                            <Heart className={`w-4 h-4 ${likedPosts.has(post.id) ? 'fill-current' : ''}`} />
                            {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
                          </Button>
                          <Button variant="ghost" size="sm" className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            {post.comments}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Upcoming Events */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Upcoming Events
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="border-l-2 border-primary pl-4">
                      <h4 className="font-medium text-sm">{event.title}</h4>
                      <p className="text-xs text-muted-foreground mb-1">{event.date}</p>
                      <p className="text-xs text-muted-foreground mb-2">{event.description}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {event.attendees} attending
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    Share Your Progress
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    Ask for Feedback
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    Find Co-founder
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    Join Study Group
                  </Button>
                </CardContent>
              </Card>

              {/* Get Started CTA */}
              <Card className="glass-card bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-6 text-center">
                  <Target className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Ready to Start Building?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use BizMap AI to create your business plan and join our success stories.
                  </p>
                  <Button asChild className="w-full">
                    <a href="/dream2plan">Create Business Plan</a>
                  </Button>
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

export default Community;