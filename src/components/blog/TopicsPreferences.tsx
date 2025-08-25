import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, User, LogIn } from "lucide-react";
import { useTopicPreferences } from "@/hooks/useTopicPreferences";
import { blogPosts } from "@/data/blogPosts";
import { Link } from "react-router-dom";

const TopicsPreferences = () => {
  const { selectedTopics, loading, toggleTopicPreference, isAuthenticated } = useTopicPreferences();

  // Extract unique topics from all blog posts
  const allTopics = Array.from(
    new Set(
      blogPosts.flatMap(post => post.tags || [])
    )
  ).sort();

  if (!isAuthenticated) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <Card className="glass">
            <CardContent className="p-8 text-center">
              <LogIn className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Personalize Your Reading Experience</h3>
              <p className="text-muted-foreground mb-6">
                Sign in to save your topic preferences and get personalized article recommendations.
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/signup">Create Account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-6">
        <Card className="glass">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-primary" />
              <CardTitle className="text-2xl">Your Reading Interests</CardTitle>
            </div>
            <p className="text-muted-foreground">
              Select topics you're interested in to get personalized recommendations
            </p>
          </CardHeader>
          
          <CardContent className="p-6">
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-3 justify-center">
                  {allTopics.map((topic) => {
                    const isSelected = selectedTopics.includes(topic);
                    
                    return (
                      <Button
                        key={topic}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleTopicPreference(topic)}
                        className={`transition-all duration-200 ${
                          isSelected 
                            ? "bg-primary text-primary-foreground shadow-md" 
                            : "hover:border-primary hover:text-primary"
                        }`}
                      >
                        {isSelected && <Heart className="w-3 h-3 mr-1 fill-current" />}
                        {topic}
                      </Button>
                    );
                  })}
                </div>
                
                {selectedTopics.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Your Selected Interests:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTopics.map((topic) => (
                        <Badge key={topic} variant="secondary" className="bg-primary/10">
                          <Heart className="w-3 h-3 mr-1 fill-current" />
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default TopicsPreferences;