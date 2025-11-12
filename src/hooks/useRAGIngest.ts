import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DocumentPayload {
  source: string;
  sourceId?: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

interface IngestRequest {
  documents: DocumentPayload[];
  chunkSize?: number;
  chunkOverlap?: number;
}

interface IngestResponse {
  ingested: number;
  documents: number;
}

export const useRAGIngest = () => {
  return useMutation({
    mutationFn: async (request: IngestRequest): Promise<IngestResponse> => {
      const { data, error } = await supabase.functions.invoke('rag-ingest', {
        body: request,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully ingested ${data.ingested} chunks from ${data.documents} document(s)`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to ingest documents: ${error.message}`);
      console.error('RAG ingest error:', error);
    },
  });
};
