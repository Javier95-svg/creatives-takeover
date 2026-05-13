import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Play, 
  Clock, 
  Users, 
  BookOpen,
  Palette,
  Zap,
  Camera,
  PenTool,
  ArrowRight
} from "lucide-react";

const TutorialsSection = () => {
  const tutorialCategories = [
    {
      icon: <Palette className="w-6 h-6 text-blue-500" />,
      name: "Design Basics",
      count: 45,
      color: "blue"
    },
    {
      icon: <Zap className="w-6 h-6 text-purple-500" />,
      name: "AI Tools",
      count: 38,
      color: "purple"
    },
    {
      icon: <Camera className="w-6 h-6 text-green-500" />,
      name: "Photography",
      count: 29,
      color: "green"
    },
    {
      icon: <PenTool className="w-6 h-6 text-orange-500" />,
      name: "Illustration",
      count: 34,
      color: "orange"
    }
  ];

  const featuredTutorials = [
    {
      title: "AI Tools for Designers - Complete Guide",
      description: "Learn how to integrate AI tools into your creative workflow for faster, better results",
      duration: "12 min",
      students: "2.1M",
      level: "Beginner",
      videoId: "mEsleV16qdo",
      category: "AI Tools",
      instructor: "Flux Academy",
      rating: 4.9,
      isPopular: true
    },
    {
      title: "Typography Tutorial - Design Better Type",
      description: "Master the art of typography with practical examples and real-world projects",
      duration: "15 min",
      students: "1.4M",
      level: "Intermediate",
      videoId: "QrNi9FmdlxY",
      category: "Design Basics",
      instructor: "Jesse Nyberg",
      rating: 4.8,
      isPopular: false
    },
    {
      title: "Color Theory for Digital Artists",
      description: "Understand color psychology and create harmonious color palettes that captivate",
      duration: "18 min",
      students: "890K",
      level: "Beginner",
      videoId: "_2LLXnUdUIc",
      category: "Design Basics",
      instructor: "Satori Graphics",
      rating: 4.9,
      isPopular: true
    },
    {
      title: "Professional Photo Editing Techniques",
      description: "Professional photo editing and manipulation techniques used by industry experts",
      duration: "22 min",
      students: "3.2M",
      level: "Advanced",
      videoId: "8eNC4eJjKbw",
      category: "Photography",
      instructor: "Peter McKinnon",
      rating: 4.7,
      isPopular: false
    },
    {
      title: "Digital Illustration Masterclass",
      description: "Step-by-step process to create professional digital illustrations from scratch",
      duration: "25 min",
      students: "1.8M",
      level: "Intermediate",
      videoId: "ewMksAbgdBI",
      category: "Illustration",
      instructor: "Art with Flo",
      rating: 4.8,
      isPopular: false
    },
    {
      title: "Brand Identity Design from Scratch",
      description: "Complete brand identity creation process with real client examples",
      duration: "30 min",
      students: "2.5M",
      level: "Advanced",
      videoId: "l-S2Y3SF3mM",
      category: "Design Basics",
      instructor: "The Futur",
      rating: 4.9,
      isPopular: true
    }
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "Intermediate": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "Advanced": return "bg-red-500/10 text-red-600 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  return (
    <section className="py-20 lg:py-32 bg-muted/30" id="tutorials">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6">
            Free Tutorials
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            Learn Creative Skills with Expert Tutorials
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Master creative skills with our comprehensive tutorial library. From beginner basics 
            to advanced techniques, we have free tutorials for every skill level.
          </p>
        </div>

        {/* Tutorial Categories */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {tutorialCategories.map((category, index) => (
            <Card 
              key={index} 
              className="glass border-border transition-all duration-300 group text-center"
            >
              <CardContent className="p-6">
                <div className="mx-auto p-4 rounded-full bg-background/50 w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
                  {category.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                <p className="text-sm text-muted-foreground">{category.count} tutorials</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Featured Tutorials */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold mb-8 gradient-text">Featured Tutorials</h3>
          <div className="grid lg:grid-cols-3 gap-8">
            {featuredTutorials.map((tutorial, index) => (
              <Card 
                key={index} 
                className="glass border-border hover:shadow-xl transition-all duration-500 group relative"
              >
                {tutorial.isPopular && (
                  <div className="absolute -top-3 left-6 z-10">
                    <Badge className="bg-primary text-white shadow-lg">
                      Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="p-0">
                  {/* Video Embed */}
                  <div className="relative overflow-hidden rounded-t-lg">
                    <div className="aspect-video">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${tutorial.videoId}`}
                        title={tutorial.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                    <div className="absolute top-4 right-4 pointer-events-none">
                      <Badge variant="secondary" className="bg-black/80 text-white border-0">
                        {tutorial.duration}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  {/* Category & Level */}
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className="text-xs">
                      {tutorial.category}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${getLevelColor(tutorial.level)}`}>
                      {tutorial.level}
                    </Badge>
                  </div>
                  
                  {/* Title & Description */}
                  <CardTitle className="text-lg mb-3 line-clamp-2">{tutorial.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {tutorial.description}
                  </p>
                  
                  {/* Instructor & Stats */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>By {tutorial.instructor}</span>
                    <div className="flex items-center space-x-2">
                      <span>⭐ {tutorial.rating}</span>
                      <span>•</span>
                      <span>{tutorial.students} students</span>
                    </div>
                  </div>
                  
                  {/* CTA */}
                  <Button 
                    variant="outline" 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300"
                    asChild
                  >
                    <a href={`https://www.youtube.com/watch?v=${tutorial.videoId}`} target="_blank" rel="noopener noreferrer">
                      <Play className="w-4 h-4 mr-2" />
                      Watch on YouTube
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Browse All CTA */}
        <div className="text-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12">
          <h3 className="text-3xl font-bold mb-4 gradient-text">
            500+ More Tutorials Available
          </h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Explore our complete library of free creative tutorials. New content added weekly 
            by industry experts and creative professionals.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6">
              Browse All Tutorials
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/mentorship">
                Join Learning Community
              </Link>
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            ✓ Always free  ✓ No registration required  ✓ HD quality videos
          </p>
        </div>
      </div>
    </section>
  );
};

export default TutorialsSection;
