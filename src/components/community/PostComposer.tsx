import React, { useMemo, useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Send, X, Link, Video, Music } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import SignInModal from "./SignInModal";
import { useNavigate } from "react-router-dom";

const DRAFT_STORAGE_KEY = 'community_post_draft';

export type ComposerPayload = {
  title: string;
  content: string;
  postType?: string;
  image?: string;
  video?: string;
  audio?: string;
  mediaType?: 'image' | 'video' | 'audio';
};

const POST_TYPES = [
  { value: 'build_in_public', label: 'Build in Public 🚀' },
  { value: 'mindset', label: 'Mindset 🧠' },
  { value: 'growth_marketing', label: 'Growth & Marketing 📣' },
  { value: 'fundraising_revenue', label: 'Fundraising & Revenue 💰' },
  { value: 'product_validation', label: 'Product & Validation 🛠️' },
];

interface PostComposerProps {
  onPublish: (payload: ComposerPayload) => void | Promise<void>;
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
  const [postType, setPostType] = useState('build_in_public');
  const [mediaPreview, setMediaPreview] = useState<string | undefined>();
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | undefined>();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  
  const isAIReport = !!reportData?.reportType;

  // Restore draft from localStorage on mount
  useEffect(() => {
    // Only restore if there's no reportData (which would override the draft)
    if (!reportData) {
      try {
        const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          if (draft.title || draft.content) {
            setTitle(draft.title || "");
            setContent(draft.content || "");
          }
        }
      } catch (error) {
        console.error('Error restoring draft:', error);
      }
    }
  }, [reportData]);

  // Save draft to localStorage (debounced)
  useEffect(() => {
    // Don't save if it's an AI report (those have their own data)
    if (isAIReport) return;

    // Don't save empty drafts
    if (!title.trim() && !content.trim()) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return;
    }

    const timeoutId = setTimeout(() => {
      try {
        const draft = {
          title: title.trim(),
          content: content.trim(),
          timestamp: Date.now()
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch (error) {
        console.error('Error saving draft:', error);
      }
    }, 500); // Debounce by 500ms

    return () => clearTimeout(timeoutId);
  }, [title, content, isAIReport]);

  const reset = () => {
    setTitle("");
    setContent("");
    setPostType('build_in_public');
    setMediaPreview(undefined);
    setMediaType(undefined);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (audioInputRef.current) audioInputRef.current.value = "";
    // Clear draft from localStorage
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  const handleMediaPick = (type: 'image' | 'video' | 'audio') => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (requireAuth && !isAuthenticated) {
      sessionStorage.setItem('conversion_source', JSON.stringify({
        type: 'community_post',
        timestamp: Date.now()
      }));
      setShowSignInModal(true);
      return;
    }
    
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = {
      image: 'image/',
      video: 'video/',
      audio: 'audio/'
    };
    
    if (!file.type.startsWith(validTypes[type])) {
      toast.error(`Please select a ${type} file.`);
      return;
    }

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setMediaPreview(reader.result as string);
      setMediaType(type);
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
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
    const payload: ComposerPayload = { 
      title: title.trim(), 
      content: content.trim(),
      postType,
      mediaType
    };

    if (mediaType === 'image') payload.image = mediaPreview;
    if (mediaType === 'video') payload.video = mediaPreview;
    if (mediaType === 'audio') payload.audio = mediaPreview;

    // Clear draft before publishing
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    
    try {
      // Await the publish operation to complete
      await onPublish(payload);
      // Only reset and show success after publish succeeds
      reset();
      toast.success("Your story has been posted!");
    } catch (error) {
      // Error is already handled in handlePublish, just don't reset the form
      console.error('Publish error:', error);
    }
  };

  const handleSignIn = () => {
    setShowSignInModal(false);
    navigate('/login?source=community-post&return=/mentorship');
  };

  const handleSignUp = () => {
    setShowSignInModal(false);
    navigate('/signup?source=community-post&return=/mentorship');
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            {isAIReport && <Badge variant="secondary" className="text-xs">🤖 AI-Generated Report</Badge>}
            {isAIReport ? 'Share AI Business Report' : (
              requireAuth && !isAuthenticated ? (
                <span className="text-[#00d4ff] drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]">
                  Share Your Thoughts
                </span>
              ) : (
                'Share your creative work'
              )
            )}
          </CardTitle>
          {isAIReport && (
            <p className="text-sm text-muted-foreground">
              Share your BizMap AI analysis with the community for feedback and suggestions
            </p>
          )}
          {!isAIReport && (
            <p className="text-sm text-muted-foreground">
              Share your projects, progress, challenges, or insights with {requireAuth && !isAuthenticated ? 'your peers' : 'fellow creatives'}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePublish} className="space-y-4" noValidate>
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

            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Choose a room
              </label>
              <select
                value={postType}
                onChange={(event) => setPostType(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={requireAuth && !isAuthenticated}
              >
                {POST_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Textarea
                value={content}
                onChange={(e) => {
                  const newValue = e.target.value;
                  // Allow all characters including numbers, only limit by length
                  if (newValue.length <= 5000) {
                    setContent(newValue);
                  } else {
                    // If over limit, truncate to 5000 characters
                    setContent(newValue.slice(0, 5000));
                  }
                }}
                placeholder="Describe your work, process, challenges, or learnings. What inspired you? What did you discover?"
                aria-label="Post content"
                rows={6}
                maxLength={5000}
                disabled={requireAuth && !isAuthenticated}
                inputMode="text"
              />
              <div className="mt-1 text-xs text-muted-foreground text-right">
                <span className={content.length > 4500 ? 'text-destructive' : ''}>
                  {content.length}/5000
                </span>
              </div>
            </div>

            {mediaPreview && (
              <div className="relative">
                {mediaType === 'image' && (
                  <img
                    src={mediaPreview}
                    alt="Selected image preview for your post"
                    className="max-h-64 w-full rounded-md object-cover"
                    loading="lazy"
                  />
                )}
                {mediaType === 'video' && (
                  <video
                    src={mediaPreview}
                    controls
                    className="max-h-64 w-full rounded-md"
                  >
                    Your browser does not support video playback.
                  </video>
                )}
                {mediaType === 'audio' && (
                  <div className="p-4 border rounded-md bg-muted">
                    <audio src={mediaPreview} controls className="w-full">
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 bg-background/70"
                  onClick={() => {
                    setMediaPreview(undefined);
                    setMediaType(undefined);
                  }}
                >
                  <X className="h-4 w-4" /> Remove
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={imageInputRef}
                  onChange={handleMediaPick('image')}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  aria-label="Attach image"
                />
                <input
                  ref={videoInputRef}
                  onChange={handleMediaPick('video')}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  aria-label="Attach video"
                />
                <input
                  ref={audioInputRef}
                  onChange={handleMediaPick('audio')}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  aria-label="Attach audio"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={(requireAuth && !isAuthenticated) || !!mediaPreview}
                >
                  <ImageIcon className="mr-2 h-4 w-4" /> Image
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={(requireAuth && !isAuthenticated) || !!mediaPreview}
                >
                  <Video className="mr-2 h-4 w-4" /> Video
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={(requireAuth && !isAuthenticated) || !!mediaPreview}
                >
                  <Music className="mr-2 h-4 w-4" /> Audio
                </Button>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Link className="h-3 w-3" />
                  <span>URLs supported</span>
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
                  {requireAuth && !isAuthenticated ? "Sign in to post" : "Share"}
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
