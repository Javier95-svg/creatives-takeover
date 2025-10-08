import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface FileAttachment {
  file: File;
  preview?: string;
  storagePath?: string;
  id?: string;
}

export const useFileUpload = () => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (
    file: File,
    userId: string,
    conversationId: string
  ): Promise<string | null> => {
    try {
      setUploading(true);
      
      // Validate file size (20MB limit)
      if (file.size > 20971520) {
        toast({
          title: "File too large",
          description: "Maximum file size is 20MB",
          variant: "destructive",
        });
        return null;
      }

      const fileName = `${userId}/${conversationId}/${Date.now()}_${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('chatbot-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('chatbot_attachments')
        .insert({
          user_id: userId,
          conversation_id: conversationId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: data.path,
        });

      if (dbError) {
        console.error('Failed to save attachment metadata:', dbError);
      }

      return data.path;
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const extractContent = async (file: File): Promise<string> => {
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      return await file.text();
    }
    if (file.type === 'text/csv') {
      const text = await file.text();
      return `CSV Data:\n${text.substring(0, 2000)}`;
    }
    return '';
  };

  const createThumbnail = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const deleteFile = async (storagePath: string) => {
    try {
      const { error } = await supabase.storage
        .from('chatbot-attachments')
        .remove([storagePath]);

      if (error) throw error;
    } catch (error) {
      console.error('File deletion error:', error);
      toast({
        title: "Deletion failed",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  return {
    uploadFile,
    extractContent,
    createThumbnail,
    deleteFile,
    uploading,
  };
};
