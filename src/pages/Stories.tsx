import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { LinkedInPostEmbed } from "@/components/stories/LinkedInPostEmbed";
import { useStories } from "@/hooks/useStories";
import { StoryArticle } from "@/hooks/useStories";
import { Badge } from "@/components/ui/badge";
import { Hash, X, FileText, Edit, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

const Stories = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedTag = searchParams.get("tag");
  const activeTab = searchParams.get("tab") || "published";
  const { fetchStories, fetchDrafts, loading, isAdmin } = useStories();
  const { user } = useAuth();
  const [stories, setStories] = useState<StoryArticle[]>([]);
  const [drafts, setDrafts] = useState<StoryArticle[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    const loadStories = async () => {
      if (activeTab === "drafts" && isAdmin) {
        const data = await fetchDrafts();
        setDrafts(data);
      } else {
        const data = await fetchStories(selectedTag || undefined);
        setStories(data);
        
        // Extract unique tags from all stories
        const tagsSet = new Set<string>();
        data.forEach((story) => {
          story.hashtags?.forEach((tag) => {
            tagsSet.add(tag);
          });
        });
        setAllTags(Array.from(tagsSet).sort());
      }
    };

    loadStories();
  }, [selectedTag, activeTab, fetchStories, fetchDrafts, isAdmin]);

  const clearTagFilter = () => {
    setSearchParams({ tab: activeTab });
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <>
      <Helmet>
        <title>Stories | Creatives Takeover</title>
        <meta
          name="description"
          content="Read stories, insights, and articles from Creatives Takeover. Learn about entrepreneurship, startups, marketing, fundraising, and more."
        />
        <meta
          name="keywords"
          content="startups, entrepreneurship, marketing, fundraising, business stories, creative insights"
        />
        <meta property="og:title" content="Stories | Creatives Takeover" />
        <meta
          property="og:description"
          content="Discover stories, insights, and articles about turning ideas into reality."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="/stories" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-2">Stories</h1>
                  <p className="text-muted-foreground text-lg">
                    Insights, tips, and stories about building and growing your business
                  </p>
                </div>
                {isAdmin && (
                  <Link to="/stories/admin/new">
                    <Button>Create Story</Button>
                  </Link>
                )}
              </div>

              {/* Tabs for Published/Drafts (Admin only) */}
              {isAdmin && (
                <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
                  <TabsList>
                    <TabsTrigger value="published">
                      Published ({stories.length})
                    </TabsTrigger>
                    <TabsTrigger value="drafts">
                      <FileText className="w-4 h-4 mr-2" />
                      Drafts ({drafts.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              {/* Tag Filter - Only show for published */}
              {selectedTag && activeTab === "published" && (
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    <Hash className="w-4 h-4 mr-1 inline" />
                    {selectedTag}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearTagFilter}
                    className="h-7 px-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Popular Tags - Only show for published */}
              {allTags.length > 0 && !selectedTag && activeTab === "published" && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="text-sm text-muted-foreground mr-2">Popular tags:</span>
                  {allTags.slice(0, 10).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => setSearchParams({ tag: tag.replace('#', ''), tab: 'published' })}
                    >
                      <Hash className="w-3 h-3 mr-1" />
                      {tag.replace('#', '')}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Content based on active tab */}
            {activeTab === "drafts" && isAdmin ? (
              /* Drafts View */
              loading ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">Loading drafts...</p>
                </div>
              ) : drafts.length === 0 ? (
                <div className="text-center py-16">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground text-lg mb-4">
                    No drafts saved yet
                  </p>
                  <Link to="/stories/admin/new">
                    <Button>Create Your First Draft</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {drafts.map((draft) => {
                    const updatedDate = new Date(draft.updated_at);
                    const timeAgo = formatDistanceToNow(updatedDate, { addSuffix: true });
                    
                    return (
                      <Card key={draft.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-xl font-semibold">{draft.title || "Untitled Draft"}</h3>
                                <Badge variant="secondary">Draft</Badge>
                              </div>
                              {draft.excerpt && (
                                <p className="text-muted-foreground mb-3 line-clamp-2">
                                  {draft.excerpt}
                                </p>
                              )}
                              {draft.linkedin_post_url && (
                                <p className="text-xs text-muted-foreground mb-2 font-mono break-all">
                                  {draft.linkedin_post_url}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4" />
                                  <span>Updated {timeAgo}</span>
                                </div>
                                {draft.hashtags && draft.hashtags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {draft.hashtags.slice(0, 3).map((tag, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {tag.replace('#', '')}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/stories/admin/edit/${draft.id}`)}
                              className="flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )
            ) : (
              /* Published Stories View */
              loading ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">Loading LinkedIn posts...</p>
                </div>
              ) : stories.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg mb-4">
                    {selectedTag
                      ? `No LinkedIn posts found with tag "${selectedTag}"`
                      : "No LinkedIn posts published yet"}
                  </p>
                  {selectedTag && (
                    <Button variant="outline" onClick={clearTagFilter}>
                      Clear filter
                    </Button>
                  )}
                  {isAdmin && !selectedTag && (
                    <Link to="/stories/admin/new">
                      <Button className="mt-4">Create Your First Post</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {stories
                    .filter((story) => story.linkedin_post_url) // Only show stories with LinkedIn URLs
                    .map((story) => (
                      <LinkedInPostEmbed
                        key={story.id}
                        url={story.linkedin_post_url!}
                        title={story.title}
                        excerpt={story.excerpt || undefined}
                        hashtags={story.hashtags}
                      />
                    ))}
                </div>
              )
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Stories;

