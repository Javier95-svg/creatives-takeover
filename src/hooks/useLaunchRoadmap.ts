import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCredits } from '@/hooks/useCredits';
import { CREDIT_COSTS } from '@/config/constants';
import type { LaunchRoadmap, RoadmapTask, WeekMilestone } from '@/types/founderOS';

export const useLaunchRoadmap = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasCredits } = useCredits();
  const [roadmap, setRoadmap] = useState<LaunchRoadmap | null>(null);
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active roadmap
  const fetchRoadmap = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data: roadmapData, error: roadmapError } = await supabase
        .from('launch_roadmaps')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (roadmapError) throw roadmapError;
      
      if (roadmapData) {
        setRoadmap(roadmapData as LaunchRoadmap);
        
        // Fetch tasks for this roadmap
        const { data: tasksData, error: tasksError } = await supabase
          .from('roadmap_tasks')
          .select('*')
          .eq('roadmap_id', roadmapData.id)
          .order('day_number', { ascending: true });
        
        if (tasksError) throw tasksError;
        setTasks((tasksData as RoadmapTask[]) || []);
      }
    } catch (err) {
      console.error('Error fetching roadmap:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch roadmap');
    } finally {
      setLoading(false);
    }
  };

  // Create new roadmap
  const createRoadmap = async (
    sessionId: string, 
    businessIdea: string, 
    industry: string,
    wizardAnswers?: Record<string, string>
  ) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create a roadmap",
        variant: "destructive",
      });
      return null;
    }

    // Check credits before proceeding
    const requiredCredits = CREDIT_COSTS.ROADMAP_GENERATION;
    if (!hasCredits(requiredCredits)) {
      toast({
        title: "Insufficient Credits",
        description: `Roadmap generation requires ${requiredCredits} credits. Please upgrade your plan to get more credits.`,
        variant: "destructive",
      });
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      // Call edge function to generate roadmap with AI tasks
      const { data, error: functionError } = await supabase.functions.invoke('roadmap-task-generator', {
        body: {
          session_id: sessionId,
          business_idea: businessIdea,
          industry,
          start_date: new Date().toISOString().split('T')[0],
          user_experience_level: 'intermediate',
          wizard_answers: wizardAnswers || null,
        },
      });

      if (functionError) {
        // Handle credit errors specifically
        if (functionError.status === 402 || (functionError.message && functionError.message.includes('credits'))) {
          toast({
            title: "Insufficient Credits",
            description: `Roadmap generation requires ${requiredCredits} credits. Please upgrade your plan to get more credits.`,
            variant: "destructive",
          });
          return null;
        }
        throw functionError;
      }

      if (data?.error) {
        if (data.error.includes('credits') || data.required) {
          toast({
            title: "Insufficient Credits",
            description: `Roadmap generation requires ${data.required || requiredCredits} credits. Please purchase more credits.`,
            variant: "destructive",
          });
          return null;
        }
        throw new Error(data.error);
      }

      if (data?.roadmap) {
        setRoadmap(data.roadmap);
        setTasks(data.tasks || []);
        toast({
          title: "Roadmap Created",
          description: `Your 30-day launch roadmap is ready! (Used ${requiredCredits} credits)`,
        });
        return data.roadmap;
      }

      return null;
    } catch (err) {
      console.error('Error creating roadmap:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create roadmap';
      setError(errorMessage);
      if (!errorMessage.includes('credits')) {
        toast({
          title: "Creation Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update task status
  const updateTaskStatus = async (taskId: string, status: RoadmapTask['status'], actualHours?: number) => {
    try {
      const updateData: Partial<RoadmapTask> = { status };
      
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      
      if (actualHours !== undefined) {
        updateData.actual_hours = actualHours;
      }

      const { data, error: updateError } = await supabase
        .from('roadmap_tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...(data as RoadmapTask) } : task
      ));

      // Update roadmap progress
      if (roadmap) {
        const completedCount = tasks.filter(t => t.id === taskId ? status === 'completed' : t.status === 'completed').length;
        const progressPercentage = (completedCount / roadmap.total_tasks) * 100;

        await supabase
          .from('launch_roadmaps')
          .update({
            completed_tasks: completedCount,
            progress_percentage: progressPercentage,
          })
          .eq('id', roadmap.id);

        setRoadmap(prev => prev ? {
          ...prev,
          completed_tasks: completedCount,
          progress_percentage: progressPercentage,
        } : null);
      }

      toast({
        title: "Task Updated",
        description: status === 'completed' ? "Great work! Task completed." : "Task status updated",
      });
    } catch (err) {
      console.error('Error updating task:', err);
      toast({
        title: "Update Failed",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  // Mark milestone complete
  const completeMilestone = async (milestone: WeekMilestone) => {
    if (!roadmap) return;

    try {
      const milestoneField = {
        validate: 'week1_validated',
        build: 'week2_mvp_built',
        launch: 'week3_launched',
        first_customer: 'week4_first_customer',
      }[milestone];

      const updates: Partial<LaunchRoadmap> = {
        [milestoneField]: true,
      };

      if (milestone === 'first_customer') {
        updates.first_customer_date = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('launch_roadmaps')
        .update(updates)
        .eq('id', roadmap.id);
      
      if (updateError) throw updateError;

      setRoadmap(prev => prev ? { ...prev, ...updates } : null);

      toast({
        title: "Milestone Achieved! 🎉",
        description: `Congratulations on completing ${milestone}!`,
      });
    } catch (err) {
      console.error('Error completing milestone:', err);
      toast({
        title: "Update Failed",
        description: "Failed to mark milestone as complete",
        variant: "destructive",
      });
    }
  };

  // Get tasks for current week
  const getCurrentWeekTasks = (): RoadmapTask[] => {
    if (!roadmap) return [];
    return tasks.filter(task => task.week_number === roadmap.current_week);
  };

  // Get today's tasks
  const getTodaysTasks = (): RoadmapTask[] => {
    if (!roadmap) return [];
    return tasks.filter(task => task.day_number === roadmap.current_day);
  };

  // Get blocked tasks
  const getBlockedTasks = (): RoadmapTask[] => {
    return tasks.filter(task => task.is_blocked);
  };

  useEffect(() => {
    if (user) {
      fetchRoadmap();
    }
  }, [user]);

  return {
    roadmap,
    tasks,
    loading,
    error,
    createRoadmap,
    updateTaskStatus,
    completeMilestone,
    refreshRoadmap: fetchRoadmap,
    getCurrentWeekTasks,
    getTodaysTasks,
    getBlockedTasks,
  };
};
