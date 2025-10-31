import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useDashboardInitialization = () => {
  const { user } = useAuth();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkAndInitialize = async () => {
      try {
        // Check if user has any KPI goals (indicator of initialization)
        const { data: existingGoal, error } = await supabase
          .from('kpi_goals')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking initialization:', error);
          return;
        }

        if (existingGoal) {
          setIsInitialized(true);
          return;
        }

        // Initialize dashboard with sample data
        setIsInitializing(true);
        const { error: initError } = await supabase.functions.invoke('initialize-dashboard');
        
        if (initError) {
          console.error('Error initializing dashboard:', initError);
        } else {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Dashboard initialization error:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    checkAndInitialize();
  }, [user]);

  return { isInitializing, isInitialized };
};