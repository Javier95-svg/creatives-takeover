import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Photo {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
}

interface PicturesGalleryProps {
  userId: string;
  isOwnProfile: boolean;
}

export const PicturesGallery = ({ userId, isOwnProfile }: PicturesGalleryProps) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadPhotos();
  }, [userId]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_photos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error: any) {
      console.error('Error loading photos:', error);
      toast.error('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    setShowUploadDialog(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);

      // Upload to storage
      const fileName = `${userId}/${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedFile, { upsert: false });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('user_photos')
        .insert({
          user_id: userId,
          image_url: publicUrl,
          caption: caption || null,
        });

      if (dbError) throw dbError;

      toast.success('Photo uploaded successfully!');
      setShowUploadDialog(false);
      setSelectedFile(null);
      setCaption("");
      setPreviewUrl(null);
      loadPhotos();
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      // Extract storage path from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts.slice(-2).join('/');

      // Delete from storage
      await supabase.storage
        .from('avatars')
        .remove([fileName]);

      // Delete from database
      const { error } = await supabase
        .from('user_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      toast.success('Photo deleted');
      loadPhotos();
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {isOwnProfile && (
          <div className="flex justify-end">
            <Label htmlFor="photo-upload" className="cursor-pointer">
              <Button type="button" size="sm" asChild>
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Photo
                </span>
              </Button>
            </Label>
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {photos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center">
                {isOwnProfile ? "Upload your first photo" : "No photos yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden group relative">
                <div className="aspect-square relative">
                  <img
                    src={photo.image_url}
                    alt={photo.caption || "Photo"}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  {isOwnProfile && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(photo.id, photo.image_url)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {photo.caption && (
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {photo.caption}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Photo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {previewUrl && (
              <div className="aspect-square w-full max-w-xs mx-auto rounded-lg overflow-hidden border">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div>
              <Label htmlFor="caption">Caption (optional)</Label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption to your photo..."
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {caption.length}/200 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                setSelectedFile(null);
                setCaption("");
                setPreviewUrl(null);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
