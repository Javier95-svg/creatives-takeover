import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Users, 
  MessageSquare, 
  Share2, 
  Heart, 
  Eye, 
  GitMerge,
  ArrowRight
} from "lucide-react";

const UserCollaboration = () => {
  const collaborationFeatures = [
    {
      icon: <MessageSquare className="w-8 h-8 text-blue-500" />,
      title: "Real-time Chat",
      description: "Connect instantly with fellow creatives in topic-based channels",
      stats: "10k+ daily messages"
    },
    {
      icon: <Share2 className="w-8 h-8 text-green-500" />,
      title: "Project Sharing",
      description: "Showcase your work and get constructive feedback from the community",
      stats: "500+ projects shared daily"
    },
    {
      icon: <GitMerge className="w-8 h-8 text-purple-500" />,
      title: "Collaboration Tools",
      description: "Work together on projects with built-in collaborative features",
      stats: "200+ active collaborations"
    }
  ];

  const recentCollaborations = [
    {
      title: "AI Art Exhibition 2024",
      participants: 12,
      description: "Collaborative digital art exhibition featuring AI-generated artworks",
      status: "Active",
      avatars: ["/placeholder.svg", "/placeholder.svg", "/placeholder.svg"],
      leader: "Sarah Chen"
    },
    {
      title: "Brand Identity Collective",
      participants: 8,
      description: "Group project creating brand identities for local startups",
      status: "Recruiting",
      avatars: ["/placeholder.svg", "/placeholder.svg"],
      leader: "Alex Rodriguez"
    },
    {
      title: "Creative Writing Circle",
      participants: 15,
      description: "Weekly collaborative storytelling and creative writing sessions",
      status: "Active",
      avatars: ["/placeholder.svg", "/placeholder.svg", "/placeholder.svg", "/placeholder.svg"],
      leader: "Maya Patel"
    }
  ];

  const communityHighlights = [
    {
      user: "Jordan Smith",
      avatar: "/placeholder.svg",
      achievement: "Featured Creator",
      project: "Minimalist UI Design System",
      likes: 234,
      views: 1500,
      timeAgo: "2 hours ago"
    },
    {
      user: "Emma Wilson",
      avatar: "/placeholder.svg",
      achievement: "Collaboration Champion",
      project: "Community Logo Redesign",
      likes: 189,
      views: 890,
      timeAgo: "5 hours ago"
    },
    {
      user: "David Chen",
      avatar: "/placeholder.svg",
      achievement: "Mentor of the Month",
      project: "Beginner's Guide to Creative Tools",
      likes: 345,
      views: 2100,
      timeAgo: "1 day ago"
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-muted/30" id="collaboration">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6">
            Creative Collaboration
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            Where Creative Community Thrives
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Experience the power of collaborative creativity. Our creative community platform 
            brings together designers, artists, and creators from around the world.
          </p>
        </div>

        {/* Collaboration Features */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {collaborationFeatures.map((feature, index) => (
            <Card 
              key={index} 
              className="glass border-border hover:shadow-xl transition-all duration-500 hover-lift text-center" 
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              <CardHeader>
                <div className="mx-auto p-4 rounded-xl bg-background/50 w-fit mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{feature.description}</p>
                <Badge variant="outline" className="text-primary border-primary/30">
                  {feature.stats}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active Collaborations */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold mb-8 text-center gradient-text">
            Active Community Collaborations
          </h3>
          <div className="grid lg:grid-cols-3 gap-6">
            {recentCollaborations.map((collab, index) => (
              <Card key={index} className="glass border-border hover:shadow-lg transition-all duration-300 hover-lift">
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <CardTitle className="text-lg">{collab.title}</CardTitle>
                    <Badge 
                      variant={collab.status === "Active" ? "default" : "secondary"}
                      className={collab.status === "Active" ? "bg-green-500" : ""}
                    >
                      {collab.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{collab.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="flex -space-x-2">
                        {collab.avatars.slice(0, 3).map((avatar, i) => (
                          <Avatar key={i} className="w-6 h-6 border-2 border-background">
                            <AvatarImage src={avatar} />
                            <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {collab.participants} members
                      </span>
                    </div>
                    <Button variant="outline" size="sm">
                      Join
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Led by {collab.leader}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Community Highlights */}
        <div>
          <h3 className="text-3xl font-bold mb-8 text-center gradient-text">
            Community Highlights
          </h3>
          <div className="grid lg:grid-cols-3 gap-6 mb-12">
            {communityHighlights.map((highlight, index) => (
              <Card key={index} className="glass border-border hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={highlight.avatar} />
                      <AvatarFallback>{highlight.user[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{highlight.user}</h4>
                      <Badge variant="outline" className="text-xs">{highlight.achievement}</Badge>
                    </div>
                  </div>
                  <h5 className="font-medium mb-3">{highlight.project}</h5>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <Heart className="w-4 h-4 mr-1" />
                        {highlight.likes}
                      </span>
                      <span className="flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        {highlight.views}
                      </span>
                    </div>
                    <span>{highlight.timeAgo}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <a href="#join-community">
                Join Our Creative Community
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UserCollaboration;