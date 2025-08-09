import React, { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Send, X, Hash } from "lucide-react";
import { toast } from "sonner";

export type ComposerPayload = {
  title: string;
  content: string;
  tags: string[];
  image?: string; // data URL preview for now
};

interface PostComposerProps {
  onPublish: (payload: ComposerPayload) => void;
}

const PostComposer: React.FC<PostComposerProps> = ({ onPublish }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const tags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 5),
    [tagsInput]
  );

  const reset = () => {
    setTitle("");
    setContent("");
    setTagsInput("");
    setImagePreview(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      toast.error("Title is too short.");
      return;
    }
    if (content.trim().length < 10) {
      toast.error("Tell a bit more about your story.");
      return;
    }
    onPublish({ title: title.trim(), content: content.trim(), tags, image: imagePreview });
    toast.success("Your story has been posted!");
    reset();
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl">Share your entrepreneurial story</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePublish} className="space-y-4">
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a clear, descriptive title"
              aria-label="Post title"
              maxLength={140}
            />
            <div className="mt-1 text-xs text-muted-foreground text-right">
              {title.length}/140
            </div>
          </div>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What did you try? What worked? What failed? Share insights others can learn from."
            aria-label="Post content"
            rows={6}
          />

          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Add up to 5 tags (comma separated): marketing, funding, saas"
              aria-label="Tags"
            />
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Badge key={t} variant="secondary">#{t}</Badge>
              ))}
            </div>
          )}

          {imagePreview && (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Selected image preview for your post"
                className="max-h-64 w-full rounded-md object-cover"
                loading="lazy"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 bg-background/70"
                onClick={() => setImagePreview(undefined)}
              >
                <X className="h-4 w-4" /> Remove
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                onChange={handleImagePick}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Attach image"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="mr-2 h-4 w-4" /> Add image
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={reset}>
                Reset
              </Button>
              <Button type="submit">
                <Send className="mr-2 h-4 w-4" /> Post story
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PostComposer;
