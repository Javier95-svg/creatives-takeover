import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Download, 
  Image, 
  Palette, 
  Type, 
  Layers,
  FileImage,
  Package,
  Sparkles,
  ArrowRight
} from "lucide-react";

const DownloadsSection = () => {
  const downloadCategories = [
    {
      icon: <Palette className="w-6 h-6 text-pink-500" />,
      title: "Design Templates",
      description: "Ready-to-use design templates",
      count: "500+",
      items: ["Business Cards", "Flyers", "Social Media", "Presentations"]
    },
    {
      icon: <Image className="w-6 h-6 text-blue-500" />,
      title: "Stock Images",
      description: "High-quality royalty-free images",
      count: "1000+",
      items: ["Photography", "Illustrations", "Backgrounds", "Textures"]
    },
    {
      icon: <Type className="w-6 h-6 text-green-500" />,
      title: "Fonts & Typography",
      description: "Curated font collections",
      count: "200+",
      items: ["Sans Serif", "Serif", "Script", "Display"]
    },
    {
      icon: <Layers className="w-6 h-6 text-purple-500" />,
      title: "UI Elements",
      description: "Interface design components",
      count: "300+",
      items: ["Icons", "Buttons", "Forms", "Navigation"]
    }
  ];

  const featuredDownloads = [
    {
      title: "Ultimate Design Template Bundle",
      description: "Complete collection of professional design templates for all your creative needs",
      items: "120 templates",
      downloads: "45,847",
      size: "2.3 GB",
      format: "PSD, AI, FIGMA",
      featured: true,
      category: "Templates",
      thumbnail: "/placeholder.svg",
      tags: ["Business", "Social Media", "Print"]
    },
    {
      title: "Premium Font Collection 2024",
      description: "Handpicked selection of modern and classic fonts for professional projects",
      items: "50 font families",
      downloads: "32,492",
      size: "450 MB",
      format: "OTF, TTF, WOFF",
      featured: false,
      category: "Fonts",
      thumbnail: "/placeholder.svg",
      tags: ["Typography", "Branding", "Web"]
    },
    {
      title: "Creative Stock Photo Pack",
      description: "High-resolution photos perfect for marketing, websites, and creative projects",
      items: "200 photos",
      downloads: "28,203",
      size: "1.8 GB",
      format: "JPG, PNG",
      featured: true,
      category: "Images",
      thumbnail: "/placeholder.svg",
      tags: ["Business", "Lifestyle", "Abstract"]
    },
    {
      title: "Modern UI Kit Collection",
      description: "Complete set of UI components and elements for web and mobile design",
      items: "150 components",
      downloads: "19,758",
      size: "680 MB",
      format: "FIGMA, SKETCH",
      featured: false,
      category: "UI Elements",
      thumbnail: "/placeholder.svg",
      tags: ["Mobile", "Web", "Dashboard"]
    },
    {
      title: "Brand Identity Starter Pack",
      description: "Everything you need to create professional brand identities for clients",
      items: "75 templates",
      downloads: "21,234",
      size: "1.2 GB",
      format: "AI, PSD, PDF",
      featured: true,
      category: "Templates",
      thumbnail: "/placeholder.svg",
      tags: ["Branding", "Logo", "Guidelines"]
    },
    {
      title: "Creative Brush & Texture Set",
      description: "Artistic brushes and textures for digital painting and design enhancement",
      items: "100 brushes",
      downloads: "15,567",
      size: "520 MB",
      format: "ABR, PNG",
      featured: false,
      category: "Tools",
      thumbnail: "/placeholder.svg",
      tags: ["Digital Art", "Textures", "Painting"]
    }
  ];

  const popularDownloads = [
    { name: "Minimalist Business Card Template", downloads: "12,847", category: "Templates" },
    { name: "Social Media Post Templates (50 Pack)", downloads: "28,492", category: "Templates" },
    { name: "Geometric Pattern Collection", downloads: "15,203", category: "Images" },
    { name: "Modern Sans Serif Font Family", downloads: "22,758", category: "Fonts" },
    { name: "iOS UI Kit Components", downloads: "19,234", category: "UI Elements" }
  ];

  return (
    <section className="py-20 lg:py-32 bg-muted/30" id="downloads">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6">
            Free Downloads
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            Premium Creative Downloads
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Download high-quality creative assets absolutely free. Templates, images, fonts, 
            and tools to enhance your creative projects and streamline your workflow.
          </p>
        </div>

        {/* Download Categories */}
        <div className="grid lg:grid-cols-4 gap-6 mb-16">
          {downloadCategories.map((category, index) => (
            <Card 
              key={index} 
              className="glass border-border transition-all duration-300 group"
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto p-4 rounded-full bg-muted/30 w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
                  {category.icon}
                </div>
                <CardTitle className="text-lg">{category.title}</CardTitle>
                <Badge variant="outline" className="text-xs mt-2">
                  {category.count} items
                </Badge>
              </CardHeader>
              <CardContent className="text-center pt-0">
                <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                <div className="space-y-1">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="text-xs text-muted-foreground">
                      • {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Featured Downloads */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <div>
            <h3 className="text-3xl font-bold mb-8 gradient-text">Featured Downloads</h3>
            <div className="space-y-6">
              {featuredDownloads.map((download, index) => (
                <Card 
                  key={index} 
                  className={`glass border-border hover:shadow-xl transition-all duration-500 group ${
                    download.featured ? 'ring-2 ring-primary/20' : ''
                  }`}
                >
                  {download.featured && (
                    <div className="absolute -top-3 left-6 z-10">
                      <Badge className="bg-primary text-white shadow-lg">
                        Featured
                      </Badge>
                    </div>
                  )}
                  
                  <CardContent className="p-6">
                    <div className="flex space-x-4">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileImage className="w-8 h-8 text-primary" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-lg">{download.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {download.category}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {download.description}
                        </p>
                        
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {download.tags.map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        {/* Stats */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                          <span>{download.items} • {download.size}</span>
                          <span>{download.downloads} downloads</span>
                        </div>
                        
                        {/* Format & Download */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{download.format}</span>
                          <Button size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Popular Downloads Sidebar */}
          <div>
            <h3 className="text-3xl font-bold mb-8 gradient-text">Most Popular</h3>
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-primary" />
                  Trending Downloads
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {popularDownloads.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 transition-colors">
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">{item.name}</h5>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">{item.downloads}</div>
                      <Download className="w-4 h-4 text-primary ml-2" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Browse All Downloads CTA */}
        <div className="text-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12">
          <h3 className="text-3xl font-bold mb-4 gradient-text">
            1000+ Creative Downloads Available
          </h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Access our complete library of creative downloads. High-quality assets for all your 
            creative projects, updated weekly with fresh content.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6">
              <Package className="w-5 h-5 mr-2" />
              Browse All Downloads
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/about">
                Learn About Us
              </Link>
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            ✓ Commercial license included  ✓ High resolution  ✓ Multiple formats  ✓ No attribution required
          </p>
        </div>
      </div>
    </section>
  );
};

export default DownloadsSection;
