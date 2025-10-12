import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  FileText, 
  Download, 
  Eye, 
  Bookmark,
  Lightbulb,
  Target,
  TrendingUp,
  Users,
  ArrowRight
} from "lucide-react";

const GuidesSection = () => {
  const guideCategories = [
    {
      icon: <Lightbulb className="w-6 h-6 text-yellow-500" />,
      title: "Getting Started",
      description: "Essential guides for creative beginners",
      count: 25,
      color: "yellow"
    },
    {
      icon: <Target className="w-6 h-6 text-blue-500" />,
      title: "Best Practices",
      description: "Industry standards and professional tips",
      count: 32,
      color: "blue"
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-green-500" />,
      title: "Advanced Techniques",
      description: "Master-level strategies and workflows",
      count: 18,
      color: "green"
    },
    {
      icon: <Users className="w-6 h-6 text-purple-500" />,
      title: "Team Collaboration",
      description: "Working effectively with creative teams",
      count: 15,
      color: "purple"
    }
  ];

  const featuredGuides = [
    {
      title: "Complete Beginner's Guide to Creative Design",
      description: "Everything you need to know to start your creative journey, from basic principles to advanced techniques",
      pages: 47,
      downloads: "25,847",
      readTime: "25 min",
      category: "Getting Started",
      author: "Creative Team",
      rating: 4.9,
      featured: true,
      tags: ["Design Basics", "Typography", "Color Theory"],
      downloadUrl: "https://s3.amazonaws.com/libapps/accounts/55515/images/graphic-design-101.pdf"
    },
    {
      title: "Professional Brand Identity Creation",
      description: "Step-by-step process for creating compelling brand identities that resonate with target audiences",
      pages: 32,
      downloads: "18,492",
      readTime: "18 min",
      category: "Best Practices",
      author: "Sarah Chen",
      rating: 4.8,
      featured: false,
      tags: ["Branding", "Logo Design", "Style Guides"],
      downloadUrl: "https://www.designhill.com/design-blog/wp-content/uploads/2016/03/Brand-Guidelines.pdf"
    },
    {
      title: "AI-Powered Creative Workflow Optimization",
      description: "Leverage artificial intelligence to streamline your creative process and boost productivity",
      pages: 28,
      downloads: "22,203",
      readTime: "15 min",
      category: "Advanced Techniques",
      author: "Alex Rodriguez",
      rating: 4.9,
      featured: true,
      tags: ["AI Tools", "Automation", "Productivity"],
      downloadUrl: "https://www.mckinsey.com/~/media/mckinsey/business%20functions/mckinsey%20digital/our%20insights/the%20economic%20potential%20of%20generative%20ai%20the%20next%20productivity%20frontier/The-economic-potential-of-generative-AI-The-next-productivity-frontier-vF.pdf"
    },
    {
      title: "Design Team Management & Collaboration",
      description: "Best practices for managing creative teams and fostering effective collaboration",
      pages: 35,
      downloads: "14,758",
      readTime: "20 min",
      category: "Team Collaboration",
      author: "Maya Patel",
      rating: 4.7,
      featured: false,
      tags: ["Team Management", "Collaboration", "Leadership"],
      downloadUrl: "https://www.indeed.com/career-advice/career-development/creative-team-structure"
    },
    {
      title: "Portfolio Creation for Creative Professionals",
      description: "Build a stunning portfolio that showcases your work and attracts potential clients",
      pages: 29,
      downloads: "31,234",
      readTime: "16 min",
      category: "Best Practices",
      author: "Jordan Smith",
      rating: 4.8,
      featured: true,
      tags: ["Portfolio", "Client Acquisition", "Presentation"],
      downloadUrl: "https://www.smashingmagazine.com/2013/06/workflow-design-develop-modern-portfolio-website/"
    },
    {
      title: "Creative Business & Freelancing Guide",
      description: "Complete guide to starting and growing your creative business or freelance career",
      pages: 52,
      downloads: "19,567",
      readTime: "30 min",
      category: "Getting Started",
      author: "Emma Wilson",
      rating: 4.9,
      featured: false,
      tags: ["Freelancing", "Business", "Client Relations"],
      downloadUrl: "https://www.shopify.com/blog/how-to-start-a-creative-business"
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-background" id="guides">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6">
            Design Guides
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            Comprehensive Creative Learning Guides
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Deep-dive into creative concepts with our detailed guides. From foundational knowledge 
            to advanced strategies, these free resources will elevate your creative skills.
          </p>
        </div>

        {/* Guide Categories */}
        <div className="grid lg:grid-cols-4 gap-6 mb-16">
          {guideCategories.map((category, index) => (
            <Card 
              key={index} 
              className="glass border-border hover:shadow-lg transition-all duration-300 hover-lift cursor-pointer group"
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto p-4 rounded-full bg-muted/30 w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
                  {category.icon}
                </div>
                <CardTitle className="text-lg">{category.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center pt-0">
                <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                <Badge variant="outline" className="text-xs">
                  {category.count} guides
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Featured Guides */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold mb-8 gradient-text">Featured Guides</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            {featuredGuides.map((guide, index) => (
              <Card 
                key={index} 
                className={`glass border-border hover:shadow-xl transition-all duration-500 hover-lift group cursor-pointer ${
                  guide.featured ? 'ring-2 ring-primary/20' : ''
                }`}
              >
                {guide.featured && (
                  <div className="absolute -top-3 left-6 z-10">
                    <Badge className="bg-primary text-white shadow-lg">
                      Featured
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  {/* Category & Stats */}
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className="text-xs">
                      {guide.category}
                    </Badge>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>⭐ {guide.rating}</span>
                      <span>•</span>
                      <span>{guide.downloads} downloads</span>
                    </div>
                  </div>
                  
                  {/* Title & Description */}
                  <CardTitle className="text-xl mb-3">{guide.title}</CardTitle>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {guide.description}
                  </p>
                </CardHeader>
                
                <CardContent>
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {guide.tags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Guide Stats */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <FileText className="w-4 h-4 mr-1" />
                        {guide.pages} pages
                      </span>
                      <span className="flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        {guide.readTime} read
                      </span>
                    </div>
                    <span>By {guide.author}</span>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex space-x-3">
                    <a 
                      href={guide.downloadUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button 
                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Free
                      </Button>
                    </a>
                    <Button variant="outline" size="icon">
                      <Bookmark className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Browse All Guides CTA */}
        <div className="text-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12">
          <h3 className="text-3xl font-bold mb-4 gradient-text">
            200+ More Guides in Our Library
          </h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Access our complete collection of creative learning guides. Detailed, actionable content 
            to help you master every aspect of creative work.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6">
              Browse All Guides
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/services">
                Explore Our Services
              </Link>
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            ✓ PDF format  ✓ Print-friendly  ✓ Offline reading  ✓ Regular updates
          </p>
        </div>
      </div>
    </section>
  );
};

export default GuidesSection;