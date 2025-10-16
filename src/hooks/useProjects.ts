import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  idea_summary: string | null;
  status: 'draft' | 'active' | 'archived';
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMessage {
  id: string;
  project_id: string;
  role: 'user' | 'assistant' | 'system';
  content: any;
  tokens_used: number;
  created_at: string;
}

export interface ProjectArtifact {
  id: string;
  project_id: string;
  type: 'overview' | 'market' | 'competitors' | 'financials' | 'pitch_deck' | 'export';
  data: any;
  created_at: string;
  updated_at: string;
}

export const useProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects((data || []) as Project[]);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const createProject = async (title: string, ideaSummary: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title,
          idea_summary: ideaSummary,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      
      setProjects(prev => [data as Project, ...prev]);
      toast.success('Project created successfully!');
      return data as Project;
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
      return null;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setProjects(prev => prev.map(p => p.id === id ? data as Project : p));
      return data as Project;
    } catch (error: any) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
      return null;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success('Project deleted');
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
  };
};
