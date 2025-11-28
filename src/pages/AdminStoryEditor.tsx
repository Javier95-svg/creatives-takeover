import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useStories, StoryArticle } from "@/hooks/useStories";
import { generateSlug } from "@/utils/slugGenerator";
import { useAuth } from "@/contexts/AuthContext";
import { Save, X, Loader2, ArrowLeft, Maximize2, Minimize2, Layout, Linkedin } from "lucide-react";
import { toast } from "sonner";
import { EditorPreviewTabs } from "@/components/stories/EditorPreviewTabs";

const AdminStoryEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === "admin@creatives-takeover.com";
  const {
    fetchStoryById,
    createStory,
    updateStory,
    deleteStory,
    loading,
  } = useStories();

  const [article, setArticle] = useState<StoryArticle | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [previewTab, setPreviewTab] = useState('card');
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    body_content: "",
    linkedin_post_url: "",
    excerpt: "",
    hashtags: "",
    banner_image_url: "",
    meta_title: "",
    meta_description: "",
    status: "draft" as "draft" | "published",
  });


  useEffect(() => {
    if (!isAdmin) {
      toast.error("Only admins can access this page");
      navigate("/stories");
      return;
    }

    if (id && id !== "new") {
      loadArticle(id);
    }
  }, [id, isAdmin, navigate]);

  const loadArticle = async (articleId: string) => {
    const found = await fetchStoryById(articleId);

    if (found) {
      setArticle(found);
      setFormData({
        title: found.title,
        slug: found.slug,
        body_content: found.body_content || "",
        linkedin_post_url: found.linkedin_post_url || "",
        excerpt: found.excerpt || "",
        hashtags: found.hashtags?.join(", ") || "",
        banner_image_url: found.banner_image_url || "",
        meta_title: found.meta_title || "",
        meta_description: found.meta_description || "",
        status: found.status,
      });
    }
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const parseHashtags = (tagsString: string): string[] => {
    return tagsString
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
  };

  // Auto-generate title from LinkedIn URL if title is empty
  const handleLinkedInUrlChange = (url: string) => {
    const trimmedUrl = url.trim();
    setFormData((prev) => {
      const newData = { ...prev, linkedin_post_url: trimmedUrl };
      
      // Auto-generate title if empty and URL is valid
      if (!prev.title && trimmedUrl && validateLinkedInUrl(trimmedUrl)) {
        // Try to extract meaningful title from URL or use default
        const urlParts = trimmedUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        // Use a default title based on LinkedIn post
        newData.title = "LinkedIn Post";
        // Auto-generate slug if not set
        if (!prev.slug) {
          newData.slug = generateSlug("LinkedIn Post");
        }
      }
      
      return newData;
    });
  };

  // Validate LinkedIn URL
  const validateLinkedInUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    const linkedinPattern = /^https?:\/\/(www\.)?linkedin\.com\/(posts|feed\/update|pulse)\/.+/i;
    return linkedinPattern.test(url.trim());
  };

  const handleSave = async (publish = false) => {
    if (!formData.title || !formData.slug) {
      toast.error("Please fill in title and slug");
      return;
    }

    // Require LinkedIn URL
    if (!formData.linkedin_post_url || !validateLinkedInUrl(formData.linkedin_post_url)) {
      toast.error("Please enter a valid LinkedIn post URL");
      return;
    }

    const hashtags = parseHashtags(formData.hashtags);
    const storyData = {
      slug: formData.slug,
      title: formData.title,
      body_content: null, // Not used for LinkedIn posts
      linkedin_post_url: formData.linkedin_post_url,
      excerpt: formData.excerpt || null,
      hashtags,
      banner_image_url: null, // Not used for LinkedIn posts
      meta_title: formData.meta_title || null,
      meta_description: formData.meta_description || null,
      status: publish ? "published" : formData.status,
    };

    let result: StoryArticle | null = null;
    if (article) {
      result = await updateStory(article.id, storyData);
    } else {
      result = await createStory(storyData);
    }

    if (result) {
      toast.success(publish ? "Story published!" : "Story saved as draft");
      navigate(`/stories/${result.slug}`);
    }
  };

  const handleDelete = async () => {
    if (!article) return;

    if (confirm("Are you sure you want to delete this story?")) {
      const success = await deleteStory(article.id);
      if (success) {
        navigate("/stories");
      }
    }
  };


  if (!isAdmin) {
    return null;
  }

  const hashtagsArray = parseHashtags(formData.hashtags);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-[1600px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/stories")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold">
                  {article ? "Edit Story" : "Create New Story"}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {article ? `Editing: ${article.title}` : "Write and publish a new story"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (viewMode === 'split') setViewMode('edit');
                  else if (viewMode === 'edit') setViewMode('preview');
                  else setViewMode('split');
                }}
              >
                {viewMode === 'split' && <Layout className="w-4 h-4 mr-2" />}
                {viewMode === 'edit' && <Maximize2 className="w-4 h-4 mr-2" />}
                {viewMode === 'preview' && <Minimize2 className="w-4 h-4 mr-2" />}
                {viewMode === 'split' ? 'Split View' : viewMode === 'edit' ? 'Editor Only' : 'Preview Only'}
              </Button>
              {article && (
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  Delete
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave(false)}
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave(true)}
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                Publish
              </Button>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-6">
            <Badge variant={formData.status === 'published' ? 'default' : 'secondary'}>
              {formData.status === 'published' ? 'Published' : 'Draft'}
            </Badge>
          </div>

          {/* Split View Layout */}
          <div className={`grid gap-6 ${
            viewMode === 'split' 
              ? 'lg:grid-cols-2' 
              : viewMode === 'preview' 
              ? 'lg:grid-cols-1' 
              : 'lg:grid-cols-1'
          }`}>
            {/* Editor Panel */}
            {(viewMode === 'split' || viewMode === 'edit') && (
              <Card className="h-[calc(100vh-200px)] overflow-y-auto">
                <CardHeader>
                  <CardTitle>Editor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Accordion type="multiple" defaultValue={['basic', 'content', 'seo']} className="w-full">
                    {/* Basic Information */}
                    <AccordionItem value="basic">
                      <AccordionTrigger>Basic Information</AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        {/* Title */}
                        <div>
                          <Label htmlFor="title">Title *</Label>
                          <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            placeholder="Enter article title"
                            className="mt-1"
                          />
                        </div>

                        {/* Slug */}
                        <div>
                          <Label htmlFor="slug">Slug * (URL-friendly)</Label>
                          <Input
                            id="slug"
                            value={formData.slug}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, slug: e.target.value }))
                            }
                            placeholder="article-slug"
                            className="mt-1"
                          />
                        </div>

                        {/* Excerpt */}
                        <div>
                          <Label htmlFor="excerpt">Excerpt</Label>
                          <Textarea
                            id="excerpt"
                            value={formData.excerpt}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
                            }
                            placeholder="Short description for previews"
                            rows={3}
                            className="mt-1"
                          />
                        </div>

                        {/* Hashtags */}
                        <div>
                          <Label htmlFor="hashtags">Hashtags (comma-separated)</Label>
                          <Input
                            id="hashtags"
                            value={formData.hashtags}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, hashtags: e.target.value }))
                            }
                            placeholder="#startups, #marketing, #fundraising"
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Separate tags with commas. # will be added automatically if missing.
                          </p>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2 pt-2">
                          <Switch
                            checked={formData.status === "published"}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({
                                ...prev,
                                status: checked ? "published" : "draft",
                              }))
                            }
                          />
                          <Label>Published (unchecked = Draft)</Label>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Content */}
                    <AccordionItem value="content">
                      <AccordionTrigger>LinkedIn Post</AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="linkedin_post_url" className="flex items-center gap-2">
                              <Linkedin className="w-4 h-4" />
                              LinkedIn Post URL *
                            </Label>
                            <Input
                              id="linkedin_post_url"
                              type="url"
                              value={formData.linkedin_post_url}
                              onChange={(e) => handleLinkedInUrlChange(e.target.value)}
                              placeholder="https://www.linkedin.com/posts/username_activity-1234567890-abcdef"
                              className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                              Paste the URL of the LinkedIn post you want to embed. The post will be displayed as an embedded post on your Stories page.
                            </p>
                            {formData.linkedin_post_url && !validateLinkedInUrl(formData.linkedin_post_url) && (
                              <p className="text-xs text-destructive">
                                Please enter a valid LinkedIn post URL (e.g., https://www.linkedin.com/posts/...)
                              </p>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* SEO Settings */}
                    <AccordionItem value="seo">
                      <AccordionTrigger>SEO Settings</AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        <div>
                          <Label htmlFor="meta_title">Meta Title</Label>
                          <Input
                            id="meta_title"
                            value={formData.meta_title}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                meta_title: e.target.value,
                              }))
                            }
                            placeholder="Leave empty to use article title"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="meta_description">Meta Description</Label>
                          <Textarea
                            id="meta_description"
                            value={formData.meta_description}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                meta_description: e.target.value,
                              }))
                            }
                            placeholder="Leave empty to use excerpt"
                            rows={3}
                            className="mt-1"
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {/* Preview Panel */}
            {(viewMode === 'split' || viewMode === 'preview') && (
              <Card className="h-[calc(100vh-200px)] overflow-y-auto">
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <EditorPreviewTabs
                    previewTab={previewTab}
                    onTabChange={setPreviewTab}
                    formData={{
                      title: formData.title,
                      excerpt: formData.excerpt,
                      body_content: "",
                      linkedin_post_url: formData.linkedin_post_url,
                      hashtags: hashtagsArray,
                      banner_image_url: null,
                      meta_title: formData.meta_title,
                      meta_description: formData.meta_description,
                      status: formData.status,
                      slug: formData.slug,
                    }}
                    bannerPreview={null}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminStoryEditor;
