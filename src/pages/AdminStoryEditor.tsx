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
import { parseHashtags as parseHashtagsUtil } from "@/utils/hashtagUtils";
import { useAuth } from "@/contexts/AuthContext";
import { Save, X, Loader2, ArrowLeft, Maximize2, Minimize2, Layout, Linkedin, Image, Upload, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { EditorPreviewTabs } from "@/components/stories/EditorPreviewTabs";
import { ArticleBodyEditor } from "@/components/stories/ArticleBodyEditor";
import { supabase } from "@/integrations/supabase/client";
import { getArticleCitationStatus } from "@/lib/articleCitations";

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
    uploadBannerImage,
    loading,
  } = useStories();

  const [article, setArticle] = useState<StoryArticle | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [previewTab, setPreviewTab] = useState('card');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
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
      navigate("/newspaper");
      return;
    }

    if (id && id !== "new") {
      void loadArticle(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
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
    return parseHashtagsUtil(tagsString);
  };

  const handleLinkedInUrlChange = (url: string) => {
    setFormData((prev) => ({ ...prev, linkedin_post_url: url.trim() }));
  };

  // Validate LinkedIn URL
  const validateLinkedInUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    const linkedinPattern = /^https?:\/\/(www\.)?linkedin\.com\/(posts|feed\/update|pulse)\/.+/i;
    return linkedinPattern.test(url.trim());
  };

  // Handle banner image upload
  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    // Validate file size (5MB = 5242880 bytes)
    const maxSize = 5242880;
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    try {
      setUploadingBanner(true);

      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to storage
      const articleId = article?.id || 'temp';
      const publicUrl = await uploadBannerImage(file, articleId);

      if (publicUrl) {
        setFormData((prev) => ({
          ...prev,
          banner_image_url: publicUrl,
        }));
        toast.success('Banner image uploaded successfully');
      }
    } catch (error: any) {
      console.error('Error uploading banner:', error);
      toast.error('Failed to upload banner image');
    } finally {
      setUploadingBanner(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Handle banner removal
  const handleRemoveBanner = () => {
    setFormData((prev) => ({
      ...prev,
      banner_image_url: '',
    }));
    setBannerPreview(null);
    toast.success('Banner image removed');
  };

  const handleSave = async (publish = false) => {
    if (!formData.title || !formData.slug) {
      toast.error("Please fill in title and slug");
      return;
    }

    // The article body is the primary content now. A LinkedIn URL is optional.
    if (!formData.body_content.trim() && !formData.linkedin_post_url.trim()) {
      toast.error("Please add the article body before saving");
      return;
    }

    // If a LinkedIn URL is provided, it must be valid.
    if (formData.linkedin_post_url.trim() && !validateLinkedInUrl(formData.linkedin_post_url)) {
      toast.error("The LinkedIn URL is not valid. Clear it or paste a correct post URL.");
      return;
    }

    const citationStatus = getArticleCitationStatus(formData.body_content);
    const willPublish = publish || formData.status === "published";
    if (willPublish) {
      const rawMetaTitle = (formData.meta_title || formData.title).trim();
      const finalMetaTitle = rawMetaTitle.toLowerCase().includes("creatives takeover")
        ? rawMetaTitle
        : `${rawMetaTitle} | Creatives Takeover`;
      const finalMetaDescription = (formData.meta_description || formData.excerpt || formData.title).trim();
      const publishWarnings: string[] = [];
      if (finalMetaTitle.length > 65) {
        publishWarnings.push(`The final meta title is ${finalMetaTitle.length} characters; write a concise Meta Title that keeps the complete branded title at 65 characters or fewer.`);
      }
      if (finalMetaDescription.length < 80 || finalMetaDescription.length > 170) {
        publishWarnings.push(`The meta description is ${finalMetaDescription.length} characters; write a specific summary between 80 and 170 characters.`);
      }
      if (citationStatus.needsSourceWarning) {
        publishWarnings.push("The article contains quantitative claims but no external source links. Continue only if the figures are original Creatives Takeover data and the methodology is explained in the article.");
      }
      if (publishWarnings.length && !confirm(`${publishWarnings.join("\n\n")}\n\nPublish anyway?`)) {
        return;
      }
    }

    const hashtags = parseHashtags(formData.hashtags);
    const storyData = {
      slug: formData.slug,
      title: formData.title,
      body_content: formData.body_content.trim() || null,
      linkedin_post_url: formData.linkedin_post_url.trim() || null,
      excerpt: formData.excerpt || null,
      hashtags,
      banner_image_url: formData.banner_image_url || null,
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
      // Ping IndexNow on publish so the article is discovered in minutes, not on
      // the next crawl. Fire-and-forget — never block the editor on it.
      if (publish && result.status === "published") {
        void fetch("/api/indexnow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls: [`/newspaper/${result.slug}`, "/newspaper", "/sitemap-articles.xml"],
          }),
        }).catch(() => {});
      }
      navigate(`/newspaper/${result.slug}`);
    }
  };

  const handleDelete = async () => {
    if (!article) return;

    if (confirm("Are you sure you want to delete this story?")) {
      const success = await deleteStory(article.id);
      if (success) {
        navigate("/newspaper");
      }
    }
  };


  if (!isAdmin) {
    return null;
  }

  const hashtagsArray = parseHashtags(formData.hashtags);
  const citationStatus = getArticleCitationStatus(formData.body_content);
  const rawMetaTitlePreview = (formData.meta_title || formData.title).trim();
  const metaTitlePreview = rawMetaTitlePreview.toLowerCase().includes("creatives takeover")
    ? rawMetaTitlePreview
    : `${rawMetaTitlePreview} | Creatives Takeover`;
  const metaDescriptionPreview = (formData.meta_description || formData.excerpt || formData.title).trim();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-header-offset pb-16">
        <div className="container mx-auto px-6 max-w-[1600px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/newspaper")}>
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

                    {/* Article Body — primary content */}
                    <AccordionItem value="content">
                      <AccordionTrigger>Article Body *</AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <div className="space-y-2">
                          <Label>Body</Label>
                          <ArticleBodyEditor
                            value={formData.body_content}
                            onChange={(value) =>
                              setFormData((prev) => ({ ...prev, body_content: value }))
                            }
                            placeholder="Paste or write the full article here. Use the toolbar to format headings, quotes, and lists."
                          />
                          <p className="text-xs text-muted-foreground">
                            This is what readers see on the article page. Paste your text and format it with the toolbar.
                          </p>
                          <div
                            className={`rounded-lg border p-3 text-sm ${
                              citationStatus.needsSourceWarning
                                ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
                                : "border-border bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {citationStatus.needsSourceWarning ? (
                                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                              ) : (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" aria-hidden="true" />
                              )}
                              <div>
                                <p className="font-medium text-foreground">
                                  {citationStatus.citations.length} external source{citationStatus.citations.length === 1 ? "" : "s"} detected
                                </p>
                                <p className="mt-1 leading-relaxed">
                                  {citationStatus.needsSourceWarning
                                    ? "Quantitative claims need a source link, or an explicit note that the figure is original Creatives Takeover data with a described methodology."
                                    : "Markdown and pasted links are collected into the public Sources section and Article citation schema automatically."}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* LinkedIn — optional */}
                    <AccordionItem value="linkedin">
                      <AccordionTrigger>LinkedIn Post (optional)</AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="linkedin_post_url" className="flex items-center gap-2">
                            <Linkedin className="w-4 h-4" />
                            LinkedIn Post URL
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
                            Optional. If the article has no body yet, the LinkedIn post is shown as a fallback. Once you add a body, the body takes over and the article is read in-platform.
                          </p>
                          {formData.linkedin_post_url && !validateLinkedInUrl(formData.linkedin_post_url) && (
                            <p className="text-xs text-destructive">
                              Please enter a valid LinkedIn post URL (e.g., https://www.linkedin.com/posts/...)
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Banner Image */}
                    <AccordionItem value="banner">
                      <AccordionTrigger>Banner Image</AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <div className="space-y-4">
                          {/* Banner Preview */}
                          {(formData.banner_image_url || bannerPreview) && (
                            <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-muted">
                              <img
                                src={bannerPreview || formData.banner_image_url}
                                alt="Banner preview"
                                className="w-full h-full object-cover"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={handleRemoveBanner}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          )}

                          {/* Upload Input */}
                          <div className="space-y-2">
                            <Label htmlFor="banner_image" className="flex items-center gap-2">
                              <Image className="w-4 h-4" />
                              Banner Image
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="banner_image"
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handleBannerUpload}
                                disabled={uploadingBanner}
                                className="cursor-pointer"
                              />
                              {uploadingBanner && (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Upload a banner image to display above the article title. Max file size: 5MB. Supported formats: JPEG, PNG, WebP, GIF.
                            </p>
                            {formData.banner_image_url && (
                              <p className="text-xs text-muted-foreground">
                                Current banner: <span className="font-mono text-xs break-all">{formData.banner_image_url}</span>
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
                          <p className={`mt-1 text-xs ${metaTitlePreview.length > 65 ? "text-amber-600 dark:text-amber-300" : "text-muted-foreground"}`}>
                            Final title: {metaTitlePreview.length} characters (recommended maximum: 65). The brand suffix is included in this count.
                          </p>
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
                          <p className={`mt-1 text-xs ${metaDescriptionPreview.length < 80 || metaDescriptionPreview.length > 170 ? "text-amber-600 dark:text-amber-300" : "text-muted-foreground"}`}>
                            Final description: {metaDescriptionPreview.length} characters (recommended range: 80–170). It is used as written, without automatic padding or truncation.
                          </p>
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
                      body_content: formData.body_content,
                      linkedin_post_url: formData.linkedin_post_url,
                      hashtags: hashtagsArray,
                      banner_image_url: formData.banner_image_url || undefined,
                      meta_title: formData.meta_title,
                      meta_description: formData.meta_description,
                      status: formData.status,
                      slug: formData.slug,
                    }}
                    bannerPreview={bannerPreview || formData.banner_image_url || null}
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
