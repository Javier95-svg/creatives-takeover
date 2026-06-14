import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Sprint {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'completed' | 'paused';
  is_public: boolean;
  community_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface SprintTask {
  id: string;
  sprint_id: string;
  title: string;
  description?: string;
  estimated_hours: number;
  actual_hours?: number;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SprintComment {
  id: string;
  sprint_id: string;
  user_id: string;
  content: string;
  comment_type: 'general' | 'nudge' | 'celebration' | 'feedback';
  created_at: string;
  author_name?: string;
  author_avatar?: string;
}

export const useSprints = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [currentSprint, setCurrentSprint] = useState<Sprint | null>(null);
  const [sprintTasks, setSprintTasks] = useState<SprintTask[]>([]);
  const [sprintComments, setSprintComments] = useState<SprintComment[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch user's sprints
  const fetchSprints = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSprints((data || []) as Sprint[]);
    } catch (error) {
      console.error('Error fetching sprints:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load your sprints";
      toast({
        title: "Error",
        description: errorMessage.includes('fetch') || errorMessage.includes('network')
          ? "Network error. Please check your connection and try again."
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch sprint tasks
  const fetchSprintTasks = async (sprintId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sprint_tasks')
        .select('*')
        .eq('sprint_id', sprintId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setSprintTasks((data || []) as SprintTask[]);
    } catch (error) {
      console.error('Error fetching sprint tasks:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load sprint tasks";
      toast({
        title: "Error",
        description: errorMessage.includes('fetch') || errorMessage.includes('network') 
          ? "Network error. Please check your connection and try again."
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch sprint comments with author info
  const fetchSprintComments = async (sprintId: string) => {
    try {
      const { data: commentsData, error } = await supabase
        .from('sprint_comments')
        .select('*')
        .eq('sprint_id', sprintId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Fetch author info separately
      const commentsWithAuthor: SprintComment[] = [];
      
      for (const comment of commentsData || []) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', comment.user_id)
          .single();
        
        commentsWithAuthor.push({
          ...comment,
          comment_type: comment.comment_type as SprintComment['comment_type'],
          author_name: profileData?.full_name || 'Anonymous',
          author_avatar: profileData?.avatar_url || undefined
        });
      }
      
      setSprintComments(commentsWithAuthor);
    } catch (error) {
      console.error('Error fetching sprint comments:', error);
    }
  };

  // Create a new sprint
  const createSprint = async (sprintData: Omit<Sprint, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create a sprint",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('sprints')
        .insert({
          ...sprintData,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setSprints(prev => [data as Sprint, ...prev]);
      toast({
        title: "Success",
        description: "Sprint created successfully!",
      });
      
      return data as Sprint;
    } catch (error) {
      console.error('Error creating sprint:', error);
      toast({
        title: "Error",
        description: "Failed to create sprint",
        variant: "destructive",
      });
      return null;
    }
  };

  // Create sprint tasks in batch
  const createSprintTasks = async (sprintId: string, tasks: Omit<SprintTask, 'id' | 'sprint_id' | 'created_at' | 'updated_at'>[]) => {
    try {
      const tasksToInsert = tasks.map(task => ({
        ...task,
        sprint_id: sprintId,
      }));

      const { data, error } = await supabase
        .from('sprint_tasks')
        .insert(tasksToInsert)
        .select();
      
      if (error) throw error;
      
      setSprintTasks(prev => [...prev, ...(data || []) as SprintTask[]]);
      return data as SprintTask[];
    } catch (error) {
      console.error('Error creating sprint tasks:', error);
      toast({
        title: "Error",
        description: "Failed to create sprint tasks",
        variant: "destructive",
      });
      return null;
    }
  };

  // Update task status
  const updateTaskStatus = async (taskId: string, status: SprintTask['status'], actualHours?: number) => {
    try {
      const updateData: any = { status };
      if (status === 'done') {
        updateData.completed_at = new Date().toISOString();
      }
      if (actualHours !== undefined) {
        updateData.actual_hours = actualHours;
      }

      const { data, error } = await supabase
        .from('sprint_tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      
      setSprintTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...(data as SprintTask) } : task
      ));
      
      toast({
        title: "Task Updated",
        description: "Task status updated successfully",
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  // Add comment to sprint
  const addSprintComment = async (sprintId: string, content: string, commentType: SprintComment['comment_type'] = 'general') => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sprint_comments')
        .insert({
          sprint_id: sprintId,
          user_id: user.id,
          content,
          comment_type: commentType,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Fetch the author info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      
      const enrichedComment: SprintComment = {
        ...data,
        comment_type: data.comment_type as SprintComment['comment_type'],
        author_name: profileData?.full_name || 'Anonymous',
        author_avatar: profileData?.avatar_url || undefined
      };
      
      setSprintComments(prev => [...prev, enrichedComment]);
      
      toast({
        title: "Comment Added",
        description: commentType === 'nudge' ? "Accountability nudge sent!" : "Comment added successfully",
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  // Update sprint status
  const updateSprintStatus = async (sprintId: string, status: Sprint['status']) => {
    try {
      const { data, error } = await supabase
        .from('sprints')
        .update({ status })
        .eq('id', sprintId)
        .select()
        .single();
      
      if (error) throw error;
      
      setSprints(prev => prev.map(sprint => 
        sprint.id === sprintId ? { ...sprint, status } : sprint
      ));
      
      if (currentSprint && currentSprint.id === sprintId) {
        setCurrentSprint(prev => prev ? { ...prev, status } : null);
      }
      
      toast({
        title: "Sprint Updated",
        description: `Sprint status changed to ${status}`,
      });
    } catch (error) {
      console.error('Error updating sprint status:', error);
      toast({
        title: "Error",
        description: "Failed to update sprint status",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      void fetchSprints();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    sprints,
    currentSprint,
    setCurrentSprint,
    sprintTasks,
    sprintComments,
    loading,
    fetchSprints,
    fetchSprintTasks,
    fetchSprintComments,
    createSprint,
    createSprintTasks,
    updateTaskStatus,
    addSprintComment,
    updateSprintStatus,
  };
};