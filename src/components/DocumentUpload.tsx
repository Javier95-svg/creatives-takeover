import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDocumentAnalysis, DocumentAnalysis } from '@/hooks/useDocumentAnalysis';
import { toast } from 'sonner';

interface DocumentUploadProps {
  conversationId?: string;
  onDocumentUploaded?: (document: DocumentAnalysis) => void;
  maxFiles?: number;
  className?: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  conversationId,
  onDocumentUploaded,
  maxFiles = 5,
  className = ''
}) => {
  const { documents, isUploading, isAnalyzing, uploadDocument, deleteDocument } = useDocumentAnalysis(conversationId);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (documents.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} documents allowed`);
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const document = await uploadDocument(file);
      if (document && onDocumentUploaded) {
        onDocumentUploaded(document);
      }
    }
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
    handleFileSelect(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('csv')) return '📈';
    return '📎';
  };

  return (
    <div className={className}>
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                {isDragging ? 'Drop files here' : 'Upload business documents'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, Word, Excel, CSV, or text files (max 20MB)
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isAnalyzing || documents.length >= maxFiles}
            >
              {isUploading || isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isAnalyzing ? 'Analyzing...' : 'Uploading...'}
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Select Files
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Uploaded Documents ({documents.length}/{maxFiles})
          </p>
          {documents.map((doc) => (
            <Card key={doc.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="text-2xl">{getFileIcon(doc.file_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {formatFileSize(doc.file_size)}
                      </Badge>
                      {doc.extracted_text && (
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Analyzed
                        </Badge>
                      )}
                      {doc.ai_analysis?.metadata?.word_count && (
                        <Badge variant="outline" className="text-xs">
                          {doc.ai_analysis.metadata.word_count} words
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteDocument(doc.id, doc.storage_path)}
                  className="ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Info Message */}
      {documents.length > 0 && (
        <div className="mt-4 p-3 bg-info-subtle dark:bg-info/20 rounded-lg border border-info dark:border-info">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-info dark:text-info mt-0.5" />
            <p className="text-xs text-info dark:text-info">
              Uploaded documents are automatically analyzed and can be referenced in your conversations with BizMap AI.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

