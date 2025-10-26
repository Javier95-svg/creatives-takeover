import React, { useState, useRef, useEffect } from "react";
import { Paperclip, X, FileText, Image as ImageIcon, Loader2, AlertCircle, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface FileAttachmentProps {
  onFileSelect: (files: File[]) => void;
  currentFiles?: File[];
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  iconOnly?: boolean;
}

interface AttachedFile {
  file: File;
  preview?: string;
  id: string;
}

export const FileAttachment: React.FC<FileAttachmentProps> = ({
  onFileSelect,
  currentFiles = [],
  maxFiles = 5,
  maxSizeMB = 10,
  acceptedTypes = ["image/*", "application/pdf", "text/*", ".doc", ".docx"],
  iconOnly = false,
}) => {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recentlyRemoved, setRecentlyRemoved] = useState<AttachedFile | null>(null);
  const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state with parent's currentFiles
  React.useEffect(() => {
    if (currentFiles.length === 0 && attachedFiles.length > 0) {
      setAttachedFiles([]);
    }
  }, [currentFiles.length]);

  const validateFile = (file: File): string | null => {
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `File "${file.name}" exceeds ${maxSizeMB}MB limit`;
    }

    const fileType = file.type;
    const fileExtension = `.${file.name.split(".").pop()}`;
    const isAccepted = acceptedTypes.some(
      (type) =>
        type === fileType ||
        type === fileExtension ||
        (type.endsWith("/*") && fileType.startsWith(type.replace("/*", "")))
    );

    if (!isAccepted) {
      return `File type "${file.type || fileExtension}" is not supported`;
    }

    return null;
  };

  const generatePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const filesArray = Array.from(files);

    if (attachedFiles.length + filesArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      setIsUploading(false);
      return;
    }

    const validatedFiles: AttachedFile[] = [];

    for (const file of filesArray) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        continue;
      }

      const preview = await generatePreview(file);
      validatedFiles.push({
        file,
        preview,
        id: `${Date.now()}-${Math.random()}`,
      });
    }

    if (validatedFiles.length > 0) {
      const newFiles = [...attachedFiles, ...validatedFiles];
      setAttachedFiles(newFiles);
      onFileSelect(newFiles.map((f) => f.file));
      toast.success(`${validatedFiles.length} file(s) attached`);
    }

    setIsUploading(false);
  };

  const removeFile = (id: string) => {
    const fileToRemove = attachedFiles.find((f) => f.id === id);
    if (!fileToRemove) return;

    const newFiles = attachedFiles.filter((f) => f.id !== id);
    setAttachedFiles(newFiles);
    onFileSelect(newFiles.map((f) => f.file));
    
    // Store removed file for undo
    setRecentlyRemoved(fileToRemove);
    
    // Clear any existing timeout
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
    }
    
    // Show undo toast with custom action
    toast("File removed", {
      description: fileToRemove.file.name,
      action: {
        label: "Undo",
        onClick: () => handleUndo(fileToRemove),
      },
      duration: 5000,
    });
    
    // Auto-clear recently removed after 5 seconds
    const timeoutId = setTimeout(() => {
      setRecentlyRemoved(null);
    }, 5000);
    setUndoTimeoutId(timeoutId);
  };

  const handleUndo = (file: AttachedFile) => {
    if (!file) return;
    
    const newFiles = [...attachedFiles, file];
    setAttachedFiles(newFiles);
    onFileSelect(newFiles.map((f) => f.file));
    setRecentlyRemoved(null);
    
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
      setUndoTimeoutId(null);
    }
    
    toast.success("File restored");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {/* Attach Button */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size={iconOnly ? "icon" : "sm"}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || attachedFiles.length >= maxFiles}
                className="text-muted-foreground hover:text-foreground"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
                {!iconOnly && (
                  <span className="ml-1 text-xs">
                    Attach Files ({attachedFiles.length}/{maxFiles})
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">
                Upload files to help BizMap AI analyze your business needs. Supported: images, PDFs, docs, spreadsheets
              </p>
            </TooltipContent>
          </Tooltip>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(",")}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Error State */}
        {attachedFiles.length >= maxFiles && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500">
            <AlertCircle className="w-4 h-4" />
            <span>Maximum file limit reached</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};