import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Clock, TrendingUp, DollarSign, Lightbulb, Rocket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const InsightaDemo = () => {
  const [bookmarkedArticles, setBookmarkedArticles] = useState<number[]>([]);

  const demoArticles = [
    {
      id: 1,
      title: "AI Business Planning in 2025: The Future is Here",
      category: "AI Tools",
      excerpt: "Discover how AI is revolutionizing business planning and how entrepreneurs are leveraging tools like ChatGPT and BizMap AI to validate ideas faster.",
      readTime: 5,
      trending: true,
      image: "🤖",
      tags: ["AI", "Business Planning", "Trends"],
      slug: "ai-business-planning"
    },
    {
      id: 2,
      title: "$50K in Grants: Your Complete Funding Guide",
      category: "Funding",
      excerpt: "A comprehensive breakdown of government grants, startup accelerators, and non-dilutive funding sources available for entrepreneurs in 2025.",
      readTime: 8,
      featured: true,
      image: "💰",
      tags: ["Funding", "Grants", "Startups"],
      slug: "startup-validation"
    },
    {
      id: 3,
      title: "Growth Hacking Strategies That Actually Work",
      category: "Marketing",
      excerpt: "Learn the proven growth hacking tactics used by successful startups to acquire their first 1,000 customers without spending on ads.",
      readTime: 6,
      trending: true,
      image: "📈",
      tags: ["Marketing", "Growth", "Customer Acquisition"],
      slug: "growth-hacking-strategies"
    },
    {
      id: 4,
      title: "No-Code MVP: Build Your Product in a Weekend",
      category: "Product",
      excerpt: "Step-by-step guide to building and launching your minimum viable product using no-code tools like Bubble, Webflow, and Airtable.",
      readTime: 10,
      image: "🛠️",
      tags: ["No-Code", "MVP", "Product Development"],
      slug: "no-code-mvp-building"
    },
    {
      id: 5,
      title: "Solo Entrepreneur Success Stories: From Idea to $10K MRR",
      category: "Case Studies",
      excerpt: "Real stories from solopreneurs who built profitable businesses while working full-time jobs. Learn their strategies, mistakes, and breakthroughs.",
      readTime: 7,
      featured: true,
      image: "💪",
      tags: ["Case Study", "Solopreneur", "Success Stories"],
      slug: "ai-productivity-hacks"
    },
    {
      id: 6,
      title: "The Ultimate Business Validation Checklist",
      category: "Strategy",
      excerpt: "Before investing time and money, validate your business idea using this proven 20-point checklist used by top accelerators.",
      readTime: 4,
      image: "✅",
      tags: ["Validation", "Strategy", "Planning"],
      slug: "creative-marketing-2024"
    }
  ];

  const fundingPrograms = [
    {
      id: 1,
      name: "Small Business Innovation Research (SBIR)",
      description: "Up to $1.7M in non-dilutive funding",
      icon: "💰",
      url: "https://www.sbir.gov/"
    },
    {
      id: 2,
      name: "Y Combinator Application Tips",
      description: "Accelerator funding up to $500K",
      icon: "🚀",
      url: "https://www.ycombinator.com/apply"
    }
  ];

  const handleBookmark = (articleId: number) => {
    if (bookmarkedArticles.includes(articleId)) {
      setBookmarkedArticles(bookmarkedArticles.filter(id => id !== articleId));
      toast.success("Removed from bookmarks");
    } else {
      setBookmarkedArticles([...bookmarkedArticles, articleId]);
      toast.success("Added to bookmarks");
    }
  };

  const handleReadArticle = (slug: string) => {
    window.open(`/news/${slug}`, '_blank');
  };

  const handleLearnMore = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary/10 to-accent/10 p-8 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Insighta Demo</h2>
            <p className="text-muted-foreground">Curated business insights, AI tools, and entrepreneurship tips</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <Badge variant="secondary" className="text-sm">
            🎯 Personalized Recommendations
          </Badge>
          <Badge variant="secondary" className="text-sm">
            📚 Reading Analytics
          </Badge>
          <Badge variant="secondary" className="text-sm">
            💡 Expert Insights
          </Badge>
        </div>
      </div>

      {/* Featured Funding Section */}
      <Card className="bg-gradient-to-r from-chart-2/10 to-chart-2/5 border-chart-2/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-chart-2" />
            <CardTitle>Featured: Funding Opportunities</CardTitle>
          </div>
          <CardDescription>Hand-picked grants and funding programs for entrepreneurs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {fundingPrograms.map((program) => (
              <div key={program.id} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                <div className="w-10 h-10 rounded bg-chart-2/20 flex items-center justify-center flex-shrink-0">
                  {program.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{program.name}</p>
                  <p className="text-sm text-muted-foreground">{program.description}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleLearnMore(program.url)}
                >
                  Learn More
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trending Articles */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Trending Articles
          </h3>
          <Badge variant="secondary">Updated Daily</Badge>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {demoArticles.map((article) => (
            <Card key={article.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="text-4xl">{article.image}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {article.category}
                      </Badge>
                      {article.trending && (
                        <Badge className="text-xs bg-primary/20 text-primary">
                          🔥 Trending
                        </Badge>
                      )}
                      {article.featured && (
                        <Badge className="text-xs bg-accent/20 text-accent">
                          ⭐ Featured
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg leading-tight">
                      {article.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="line-clamp-2">
                  {article.excerpt}
                </CardDescription>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {article.readTime} min
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBookmark(article.id)}
                    >
                      <Bookmark 
                        className={`w-4 h-4 ${bookmarkedArticles.includes(article.id) ? 'fill-current' : ''}`} 
                      />
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleReadArticle(article.slug)}
                    >
                      Read Article
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Personalization CTA */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center">
            <Lightbulb className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Get Personalized Insights</h3>
            <p className="text-muted-foreground mb-4 max-w-xl mx-auto">
              Sign up to receive curated articles based on your interests, bookmark favorites, 
              and track your reading progress
            </p>
            <Button size="lg">
              <Rocket className="w-5 h-5 mr-2" />
              Create Free Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsightaDemo;
