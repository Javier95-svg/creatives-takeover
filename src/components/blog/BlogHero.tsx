import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Rss } from "lucide-react";
import { useState } from "react";

const BlogHero = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // This will be implemented when you add search functionality
    console.log("Searching for:", searchTerm);
  };

  return (
    <section className="pt-24 pb-16 bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 gradient-text animate-fade-in-up">
            Business Insights & AI Innovation
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 animate-fade-in-up [animation-delay:0.2s] max-w-2xl mx-auto">
            Discover expert insights on entrepreneurship, AI tools, business planning, and creative strategies to help you build and grow your ventures.
          </p>

          {/* Search Bar */}
          <form 
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row gap-4 max-w-lg mx-auto mb-8 animate-fade-in-up [animation-delay:0.4s]"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass"
              />
            </div>
            <Button type="submit" className="glass hover-lift">
              Search
            </Button>
          </form>

          {/* RSS Feed */}
          <div className="animate-fade-in-up [animation-delay:0.6s]">
            <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Rss className="w-4 h-4" />
              Subscribe to RSS Feed
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BlogHero;