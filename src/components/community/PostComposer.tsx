import React, { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Send, X, Link } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import SignInModal from "./SignInModal";
import { useNavigate } from "react-router-dom";

export type ComposerPayload = {
  title: string;
  content: string;
  image?: string; // data URL preview for now
};

interface PostComposerProps {
  onPublish: (payload: ComposerPayload) => void;
  requireAuth?: boolean;
  reportData?: {
    title?: string;
    content?: string;
    tags?: string[];
    reportType?: string;
    businessContext?: any;
  };
}

const PostComposer: React.FC<PostComposerProps> = ({ onPublish, requireAuth = false, reportData }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState(reportData?.title || "");
  const [content, setContent] = useState(reportData?.content || "");
  const [imagePreview, setImagePreview] = useState<string | undefined>();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const isAIReport = !!reportData?.reportType;

  const reset = () => {
    setTitle("");
    setContent("");
    setImagePreview(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (requireAuth && !isAuthenticated) {
      // Track conversion trigger
      sessionStorage.setItem('conversion_source', JSON.stringify({
        type: 'community_post',
        timestamp: Date.now()
      }));
      setShowSignInModal(true);
      return;
    }
    
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
    
    if (requireAuth && !isAuthenticated) {
      // Track conversion trigger
      sessionStorage.setItem('conversion_source', JSON.stringify({
        type: 'community_post',
        timestamp: Date.now()
      }));
      setShowSignInModal(true);
      return;
    }
    
    if (title.trim().length < 3) {
      toast.error("Title is too short.");
      return;
    }
    if (content.trim().length < 10) {
      toast.error("Tell a bit more about your story.");
      return;
    }
    onPublish({ 
      title: title.trim(), 
      content: content.trim(), 
      image: imagePreview
    });
    toast.success("Your story has been posted!");
    reset();
  };

  const handleSignIn = () => {
    setShowSignInModal(false);
    navigate('/login?source=community-post&return=/community');
  };

  const handleSignUp = () => {
    setShowSignInModal(false);
    navigate('/signup?source=community-post&return=/community');
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            {isAIReport && <Badge variant="secondary" className="text-xs">🤖 AI-Generated Report</Badge>}
            {isAIReport ? 'Share AI Business Report' : 'Share your entrepreneurial story'}
          </CardTitle>
          {requireAuth && !isAuthenticated && (
            <p className="text-sm text-muted-foreground">Sign in to share your story with the community</p>
          )}
          {isAIReport && (
            <p className="text-sm text-muted-foreground">
              Share your BizMap AI analysis with the community for feedback and suggestions
            </p>
          )}
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
                disabled={requireAuth && !isAuthenticated}
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
              disabled={requireAuth && !isAuthenticated}
            />

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
                  disabled={requireAuth && !isAuthenticated}
                >
                  <ImageIcon className="mr-2 h-4 w-4" /> Add image
                </Button>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Link className="h-3 w-3" />
                  <span>URLs supported in text</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={reset}
                  disabled={requireAuth && !isAuthenticated}
                >
                  Reset
                </Button>
                <Button 
                  type="submit"
                  disabled={requireAuth && !isAuthenticated}
                >
                  <Send className="mr-2 h-4 w-4" /> 
                  {requireAuth && !isAuthenticated ? "Sign in to post" : "Post story"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <SignInModal
        open={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        triggerAction="post"
      />
    </>
  );
};
export default PostComposer;
