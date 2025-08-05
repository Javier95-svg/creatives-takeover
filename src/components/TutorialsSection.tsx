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
      title: "Complete Guide to AI-Powered Design",
      description: "Learn how to integrate AI tools into your creative workflow for faster, better results",
      duration: "45 min",
      students: "12,847",
      level: "Beginner",
      thumbnail: "/placeholder.svg",
      category: "AI Tools",
      instructor: "Sarah Chen",
      rating: 4.9,
      isPopular: true
    },
    {
      title: "Typography Mastery: From Basics to Advanced",
      description: "Master the art of typography with practical examples and real-world projects",
      duration: "1h 20min",
      students: "8,492",
      level: "Intermediate",
      thumbnail: "/placeholder.svg",
      category: "Design Basics",
      instructor: "Alex Rodriguez",
      rating: 4.8,
      isPopular: false
    },
    {
      title: "Color Theory for Digital Artists",
      description: "Understand color psychology and create harmonious color palettes that captivate",
      duration: "38 min",
      students: "15,203",
      level: "Beginner",
      thumbnail: "/placeholder.svg",
      category: "Design Basics",
      instructor: "Maya Patel",
      rating: 4.9,
      isPopular: true
    },
    {
      title: "Advanced Photo Manipulation Techniques",
      description: "Professional photo editing and manipulation techniques used by industry experts",
      duration: "2h 15min",
      students: "6,758",
      level: "Advanced",
      thumbnail: "/placeholder.svg",
      category: "Photography",
      instructor: "Jordan Smith",
      rating: 4.7,
      isPopular: false
    },
    {
      title: "Creating Stunning Digital Illustrations",
      description: "Step-by-step process to create professional digital illustrations from scratch",
      duration: "1h 45min",
      students: "9,234",
      level: "Intermediate",
      thumbnail: "/placeholder.svg",
      category: "Illustration",
      instructor: "Emma Wilson",
      rating: 4.8,
      isPopular: false
    },
    {
      title: "Brand Identity Design Workshop",
      description: "Complete brand identity creation process with real client examples",
      duration: "3h 30min",
      students: "11,567",
      level: "Advanced",
      thumbnail: "/placeholder.svg",
      category: "Design Basics",
      instructor: "David Chen",
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
              className="glass border-border hover:shadow-lg transition-all duration-300 hover-lift cursor-pointer group text-center"
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
                className="glass border-border hover:shadow-xl transition-all duration-500 hover-lift group cursor-pointer relative"
              >
                {tutorial.isPopular && (
                  <div className="absolute -top-3 left-6 z-10">
                    <Badge className="bg-primary text-white shadow-lg">
                      Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="p-0">
                  {/* Thumbnail */}
                  <div className="relative overflow-hidden rounded-t-lg">
                    <div className="aspect-video bg-muted flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                      <Play className="w-12 h-12 text-primary" />
                    </div>
                    <div className="absolute top-4 right-4">
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
                  <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <Play className="w-4 h-4 mr-2" />
                    Watch Free
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
              <Link to="/community">
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