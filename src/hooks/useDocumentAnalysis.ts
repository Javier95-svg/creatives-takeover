import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DocumentAnalysis {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  extracted_text: string | null;
  ai_analysis: {
    metadata?: {
      word_count?: number;
      file_type?: string;
      page_count?: number;
    };
    tables?: Array<{
      headers: string[];
      rows: string[][];
    }>;
  } | null;
  created_at: string;
}

export const useDocumentAnalysis = (conversationId?: string) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentAnalysis[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Upload and parse document
  const uploadDocument = useCallback(async (file: File): Promise<DocumentAnalysis | null> => {
    if (!user) {
      toast.error('Please sign in to upload documents');
      return null;
    }

    setIsUploading(true);
    try {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv',
        'text/plain',
        'text/markdown'
      ];

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const isValidType = allowedTypes.includes(file.type) || 
                         ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'md'].includes(fileExt || '');

      if (!isValidType) {
        toast.error(`Unsupported file type. Please upload PDF, Word, Excel, CSV, or text files.`);
        return null;
      }

      // Validate file size (20MB max)
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (file.size > maxSize) {
        toast.error('File size exceeds 20MB limit');
        return null;
      }

      // Upload to storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chatbot-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload file');
        return null;
      }

      // Save attachment metadata
      const { data: attachment, error: attachmentError } = await supabase
        .from('chatbot_attachments')
        .insert({
          user_id: user.id,
          conversation_id: conversationId || null,
          file_name: file.name,
          file_type: file.type || fileExt || 'application/octet-stream',
          file_size: file.size,
          storage_path: uploadData.path
        })
        .select()
        .single();

      if (attachmentError) {
        console.error('Attachment error:', attachmentError);
        toast.error('Failed to save file metadata');
        return null;
      }

      toast.success('File uploaded successfully. Analyzing...');

      // Parse document
      setIsAnalyzing(true);
      const { data: parseData, error: parseError } = await supabase.functions.invoke('document-parser', {
        body: {
          file_path: uploadData.path,
          user_id: user.id,
          conversation_id: conversationId
        }
      });

      if (parseError || !parseData?.success) {
        console.error('Parse error:', parseError);
        toast.error('Failed to analyze document. File uploaded but not analyzed.');
        setIsAnalyzing(false);
        return attachment as DocumentAnalysis;
      }

      // Update attachment with parsed data
      const { data: updatedAttachment, error: updateError } = await supabase
        .from('chatbot_attachments')
        .update({
          extracted_text: parseData.document.text,
          ai_analysis: {
            metadata: parseData.document.metadata,
            tables: parseData.document.tables
          }
        })
        .eq('id', attachment.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
      }

      toast.success(`Document analyzed: ${parseData.document.word_count} words extracted`);
      setIsAnalyzing(false);

      const finalDocument = (updatedAttachment || attachment) as DocumentAnalysis;
      setDocuments(prev => [...prev, finalDocument]);
      return finalDocument;

    } catch (error) {
      console.error('Document upload error:', error);
      toast.error('Failed to upload document');
      setIsUploading(false);
      setIsAnalyzing(false);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [user, conversationId]);

  // Fetch documents for conversation
  const fetchDocuments = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('chatbot_attachments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments((data as DocumentAnalysis[]) || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, [user, conversationId]);

  // Delete document
  const deleteDocument = useCallback(async (documentId: string, storagePath: string) => {
    if (!user) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('chatbot-attachments')
        .remove([storagePath]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('chatbot_attachments')
        .delete()
        .eq('id', documentId)
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      // Remove from knowledge_chunks
      await supabase
        .from('knowledge_chunks')
        .delete()
        .eq('source', 'user_document')
        .like('source_id', `%${storagePath}%`);

      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      toast.success('Document deleted');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  }, [user]);

  return {
    documents,
    isUploading,
    isAnalyzing,
    uploadDocument,
    fetchDocuments,
    deleteDocument
  };
};

