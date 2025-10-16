import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Project, ProjectMessage, ProjectArtifact } from './useProjects';

export const useProjectWorkspace = (projectId: string) => {
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [artifacts, setArtifacts] = useState<ProjectArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    
    const fetchProjectData = async () => {
      try {
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;
        setProject(projectData as Project);

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('project_messages')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;
        setMessages((messagesData || []) as ProjectMessage[]);

        // Fetch artifacts
        const { data: artifactsData, error: artifactsError } = await supabase
          .from('project_artifacts')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (artifactsError) throw artifactsError;
        setArtifacts((artifactsData || []) as ProjectArtifact[]);
      } catch (error: any) {
        console.error('Error fetching project data:', error);
        toast.error('Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);

  const sendMessage = async (content: string) => {
    if (!projectId) return;

    setStreaming(true);
    
    try {
      // Add user message
      const { data: userMessage, error: messageError } = await supabase
        .from('project_messages')
        .insert({
          project_id: projectId,
          role: 'user',
          content: { text: content },
        })
        .select()
        .single();

      if (messageError) throw messageError;
      setMessages(prev => [...prev, userMessage as ProjectMessage]);

      // Stream AI response
      const response = await supabase.functions.invoke('bizmap-cofounder-chat', {
        body: {
          projectId,
          message: content,
          conversationHistory: messages,
        },
      });

      if (response.error) throw response.error;

      const assistantMessage = response.data?.message;
      const newArtifacts = response.data?.artifacts || [];

      // Add assistant message
      if (assistantMessage) {
        const { data: aiMessage, error: aiError } = await supabase
          .from('project_messages')
          .insert({
            project_id: projectId,
            role: 'assistant',
            content: assistantMessage,
            tokens_used: response.data?.tokensUsed || 0,
          })
          .select()
          .single();

        if (!aiError) {
          setMessages(prev => [...prev, aiMessage as ProjectMessage]);
        }
      }

      // Update artifacts
      if (newArtifacts.length > 0) {
        for (const artifact of newArtifacts) {
          const { data: newArtifact, error: artifactError } = await supabase
            .from('project_artifacts')
            .upsert({
              project_id: projectId,
              type: artifact.type,
              data: artifact.data,
            })
            .select()
            .single();

          if (!artifactError && newArtifact) {
            setArtifacts(prev => {
              const filtered = prev.filter(a => a.type !== artifact.type);
              return [newArtifact as ProjectArtifact, ...filtered];
            });
          }
        }
      }

      // Update last_run_at
      await supabase
        .from('projects')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', projectId);

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setStreaming(false);
    }
  };

  return {
    project,
    messages,
    artifacts,
    loading,
    streaming,
    sendMessage,
  };
};
