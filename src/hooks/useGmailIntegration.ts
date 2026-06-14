import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GmailConnection {
  id: string;
  user_id: string;
  email: string;
  is_active: boolean;
  task_reminders_enabled?: boolean;
  connected_at: string;
  last_sync_at: string | null;
}

export const useGmailIntegration = () => {
  const { user } = useAuth();
  const [connection, setConnection] = useState<GmailConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (user) {
      void loadConnection();
    }
  }, [user]);

  const loadConnection = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gmail_connections' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setConnection(data as unknown as GmailConnection | null);
    } catch (error) {
      console.error('Error loading Gmail connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectGmail = async () => {
    if (!user) {
      toast.error('Please sign in to connect Gmail');
      return;
    }

    setConnecting(true);
    try {
      // Initiate OAuth flow
      const { data, error } = await supabase.functions.invoke('gmail-oauth-init', {
        body: { user_id: user.id }
      });

      if (error) throw error;

      // Redirect to Gmail OAuth
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to get OAuth URL');
      }
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      toast.error('Failed to connect Gmail. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectGmail = async () => {
    if (!user || !connection) return;

    try {
      const { error } = await supabase
        .from('gmail_connections' as any)
        .update({ is_active: false })
        .eq('id', connection.id);

      if (error) throw error;

      setConnection(null);
      toast.success('Gmail disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      toast.error('Failed to disconnect Gmail');
    }
  };

  const enableTaskReminders = async (enabled: boolean) => {
    if (!user || !connection) return;

    try {
      const { error } = await supabase
        .from('gmail_connections' as any)
        .update({ 
          task_reminders_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id);

      if (error) throw error;

      setConnection(prev => prev ? { ...prev, task_reminders_enabled: enabled } : null);
      toast.success(enabled ? 'Task reminders enabled' : 'Task reminders disabled');
    } catch (error) {
      console.error('Error updating reminder settings:', error);
      toast.error('Failed to update reminder settings');
    }
  };

  return {
    connection,
    loading,
    connecting,
    connectGmail,
    disconnectGmail,
    enableTaskReminders,
    refreshConnection: loadConnection
  };
};
