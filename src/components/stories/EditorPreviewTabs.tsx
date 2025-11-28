import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Layout, FileText, Search } from "lucide-react";
import { StoryCardPreview } from "./StoryCardPreview";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface EditorPreviewTabsProps {
  previewTab: string;
  onTabChange: (tab: string) => void;
  formData: {
    title: string;
    excerpt: string;
    body_content: string;
    hashtags: string[];
    banner_image_url?: string;
    meta_title: string;
    meta_description: string;
    status: 'draft' | 'published';
    slug?: string;
  };
  bannerPreview: string | null;
}

/**
 * Tabbed preview interface for the admin story editor
 * Shows Card Preview, Article Preview, and SEO Preview
 */
export const EditorPreviewTabs = ({
  previewTab,
  onTabChange,
  formData,
  bannerPreview,
}: EditorPreviewTabsProps) => {
  const hashtagsArray = formData.hashtags || [];

  return (
    <Tabs value={previewTab} onValueChange={onTabChange}>
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
            <label className="text-sm font-medium">Page Title</label>
            <div className="mt-1 p-3 bg-muted rounded border">
              <p className="text-sm font-medium">
                {formData.meta_title || formData.title || "Untitled Article"} | Creatives Takeover Stories
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Meta Description</label>
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
            <label className="text-sm font-medium">URL (Slug)</label>
            <div className="mt-1 p-3 bg-muted rounded border">
              <p className="text-sm font-mono">
                {typeof window !== 'undefined' ? window.location.origin : 'https://creatives-takeover.com'}/stories/{formData.slug || (formData.title ? formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : "article-slug")}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Open Graph Preview</label>
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
  );
};

