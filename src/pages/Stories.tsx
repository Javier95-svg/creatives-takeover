import { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { StoryCard } from "@/components/stories/StoryCard";
import StoriesHero from "@/components/stories/StoriesHero";
import StoriesWallpaper from "@/components/wallpapers/StoriesWallpaper";
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
import { slugifyTag } from "@/utils/hashtagUtils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

const ARTICLES_PER_PAGE = 18;

const Stories = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedTag = searchParams.get("tag");
  const activeTab = searchParams.get("tab") || "published";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const { fetchStories, fetchDrafts, loading, isAdmin } = useStories();
  const { user } = useAuth();
  const [stories, setStories] = useState<StoryArticle[]>([]);
  const [drafts, setDrafts] = useState<StoryArticle[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Redirect old query param URLs to clean URLs (backward compatibility)
  useEffect(() => {
    if (selectedTag && activeTab === "published") {
      // Redirect to clean URL format
      const tagSlug = slugifyTag(`#${selectedTag}`);
      navigate(`/stories/tags/${tagSlug}`, { replace: true });
    }
  }, [selectedTag, activeTab, navigate]);

  useEffect(() => {
    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    isMountedRef.current = true;

    const loadStories = async () => {
      try {
        if (signal.aborted || !isMountedRef.current) return;

        if (activeTab === "drafts" && isAdmin) {
          const data = await fetchDrafts();
          if (signal.aborted || !isMountedRef.current) return;
          setDrafts(data);
        } else {
          // Only load stories if no tag is selected (otherwise redirect will handle it)
          if (!selectedTag) {
            const data = await fetchStories();
            if (signal.aborted || !isMountedRef.current) return;
            
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
        }
      } catch (error) {
        if (!signal.aborted && isMountedRef.current) {
          console.error('Error loading stories:', error);
        }
      }
    };

    loadStories();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedTag, activeTab, fetchStories, fetchDrafts, isAdmin]);

  const clearTagFilter = () => {
    setSearchParams({ tab: activeTab, page: "1" });
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value, page: "1" });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    setSearchParams(params);
    // Scroll to top of content section
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculate pagination for published stories
  const filteredStories = stories.filter((story) => story.linkedin_post_url);
  const totalPages = Math.ceil(filteredStories.length / ARTICLES_PER_PAGE);
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const endIndex = startIndex + ARTICLES_PER_PAGE;
  const paginatedStories = filteredStories.slice(startIndex, endIndex);

  // Calculate pagination for drafts
  const totalDraftPages = Math.ceil(drafts.length / ARTICLES_PER_PAGE);
  const draftStartIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const draftEndIndex = draftStartIndex + ARTICLES_PER_PAGE;
  const paginatedDrafts = drafts.slice(draftStartIndex, draftEndIndex);

  // Generate page numbers to display with ellipsis
  const getPageNumbers = (totalPages: number, currentPage: number) => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 3) {
        // Near the start
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push("ellipsis");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    const maxPages = activeTab === "drafts" ? totalDraftPages : totalPages;
    if (currentPage > maxPages && maxPages > 0) {
      const params = new URLSearchParams(searchParams);
      params.set("page", "1");
      setSearchParams(params);
    }
  }, [currentPage, totalPages, totalDraftPages, activeTab, searchParams, setSearchParams]);

  return (
    <>
      <Helmet>
        <title>Stories | Creatives Takeover</title>
        <meta
          name="description"
          content="Read expert stories, insights, and articles from Creatives Takeover. Learn about entrepreneurship, startups, marketing, fundraising, business strategy, and creative success stories from industry leaders."
        />
        <meta
          name="keywords"
          content="startups, entrepreneurship, marketing, fundraising, business stories, creative insights, business strategy, startup advice, entrepreneur stories, business growth"
        />
        <meta name="author" content="Creatives Takeover" />
        <meta property="og:title" content="Stories | Creatives Takeover" />
        <meta
          property="og:description"
          content="Discover expert stories, insights, and articles about turning ideas into reality. Learn from successful entrepreneurs and creative professionals."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://creatives-takeover.com/stories" />
        <meta property="og:site_name" content="Creatives Takeover" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Stories | Creatives Takeover" />
        <meta name="twitter:description" content="Discover expert stories, insights, and articles about turning ideas into reality." />
        <meta name="twitter:site" content="@CreativesTakeover" />
        <link rel="canonical" href="https://creatives-takeover.com/stories" />
        <link rel="alternate" type="application/rss+xml" title="Creatives Takeover Stories RSS Feed" href="https://creatives-takeover.com/stories/rss.xml" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="relative pb-16">
          {/* Unified Wallpaper for entire Stories page */}
          <StoriesWallpaper />
          
          {/* Hero Section */}
          <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden z-10">
            <StoriesHero />
          </section>

          {/* Content Section */}
          <section className="relative z-10">
            <div className="container mx-auto px-6 max-w-7xl relative z-10">
            {/* Admin Controls */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
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
                <div className="mt-6 p-6 border rounded-lg bg-muted/30">
                  <h3 className="text-lg font-semibold mb-4">Explore Topics</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Browse stories by topic to find insights relevant to your interests
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allTags.slice(0, 15).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-sm px-3 py-1"
                        onClick={() => {
                          const tagSlug = slugifyTag(tag);
                          navigate(`/stories/tags/${tagSlug}`);
                        }}
                      >
                        <Hash className="w-3 h-3 mr-1" />
                        {tag.replace('#', '')}
                      </Badge>
                    ))}
                  </div>
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
                <>
                <div className="space-y-4">
                  {paginatedDrafts.map((draft) => {
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
                {totalDraftPages > 1 && (
                  <div className="mt-8">
                    <Pagination>
                      <PaginationContent>
                        {currentPage > 1 && (
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(currentPage - 1);
                              }}
                            />
                          </PaginationItem>
                        )}
                        {getPageNumbers(totalDraftPages, currentPage).map((page, index) => {
                          if (page === "ellipsis") {
                            return (
                              <PaginationItem key={`ellipsis-${index}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }

                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handlePageChange(page as number);
                                }}
                                isActive={page === currentPage}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        {currentPage < totalDraftPages && (
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(currentPage + 1);
                              }}
                            />
                          </PaginationItem>
                        )}
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
                </>
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
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedStories.map((story) => (
                      <div key={story.id} className="relative group">
                        <StoryCard article={story} />
                        {/* Admin Edit Button - Overlay */}
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/stories/admin/edit/${story.id}`);
                            }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm hover:bg-background z-10"
                            aria-label={`Edit ${story.title}`}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination>
                      <PaginationContent>
                        {currentPage > 1 && (
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(currentPage - 1);
                              }}
                            />
                          </PaginationItem>
                        )}
                        {getPageNumbers(totalPages, currentPage).map((page, index) => {
                          if (page === "ellipsis") {
                            return (
                              <PaginationItem key={`ellipsis-${index}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }

                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handlePageChange(page as number);
                                }}
                                isActive={page === currentPage}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        {currentPage < totalPages && (
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(currentPage + 1);
                              }}
                            />
                          </PaginationItem>
                        )}
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
                </>
              )
            )}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Stories;

