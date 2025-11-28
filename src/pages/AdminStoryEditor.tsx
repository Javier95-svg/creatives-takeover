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
import { useStories, StoryArticle } from "@/hooks/useStories";
import { generateSlug } from "@/utils/slugGenerator";
import { useAuth } from "@/contexts/AuthContext";
import { Save, Eye, X, Upload, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { toast } from "sonner";

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
  const [previewMode, setPreviewMode] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    body_content: "",
    excerpt: "",
    hashtags: "",
    banner_image_url: "",
    meta_title: "",
    meta_description: "",
    status: "draft" as "draft" | "published",
  });

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

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
        body_content: found.body_content,
        excerpt: found.excerpt || "",
        hashtags: found.hashtags?.join(", ") || "",
        banner_image_url: found.banner_image_url || "",
        meta_title: found.meta_title || "",
        meta_description: found.meta_description || "",
        status: found.status,
      });
      if (found.banner_image_url) {
        setBannerPreview(found.banner_image_url);
      }
    }
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const handleHashtagsChange = (value: string) => {
    // Convert comma-separated to array format
    setFormData((prev) => ({
      ...prev,
      hashtags: value,
    }));
  };

  const handleBannerUpload = async (file: File) => {
    setBannerFile(file);
    setUploadingBanner(true);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to storage
    const url = await uploadBannerImage(file);
    if (url) {
      setFormData((prev) => ({
        ...prev,
        banner_image_url: url,
      }));
      toast.success("Banner image uploaded");
    } else {
      toast.error("Failed to upload banner image");
    }

    setUploadingBanner(false);
  };

  const parseHashtags = (tagsString: string): string[] => {
    return tagsString
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
  };

  const handleSave = async (publish = false) => {
    if (!formData.title || !formData.body_content || !formData.slug) {
      toast.error("Please fill in title, slug, and body content");
      return;
    }

    const hashtags = parseHashtags(formData.hashtags);
    const storyData = {
      slug: formData.slug,
      title: formData.title,
      body_content: formData.body_content,
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">
                {article ? "Edit Story" : "Create New Story"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {article
                  ? `Editing: ${article.title}`
                  : "Write and publish a new story"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/stories")}>
                Cancel
              </Button>
              {article && (
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {previewMode ? "Edit" : "Preview"}
              </Button>
              <Button
                onClick={() => handleSave(false)}
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={loading}
              >
                Publish
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-6 space-y-6">
              {previewMode ? (
                // Preview Mode
                <div className="space-y-6">
                  {bannerPreview && (
                    <div className="w-full h-64 overflow-hidden rounded-lg">
                      <img
                        src={bannerPreview}
                        alt="Banner preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h1 className="text-4xl font-bold mb-4">{formData.title}</h1>
                    {formData.excerpt && (
                      <p className="text-xl text-muted-foreground mb-4">
                        {formData.excerpt}
                      </p>
                    )}
                    {formData.hashtags && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {parseHashtags(formData.hashtags).map((tag, idx) => (
                          <Badge key={idx} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="prose prose-lg max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                    >
                      {formData.body_content}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                // Edit Mode
                <>
                  {/* Title */}
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Enter article title"
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
                    />
                  </div>

                  {/* Banner Image */}
                  <div>
                    <Label>Banner Image</Label>
                    <div className="mt-2 space-y-2">
                      {bannerPreview && (
                        <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                          <img
                            src={bannerPreview}
                            alt="Banner preview"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setBannerPreview(null);
                              setBannerFile(null);
                              setFormData((prev) => ({
                                ...prev,
                                banner_image_url: "",
                              }));
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleBannerUpload(file);
                            }
                          }}
                          disabled={uploadingBanner}
                        />
                        {uploadingBanner && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                      </div>
                    </div>
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
                    />
                  </div>

                  {/* Hashtags */}
                  <div>
                    <Label htmlFor="hashtags">Hashtags (comma-separated)</Label>
                    <Input
                      id="hashtags"
                      value={formData.hashtags}
                      onChange={(e) => handleHashtagsChange(e.target.value)}
                      placeholder="#startups, #marketing, #fundraising"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Separate tags with commas. # will be added automatically if
                      missing.
                    </p>
                  </div>

                  {/* Body Content - Markdown */}
                  <div>
                    <Label htmlFor="body_content">Body Content (Markdown) *</Label>
                    <Textarea
                      id="body_content"
                      value={formData.body_content}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          body_content: e.target.value,
                        }))
                      }
                      placeholder="Write your article content in Markdown..."
                      rows={20}
                      className="font-mono text-sm"
                    />
                  </div>

                  {/* SEO Fields */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">SEO Settings</h3>
                    <div className="space-y-4">
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
                        />
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.status === "published"}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: checked ? "published" : "draft",
                        }))
                      }
                    />
                    <Label>
                      Published (unchecked = Draft)
                    </Label>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminStoryEditor;

