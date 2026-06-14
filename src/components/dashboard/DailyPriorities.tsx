import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Target, Plus, X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Priority {
  id: string;
  priority_text: string;
  is_completed: boolean;
  priority_order: number;
}

export const DailyPriorities = () => {
  const { user } = useAuth();
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [newPriorityText, setNewPriorityText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      void loadTodaysPriorities();
    }
  }, [user]);

  const loadTodaysPriorities = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_priorities')
      .select('*')
      .eq('user_id', user.id)
      .eq('priority_date', today)
      .order('priority_order', { ascending: true });

    if (error) {
      console.error('Error loading priorities:', error);
    } else {
      setPriorities(data || []);
    }
    setLoading(false);
  };

  const addPriority = async () => {
    if (!user || !newPriorityText.trim() || priorities.length >= 3) return;

    const today = new Date().toISOString().split('T')[0];
    const nextOrder = priorities.length + 1;

    const { data, error } = await supabase
      .from('daily_priorities')
      .insert({
        user_id: user.id,
        priority_date: today,
        priority_text: newPriorityText.trim(),
        priority_order: nextOrder,
        is_completed: false
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add priority');
      console.error('Error adding priority:', error);
    } else {
      setPriorities([...priorities, data]);
      setNewPriorityText('');
      setIsAdding(false);
      toast.success('Priority added!');
    }
  };

  const togglePriority = async (priorityId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('daily_priorities')
      .update({ 
        is_completed: !currentStatus,
        completed_at: !currentStatus ? new Date().toISOString() : null
      })
      .eq('id', priorityId);

    if (error) {
      toast.error('Failed to update priority');
      console.error('Error updating priority:', error);
    } else {
      setPriorities(priorities.map(p => 
        p.id === priorityId 
          ? { ...p, is_completed: !currentStatus }
          : p
      ));
      if (!currentStatus) {
        toast.success('Nice work! 🎉');
      }
    }
  };

  const deletePriority = async (priorityId: string) => {
    const { error } = await supabase
      .from('daily_priorities')
      .delete()
      .eq('id', priorityId);

    if (error) {
      toast.error('Failed to delete priority');
      console.error('Error deleting priority:', error);
    } else {
      setPriorities(priorities.filter(p => p.id !== priorityId));
    }
  };

  const completedCount = priorities.filter(p => p.is_completed).length;
  const progressPercentage = priorities.length > 0 ? (completedCount / priorities.length) * 100 : 0;

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95 animate-pulse">
        <CardContent className="p-6">
          <div className="h-8 bg-muted rounded mb-4" />
          <div className="space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Today's Focus</h2>
          </div>
          {priorities.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-primary">{completedCount}/{priorities.length}</span>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {priorities.length > 0 && (
          <div className="mb-4">
            <div className="h-2 bg-secondary/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Priorities List */}
        <div className="space-y-3 mb-4">
          {priorities.length === 0 && !isAdding && (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No priorities set for today</p>
              <p className="text-xs mt-1">Add up to 3 focus items</p>
            </div>
          )}

          {priorities.map((priority) => (
            <div
              key={priority.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors group"
            >
              <Checkbox
                checked={priority.is_completed}
                onCheckedChange={() => togglePriority(priority.id, priority.is_completed)}
                className="h-5 w-5"
              />
              <span 
                className={`flex-1 text-sm ${
                  priority.is_completed 
                    ? 'line-through text-muted-foreground' 
                    : 'text-foreground font-medium'
                }`}
              >
                {priority.priority_text}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deletePriority(priority.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {/* Add New Priority Form */}
          {isAdding && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/30">
              <Input
                value={newPriorityText}
                onChange={(e) => setNewPriorityText(e.target.value)}
                placeholder="What's your focus today?"
                maxLength={100}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void addPriority();
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewPriorityText('');
                  }
                }}
                className="flex-1 border-0 bg-background/50"
              />
              <Button
                size="sm"
                onClick={addPriority}
                disabled={!newPriorityText.trim()}
              >
                Add
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewPriorityText('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Add Priority Button */}
        {!isAdding && priorities.length < 3 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Priority ({priorities.length}/3)
          </Button>
        )}

        {/* Motivational Message */}
        {completedCount === priorities.length && priorities.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-center font-medium text-primary">
              🎉 All priorities completed! You're crushing it today!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};