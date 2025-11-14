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
import { ImageCropper } from "./ImageCropper";
import { VideoCropper } from "./VideoCropper";

export type ComposerPayload = {
  title: string;
  content: string;
  image?: string;
  video?: string;
  audio?: string;
  mediaType?: 'image' | 'video' | 'audio';
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
  const [mediaPreview, setMediaPreview] = useState<string | undefined>();
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | undefined>();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [showVideoCropper, setShowVideoCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | undefined>();
  const [originalVideo, setOriginalVideo] = useState<string | undefined>();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  
  const isAIReport = !!reportData?.reportType;

  // Debug: Log when cropper should show
  useEffect(() => {
    if (showCropper && originalImage) {
      console.log('ImageCropper should be visible', { showCropper, hasImage: !!originalImage, imageLength: originalImage.length });
    }
  }, [showCropper, originalImage]);

  const reset = () => {
    setTitle("");
    setContent("");
    setMediaPreview(undefined);
    setMediaType(undefined);
    setOriginalImage(undefined);
    setOriginalVideo(undefined);
    setShowCropper(false);
    setShowVideoCropper(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (audioInputRef.current) audioInputRef.current.value = "";
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
      const mediaUrl = reader.result as string;
      if (type === 'image') {
        // Store original image and show cropper
        console.log('Image loaded, showing cropper');
        setOriginalImage(mediaUrl);
        setShowCropper(true);
      } else if (type === 'video') {
        // Store original video and show video cropper
        console.log('Video loaded, showing video cropper');
        setOriginalVideo(mediaUrl);
        setShowVideoCropper(true);
      } else {
        // For audio, set preview directly
        setMediaPreview(mediaUrl);
        setMediaType(type);
      }
    };
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      toast.error('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setMediaPreview(croppedImageUrl);
    setMediaType('image');
    setShowCropper(false);
    setOriginalImage(undefined);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setOriginalImage(undefined);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleVideoCropComplete = (croppedVideoUrl: string) => {
    setMediaPreview(croppedVideoUrl);
    setMediaType('video');
    setShowVideoCropper(false);
    setOriginalVideo(undefined);
  };

  const handleVideoCropCancel = () => {
    setShowVideoCropper(false);
    setOriginalVideo(undefined);
    if (videoInputRef.current) videoInputRef.current.value = "";
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
    const payload: ComposerPayload = { 
      title: title.trim(), 
      content: content.trim(),
      mediaType
    };

    if (mediaType === 'image') payload.image = mediaPreview;
    if (mediaType === 'video') payload.video = mediaPreview;
    if (mediaType === 'audio') payload.audio = mediaPreview;

    onPublish(payload);
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
              placeholder="Describe your work, process, challenges, or learnings. What inspired you? What did you discover?"
              aria-label="Post content"
              rows={6}
              disabled={requireAuth && !isAuthenticated}
            />

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

      {/* Image Cropper Modal */}
      {showCropper && originalImage && (
        <ImageCropper
          image={originalImage}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={null}
        />
      )}

      {/* Video Cropper Modal */}
      {showVideoCropper && originalVideo && (
        <VideoCropper
          video={originalVideo}
          onCropComplete={handleVideoCropComplete}
          onCancel={handleVideoCropCancel}
        />
      )}

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
