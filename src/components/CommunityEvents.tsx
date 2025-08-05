import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Calendar, 
  Users, 
  Video, 
  Clock, 
  MapPin,
  ArrowRight,
  Star,
  Presentation
} from "lucide-react";

const CommunityEvents = () => {
  const upcomingEvents = [
    {
      title: "Creative Community Masterclass: AI in Design",
      date: "March 15, 2024",
      time: "2:00 PM EST",
      type: "Workshop",
      presenter: "Sarah Chen",
      attendees: 156,
      maxAttendees: 200,
      description: "Learn how to integrate AI tools into your creative workflow effectively",
      isPopular: true,
      location: "Virtual",
      duration: "2 hours"
    },
    {
      title: "Monthly Creative Showcase",
      date: "March 20, 2024",
      time: "7:00 PM EST",
      type: "Showcase",
      presenter: "Community Members",
      attendees: 89,
      maxAttendees: 150,
      description: "Present your latest work and get feedback from the creative community",
      isPopular: false,
      location: "Virtual",
      duration: "1.5 hours"
    },
    {
      title: "Design Collaboration Workshop",
      date: "March 25, 2024",
      time: "1:00 PM EST",
      type: "Workshop",
      presenter: "Alex Rodriguez",
      attendees: 67,
      maxAttendees: 100,
      description: "Master the art of collaborative design in team environments",
      isPopular: false,
      location: "Virtual",
      duration: "3 hours"
    },
    {
      title: "Creative Community Meet & Greet",
      date: "March 30, 2024",
      time: "5:00 PM EST",
      type: "Networking",
      presenter: "Community Team",
      attendees: 203,
      maxAttendees: 300,
      description: "Connect with fellow creatives in a casual networking environment",
      isPopular: true,
      location: "Virtual",
      duration: "1 hour"
    }
  ];

  const pastEventHighlights = [
    {
      title: "Portfolio Review Session",
      attendees: 178,
      rating: 4.9,
      highlight: "98% found it valuable for career growth"
    },
    {
      title: "Creative Trends 2024",
      attendees: 234,
      rating: 4.8,
      highlight: "Trending predictions that shaped Q1 strategies"
    },
    {
      title: "Freelancer Success Panel",
      attendees: 156,
      rating: 4.9,
      highlight: "Practical tips from 6-figure freelancers"
    }
  ];

  const eventCategories = [
    { name: "Workshops", count: 12, icon: <Presentation className="w-5 h-5" /> },
    { name: "Showcases", count: 8, icon: <Star className="w-5 h-5" /> },
    { name: "Networking", count: 6, icon: <Users className="w-5 h-5" /> },
    { name: "Masterclasses", count: 4, icon: <Video className="w-5 h-5" /> }
  ];

  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6">
            Community Events
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            Learn, Connect & Grow Together
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Join our regular events designed to help you grow your skills, expand your network, 
            and stay connected with our vibrant creative community.
          </p>
        </div>

        {/* Event Categories */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {eventCategories.map((category, index) => (
            <div 
              key={index}
              className="text-center p-4 rounded-lg bg-background/50 border border-border hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center justify-center mb-2 text-primary">
                {category.icon}
              </div>
              <h4 className="font-semibold text-sm">{category.name}</h4>
              <p className="text-xs text-muted-foreground">{category.count} monthly</p>
            </div>
          ))}
        </div>

        {/* Upcoming Events */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold mb-8 gradient-text">Upcoming Events</h3>
          <div className="grid lg:grid-cols-2 gap-6">
            {upcomingEvents.map((event, index) => (
              <Card 
                key={index} 
                className={`glass border-border hover:shadow-xl transition-all duration-500 hover-lift relative ${
                  event.isPopular ? 'ring-2 ring-primary/20' : ''
                }`}
              >
                {event.isPopular && (
                  <div className="absolute -top-3 left-6">
                    <Badge className="bg-primary text-white shadow-lg">
                      Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{event.title}</CardTitle>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {event.location}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2" />
                      {event.date}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-2" />
                      {event.time} • {event.duration}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="w-4 h-4 mr-2" />
                      {event.attendees}/{event.maxAttendees} registered
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Presentation className="w-4 h-4 mr-2" />
                      Presented by {event.presenter}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="w-full bg-muted rounded-full h-2 mr-4">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(event.attendees / event.maxAttendees) * 100}%` }}
                      ></div>
                    </div>
                    <Button size="sm" className="whitespace-nowrap">
                      Join Event
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Past Event Highlights */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold mb-8 gradient-text">Recent Event Highlights</h3>
          <div className="grid lg:grid-cols-3 gap-6">
            {pastEventHighlights.map((event, index) => (
              <Card key={index} className="glass border-border text-center">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-lg mb-3">{event.title}</h4>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-center">
                      <Users className="w-4 h-4 mr-2 text-primary" />
                      <span className="text-sm">{event.attendees} attendees</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <Star className="w-4 h-4 mr-2 text-yellow-500" />
                      <span className="text-sm">{event.rating}/5 rating</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    "{event.highlight}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12">
          <h3 className="text-3xl font-bold mb-4 gradient-text">
            Never Miss a Creative Community Event
          </h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Stay connected with our creative community and be the first to know about 
            upcoming workshops, showcases, and networking events.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="#join-community">
                Join Community & Get Event Access
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/resources">
                View Event Resources
              </Link>
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            Free events for all members • Premium events for subscribers • Recording access included
          </p>
        </div>
      </div>
    </section>
  );
};

export default CommunityEvents;