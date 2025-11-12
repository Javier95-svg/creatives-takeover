import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface KnowledgeFilter {
  source?: string;
  tier?: string;
  tag?: string;
}

interface RagChatRequest {
  messages: ChatMessage[];
  userId?: string;
  matchCount?: number;
  filter?: KnowledgeFilter;
  model?: string;
  temperature?: number;
}

interface ContextSource {
  id: string;
  title: string;
  source: string;
  similarity: number;
  metadata: Record<string, unknown>;
  excerpt: string;
}

interface RagChatResponse {
  answer: string;
  sources: ContextSource[];
  usage?: Record<string, unknown>;
  matchCount: number;
}

export const useRAGChat = () => {
  return useMutation({
    mutationFn: async (request: RagChatRequest): Promise<RagChatResponse> => {
      const { data, error } = await supabase.functions.invoke('rag-chat', {
        body: request,
      });

      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      toast.error(`Chat query failed: ${error.message}`);
      console.error('RAG chat error:', error);
    },
  });
};
