import { useEffect, useState, useMemo, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useStories, StoryArticle } from "@/hooks/useStories";
import { generateSlug } from "@/utils/slugGenerator";
import { useAuth } from "@/contexts/AuthContext";
import { Save, Eye, X, Upload, Loader2, ArrowLeft, Maximize2, Minimize2, Layout, FileText, Search, Bold, Italic, Link, List, Type } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { toast } from "sonner";
import { StoryCardPreview } from "@/components/stories/StoryCardPreview";
import { generatePromoImageDataURL } from "@/utils/generatePromoImage";

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
  const [isDragging, setIsDragging] = useState(false);
  const bodyContentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const parseHashtags = (tagsString: string): string[] => {
    return tagsString
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
  };

  const handleBannerUpload = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB - matches bucket limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error(`Image size must be less than 5MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }

    // Check allowed MIME types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Image must be JPEG, PNG, WebP, or GIF");
      return;
    }

    setBannerFile(file);
    setUploadingBanner(true);

    // Create preview first
    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      // Upload to storage
      const url = await uploadBannerImage(file);
      if (url) {
        setFormData((prev) => ({
          ...prev,
          banner_image_url: url,
        }));
        // Keep the preview as the uploaded URL for consistency
        setBannerPreview(url);
        toast.success("Banner image uploaded successfully");
        // Clear file input so same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        // uploadBannerImage returned null, but didn't throw - show generic error
        toast.error("Failed to upload banner image. Please check your connection and try again.");
        setBannerPreview(null);
        setBannerFile(null);
        // Clear file input on error
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error: any) {
      console.error("Banner upload error:", error);
      // Error was thrown from uploadBannerImage with specific message
      toast.error(error.message || "Failed to upload banner image");
      setBannerPreview(null);
      setBannerFile(null);
      // Clear file input on error
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setUploadingBanner(false);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleBannerUpload(file);
    }
  };

  // Keyboard shortcuts for markdown formatting
  const handleMarkdownShortcut = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.body_content.substring(start, end);
    const beforeText = formData.body_content.substring(0, start);
    const afterText = formData.body_content.substring(end);

    // Ctrl/Cmd + B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      const formattedText = selectedText 
        ? `**${selectedText}**` 
        : `**bold text**`;
      const newContent = beforeText + formattedText + afterText;
      setFormData((prev) => ({ ...prev, body_content: newContent }));
      
      // Restore cursor position
      setTimeout(() => {
        const newPos = selectedText 
          ? start + formattedText.length 
          : start + formattedText.length - 11; // Position after "bold text"
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      }, 0);
    }

    // Ctrl/Cmd + I for italic
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      const formattedText = selectedText 
        ? `*${selectedText}*` 
        : `*italic text*`;
      const newContent = beforeText + formattedText + afterText;
      setFormData((prev) => ({ ...prev, body_content: newContent }));
      
      setTimeout(() => {
        const newPos = selectedText 
          ? start + formattedText.length 
          : start + formattedText.length - 11;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      }, 0);
    }

    // Ctrl/Cmd + K for link
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const linkText = selectedText || 'link text';
      const formattedText = `[${linkText}](url)`;
      const newContent = beforeText + formattedText + afterText;
      setFormData((prev) => ({ ...prev, body_content: newContent }));
      
      setTimeout(() => {
        const newPos = start + formattedText.length - 4; // Position before "url"
        textarea.setSelectionRange(newPos - 3, newPos);
        textarea.focus();
      }, 0);
    }
  };

  // Markdown formatting button helpers
  const insertMarkdownFormat = (format: 'bold' | 'italic' | 'link' | 'heading' | 'list') => {
    const textarea = bodyContentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.body_content.substring(start, end);
    const beforeText = formData.body_content.substring(0, start);
    const afterText = formData.body_content.substring(end);

    let formattedText = '';
    let newCursorPos = start;

    switch (format) {
      case 'bold':
        formattedText = selectedText ? `**${selectedText}**` : `**bold text**`;
        newCursorPos = selectedText ? start + formattedText.length : start + formattedText.length - 11;
        break;
      case 'italic':
        formattedText = selectedText ? `*${selectedText}*` : `*italic text*`;
        newCursorPos = selectedText ? start + formattedText.length : start + formattedText.length - 11;
        break;
      case 'link':
        formattedText = `[${selectedText || 'link text'}](url)`;
        newCursorPos = start + formattedText.length - 4; // Before "url"
        break;
      case 'heading':
        formattedText = selectedText ? `## ${selectedText}` : `## Heading`;
        newCursorPos = selectedText ? start + formattedText.length : start + formattedText.length - 7;
        break;
      case 'list':
        const lines = selectedText || 'List item';
        const listItems = lines.split('\n').map(line => `- ${line.trim()}`).join('\n');
        formattedText = listItems;
        newCursorPos = start + formattedText.length;
        break;
    }

    const newContent = beforeText + formattedText + afterText;
    setFormData((prev) => ({ ...prev, body_content: newContent }));

    setTimeout(() => {
      if (format === 'link' && !selectedText) {
        textarea.setSelectionRange(newCursorPos - 3, newCursorPos);
      } else {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
      textarea.focus();
    }, 0);
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

  // Generate promo image preview
  const promoImagePreview = useMemo(() => {
    if (bannerPreview) return null; // Don't show promo if banner exists
    if (!formData.title) return null;
    
    return generatePromoImageDataURL({
      title: formData.title,
      excerpt: formData.excerpt || undefined,
      hashtags: parseHashtags(formData.hashtags),
    });
  }, [formData.title, formData.excerpt, formData.hashtags, bannerPreview]);

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

                        {/* Banner Image */}
                        <div>
                          <Label>Banner Image</Label>
                          <div className="mt-2 space-y-3">
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
                            
                            {/* Promo Image Preview (if no banner) */}
                            {!bannerPreview && promoImagePreview && (
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">
                                  Auto-generated promotional preview (will be used if no banner uploaded):
                                </p>
                                <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                                  <img
                                    src={promoImagePreview}
                                    alt="Promo preview"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Drag and Drop Zone */}
                            <div
                              onDragEnter={handleDragEnter}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                                isDragging
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleBannerUpload(file);
                                  }
                                }}
                                disabled={uploadingBanner}
                                className="hidden"
                              />
                              {uploadingBanner ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                  <p className="text-sm text-muted-foreground">Uploading...</p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <Upload className="w-8 h-8 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm font-medium">
                                      Drag and drop an image here, or{' '}
                                      <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-primary hover:underline"
                                      >
                                        browse
                                      </button>
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      PNG, JPG, WebP, GIF up to 5MB
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                            {!bannerPreview && !uploadingBanner && (
                              <p className="text-xs text-muted-foreground">
                                Leave empty to use auto-generated promotional image
                              </p>
                            )}
                          </div>
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
                      <AccordionTrigger>Content</AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="body_content">Body Content (Markdown) *</Label>
                            <span className="text-xs text-muted-foreground">
                              {formData.body_content.split(/\s+/).length} words
                            </span>
                          </div>
                          
                          {/* Markdown Formatting Toolbar */}
                          <div className="flex items-center gap-1 p-2 border rounded-md bg-muted/30">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => insertMarkdownFormat('bold')}
                              title="Bold (Ctrl+B)"
                              className="h-8 w-8 p-0"
                            >
                              <Bold className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => insertMarkdownFormat('italic')}
                              title="Italic (Ctrl+I)"
                              className="h-8 w-8 p-0"
                            >
                              <Italic className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => insertMarkdownFormat('link')}
                              title="Link (Ctrl+K)"
                              className="h-8 w-8 p-0"
                            >
                              <Link className="h-4 w-4" />
                            </Button>
                            <Separator orientation="vertical" className="h-6" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => insertMarkdownFormat('heading')}
                              title="Heading"
                              className="h-8 w-8 p-0"
                            >
                              <Type className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => insertMarkdownFormat('list')}
                              title="List"
                              className="h-8 w-8 p-0"
                            >
                              <List className="h-4 w-4" />
                            </Button>
                          </div>

                          <Textarea
                            ref={bodyContentRef}
                            id="body_content"
                            value={formData.body_content}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                body_content: e.target.value,
                              }))
                            }
                            onKeyDown={handleMarkdownShortcut}
                            placeholder="Write your article content in Markdown..."
                            rows={20}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Keyboard shortcuts: <kbd className="px-1 py-0.5 text-xs font-semibold bg-muted rounded">Ctrl+B</kbd> bold, <kbd className="px-1 py-0.5 text-xs font-semibold bg-muted rounded">Ctrl+I</kbd> italic, <kbd className="px-1 py-0.5 text-xs font-semibold bg-muted rounded">Ctrl+K</kbd> link
                          </p>
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
                  <Tabs value={previewTab} onValueChange={setPreviewTab}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="card" className="flex items-center gap-2">
                        <Layout className="w-4 h-4" />
                        Card
                      </TabsTrigger>
                      <TabsTrigger value="article" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Article
                      </TabsTrigger>
                      <TabsTrigger value="seo" className="flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        SEO
                      </TabsTrigger>
                    </TabsList>

                    {/* Card Preview */}
                    <TabsContent value="card" className="mt-4">
                      <div className="max-w-md mx-auto">
                        <StoryCardPreview
                          title={formData.title || "Untitled Article"}
                          excerpt={formData.excerpt || undefined}
                          hashtags={hashtagsArray}
                          bodyContent={formData.body_content || ""}
                          bannerImageUrl={formData.banner_image_url || undefined}
                          status={formData.status}
                        />
                      </div>
                    </TabsContent>

                    {/* Article Preview */}
                    <TabsContent value="article" className="mt-4">
                      <div className="space-y-6">
                        {/* Banner */}
                        {bannerPreview && (
                          <div className="w-full h-64 overflow-hidden rounded-lg">
                            <img
                              src={bannerPreview}
                              alt="Banner preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        
                        {/* Title */}
                        <div>
                          <h1 className="text-4xl font-bold mb-4">
                            {formData.title || "Untitled Article"}
                          </h1>
                          {formData.excerpt && (
                            <p className="text-xl text-muted-foreground mb-4">
                              {formData.excerpt}
                            </p>
                          )}
                          {hashtagsArray.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {hashtagsArray.map((tag, idx) => (
                                <Badge key={idx} variant="secondary">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Content */}
                        <Separator />
                        <div className="prose prose-lg max-w-none dark:prose-invert">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                          >
                            {formData.body_content || "*Start writing your article content...*"}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </TabsContent>

                    {/* SEO Preview */}
                    <TabsContent value="seo" className="mt-4">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Page Title</Label>
                          <div className="mt-1 p-3 bg-muted rounded border">
                            <p className="text-sm font-medium">
                              {formData.meta_title || formData.title || "Untitled Article"} | Creatives Takeover Stories
                            </p>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Meta Description</Label>
                          <div className="mt-1 p-3 bg-muted rounded border">
                            <p className="text-sm text-muted-foreground">
                              {formData.meta_description || formData.excerpt || "No description provided"}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(formData.meta_description || formData.excerpt || "").length} / 160 characters
                          </p>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">URL (Slug)</Label>
                          <div className="mt-1 p-3 bg-muted rounded border">
                            <p className="text-sm font-mono">
                              {typeof window !== 'undefined' ? window.location.origin : 'https://creatives-takeover.com'}/stories/{formData.slug || "article-slug"}
                            </p>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Open Graph Preview</Label>
                          <div className="mt-1 border rounded-lg overflow-hidden bg-background">
                            {bannerPreview && (
                              <img
                                src={bannerPreview}
                                alt="OG Image"
                                className="w-full h-48 object-cover"
                              />
                            )}
                            <div className="p-3">
                              <p className="text-xs text-muted-foreground uppercase mb-1">
                                Creatives Takeover
                              </p>
                              <p className="text-sm font-semibold mb-1">
                                {formData.meta_title || formData.title || "Untitled Article"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formData.meta_description || formData.excerpt || "No description"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
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
