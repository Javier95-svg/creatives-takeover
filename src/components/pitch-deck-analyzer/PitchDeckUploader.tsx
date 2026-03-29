import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Lock, Sparkles, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  onClearFile,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSignedIn = Boolean(user);
  const isProcessing = isUploading || isAnalyzing;

  const validateFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF export of your pitch deck');
      return false;
    }

    if (file.size > 20 * 1024 * 1024) {
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

    if (!files?.length) return;

    const file = files[0];
    if (validateFile(file)) {
      onFileSelected(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!isSignedIn || isProcessing) return;
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelect(event.dataTransfer.files);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          className={`relative overflow-hidden rounded-[32px] border p-6 transition-all duration-200 sm:p-8 ${
            isDragging && isSignedIn
              ? 'border-primary/45 bg-primary/5 shadow-[0_30px_80px_-50px_rgba(14,165,233,0.45)]'
              : 'border-border/60 bg-background/75 shadow-[0_30px_90px_-70px_rgba(15,23,42,0.9)]'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />

          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                Upload
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Drop the PDF export of your pitch deck
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                We parse the slides, score the deck from 1 to 100, and return investor-style
                recommendations you can act on immediately.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5">
                  PDF only
                </span>
                <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5">
                  Max 20MB
                </span>
                <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5">
                  Score + rewrite guidance
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-border/60 bg-card/70 p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {isSignedIn
                      ? isDragging
                        ? 'Release to upload'
                        : 'Ready for analysis'
                      : 'Sign in required'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isSignedIn
                      ? 'Investor-style scoring, deck gap detection, and concrete next steps.'
                      : 'Upload and analysis are available for signed-in users.'}
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                className="mt-5 h-12 w-full rounded-2xl"
                disabled={isProcessing}
                onClick={() => {
                  if (!isSignedIn) {
                    navigate('/login');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
              >
                {!isSignedIn ? (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Sign in to upload
                  </>
                ) : isProcessing ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Choose PDF deck
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[28px] border border-primary/25 bg-primary/5 p-5 shadow-[0_24px_60px_-50px_rgba(14,165,233,0.55)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="rounded-2xl bg-background p-3 text-primary shadow-sm">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{selectedFile.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  PDF export • {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>

            {!isProcessing && onClearFile && (
              <Button variant="ghost" size="icon" onClick={onClearFile} className="rounded-2xl">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => handleFileSelect(event.target.files)}
        disabled={isProcessing || !isSignedIn}
      />
    </div>
  );
};
