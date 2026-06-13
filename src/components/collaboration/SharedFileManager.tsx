import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { CollaborationFile } from '@/hooks/useInteractiveCollaboration';
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  Download, 
  Trash2, 
  Share2, 
  Tag,
  Search,
  Filter,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SharedFileManagerProps {
  files: CollaborationFile[];
  currentUserId?: string;
  onUploadFile: (file: File, description?: string, tags?: string[], isPublic?: boolean) => Promise<CollaborationFile | null>;
  onDownloadFile: (fileId: string) => void;
}

export const SharedFileManager: React.FC<SharedFileManagerProps> = ({
  files,
  currentUserId,
  onUploadFile,
  onDownloadFile,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'my-files' | 'images' | 'documents'>('all');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadDetails, setUploadDetails] = useState({
    description: '',
    tags: '',
    isPublic: false,
  });

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const tags = uploadDetails.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      const result = await onUploadFile(file, uploadDetails.description, tags, uploadDetails.isPublic);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result) {
        toast({
          title: "File uploaded successfully",
          description: `${file.name} has been shared with the team`,
        });
        
        setUploadDetails({ description: '', tags: '', isPublic: false });
        setShowUploadForm(false);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const getFileTypeColor = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'bg-success-subtle text-success';
    if (fileType.includes('pdf')) return 'bg-destructive-subtle text-destructive';
    if (fileType.includes('document')) return 'bg-info-subtle text-info';
    if (fileType.includes('spreadsheet')) return 'bg-success-subtle text-success';
    return 'bg-muted text-foreground';
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         file.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = 
      selectedFilter === 'all' ||
      (selectedFilter === 'my-files' && file.uploaded_by === currentUserId) ||
      (selectedFilter === 'images' && file.file_type.startsWith('image/')) ||
      (selectedFilter === 'documents' && (file.file_type.includes('pdf') || file.file_type.includes('document')));

    return matchesSearch && matchesFilter;
  });

  const groupedFiles = filteredFiles.reduce((groups, file) => {
    const date = new Date(file.created_at).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(file);
    return groups;
  }, {} as Record<string, CollaborationFile[]>);

  const sortedDates = Object.keys(groupedFiles).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Shared Files
            <Badge variant="secondary">
              {files.length} files
            </Badge>
          </CardTitle>
          <Button size="sm" onClick={handleFileSelect} disabled={uploading}>
            {uploading ? (
              <>
                <Progress value={uploadProgress} className="w-16 h-2 mr-2" />
                {uploadProgress}%
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {selectedFilter === 'all' ? 'All Files' :
                 selectedFilter === 'my-files' ? 'My Files' :
                 selectedFilter === 'images' ? 'Images' : 'Documents'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSelectedFilter('all')}>
                All Files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedFilter('my-files')}>
                My Files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedFilter('images')}>
                Images
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedFilter('documents')}>
                Documents
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <Card className="border-primary/20">
            <CardContent className="pt-4 space-y-3">
              <Textarea
                placeholder="File description (optional)..."
                value={uploadDetails.description}
                onChange={(e) => setUploadDetails(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
              <Input
                placeholder="Tags (comma separated)..."
                value={uploadDetails.tags}
                onChange={(e) => setUploadDetails(prev => ({ ...prev, tags: e.target.value }))}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={uploadDetails.isPublic}
                    onChange={(e) => setUploadDetails(prev => ({ ...prev, isPublic: e.target.checked }))}
                  />
                  <span className="text-sm">Make file public</span>
                </label>
                <Button variant="ghost" size="sm" onClick={() => setShowUploadForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Files List */}
        <div className="flex-1 overflow-auto">
          {filteredFiles.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No files shared yet</p>
              <p className="text-sm">Upload files to share with your team</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDates.map(date => (
                <div key={date} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {new Date(date).toDateString() === new Date().toDateString() 
                        ? 'Today' 
                        : new Date(date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'short', 
                            day: 'numeric' 
                          })
                      }
                    </h3>
                    <Separator className="flex-1" />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {groupedFiles[date].map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        isOwner={file.uploaded_by === currentUserId}
                        onDownload={() => onDownloadFile(file.id)}
                        onShare={() => {
                          navigator.clipboard.writeText(file.filename);
                          toast({
                            title: "Link copied",
                            description: "File link copied to clipboard",
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          onClick={() => setShowUploadForm(true)}
        />
      </CardContent>
    </Card>
  );
};

interface FileCardProps {
  file: CollaborationFile;
  isOwner: boolean;
  onDownload: () => void;
  onShare: () => void;
}

const FileCard: React.FC<FileCardProps> = ({
  file,
  isOwner,
  onDownload,
  onShare,
}) => {
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4 text-success" />;
    if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="h-4 w-4 text-destructive" />;
    return <File className="h-4 w-4 text-info" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-shrink-0">
        {getFileIcon(file.file_type)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm truncate">{file.original_filename}</h4>
          {file.is_public && <Badge variant="outline" className="text-xs">Public</Badge>}
        </div>
        
        {file.description && (
          <p className="text-xs text-muted-foreground truncate">{file.description}</p>
        )}
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <div className="flex items-center gap-1">
            <Avatar className="h-4 w-4">
              <AvatarImage src={file.profiles?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {file.profiles?.full_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            {file.profiles?.full_name || 'Anonymous'}
          </div>
          <span>{formatFileSize(file.file_size_bytes)}</span>
          <span>{formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}</span>
        </div>

        {file.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Tag className="h-3 w-3 text-muted-foreground" />
            {file.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {file.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{file.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onDownload}>
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onShare}>
          <Share2 className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
            {isOwner && (
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};