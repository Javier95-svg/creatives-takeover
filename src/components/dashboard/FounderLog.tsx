import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

interface LogEntry {
  id: string;
  week_start: string;
  notes: string;
  created_at: string;
}

export const FounderLog = () => {
  const { user } = useAuth();
  const [currentWeekEntry, setCurrentWeekEntry] = useState<LogEntry | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadCurrentWeekEntry();
    }
  }, [user]);

  const loadCurrentWeekEntry = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');

      // Check if entry exists for this week
      // Note: In a real implementation, you'd have a founder_log table
      // For now, we'll use localStorage
      const saved = localStorage.getItem(`founder_log_${user.id}_${weekStartStr}`);
      
      if (saved) {
        const entry = JSON.parse(saved);
        setCurrentWeekEntry(entry);
        setNotes(entry.notes || '');
      } else {
        setCurrentWeekEntry({
          id: `new-${weekStartStr}`,
          week_start: weekStartStr,
          notes: '',
          created_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error loading log entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = async () => {
    if (!user || !currentWeekEntry) return;

    setIsSaving(true);
    try {
      const entry = {
        ...currentWeekEntry,
        notes,
        updated_at: new Date().toISOString()
      };

      // Save to localStorage (in real app, save to database)
      localStorage.setItem(`founder_log_${user.id}_${currentWeekEntry.week_start}`, JSON.stringify(entry));
      
      setCurrentWeekEntry(entry);
    } catch (error) {
      console.error('Error saving entry:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getWeekRange = () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="text-base">Founder Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-32 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle className="text-base">Founder Log</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">What happened this week?</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Week of {getWeekRange()}
              </span>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>

          <Textarea
            placeholder="What did you accomplish this week? What challenges did you face? What did you learn? This helps you see your progress over time..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[120px] resize-none"
            onBlur={saveEntry}
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Simple journal to look back on progress</span>
            <Button
              size="sm"
              variant="outline"
              onClick={saveEntry}
              disabled={isSaving}
              className="h-7"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>

          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              💡 Tip: Regular logging helps you see your trajectory, especially important for pre-seed motivation. 
              Review past weeks to see how far you've come!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

