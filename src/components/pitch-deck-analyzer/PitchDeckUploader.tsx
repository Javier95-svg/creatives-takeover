import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface PitchDeckUploaderProps {
  onFileSelected: (file: File) => void;
  isUploading?: boolean;
  isAnalyzing?: boolean;
  selectedFile?: File | null;
  onClearFile?: () => void;
}

export const PitchDeckUploader: React.FC<PitchDeckUploaderProps> = ({
  onFileSelected,
  isUploading = false,
  isAnalyzing = false,
  selectedFile = null,
  onClearFile
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSignedIn = Boolean(user);

  const validateFile = (file: File): boolean => {
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return false;
    }

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 20MB');
      return false;
    }

    return true;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!isSignedIn) {
      toast.error('Sign in to upload your pitch deck');
      return;
    }

    if (!files || files.length === 0) return;

    const file = files[0];
    if (validateFile(file)) {
      onFileSelected(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      setIsDragging(false);
      return;
    }
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!isSignedIn) {
      toast.error('Sign in to upload your pitch deck');
      return;
    }

    handleFileSelect(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isProcessing = isUploading || isAnalyzing;
  const isUploadDisabled = isProcessing || !isSignedIn;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {!selectedFile ? (
        <Card
          className={`border-2 border-dashed transition-all duration-200 ${
            isDragging && isSignedIn
              ? 'border-primary bg-primary/5 scale-105'
              : isSignedIn
                ? 'border-muted-foreground/25 hover:border-primary/50'
                : 'border-muted-foreground/25 bg-muted/20'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="p-10 sm:p-16">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="rounded-full bg-primary/10 p-6">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">
                  {isSignedIn
                    ? isDragging
                      ? 'Drop your pitch deck here'
                      : 'Drop your PDF presentation here'
                    : 'Sign in to upload your pitch deck'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isSignedIn ? 'or click to browse' : 'upload is available for signed-in users'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  PDF only • Maximum 20MB
                </p>
              </div>
              <Button
                variant="default"
                size="lg"
                onClick={() => {
                  if (!isSignedIn) {
                    navigate('/login');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                disabled={isProcessing}
                className="mt-2"
              >
                {!isSignedIn ? (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Sign In to Upload
                  </>
                ) : isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div className="rounded-lg bg-primary/10 p-3">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              {!isUploadDisabled && onClearFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClearFile}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
        disabled={isUploadDisabled}
      />
    </div>
  );
};
