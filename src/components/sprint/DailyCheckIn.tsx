import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, Camera, TrendingUp, Zap, MessageSquare, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface DailyCheckInProps {
  sprintId: string;
  sprintTitle: string;
  onCheckInComplete?: () => void;
}

interface CheckInData {
  progress_summary: string;
  completed_tasks: string[];
  blockers: string;
  mood_rating: number;
  energy_level: number;
  photo_url?: string;
}

interface DailyCheckInRecord {
  id: string;
  check_in_date: string;
  progress_summary: string;
  completed_tasks: string[];
  blockers: string;
  mood_rating: number;
  energy_level: number;
  streak_count: number;
  photo_url?: string;
  created_at: string;
}

const MOOD_EMOJIS = ['😫', '😔', '😐', '😊', '🚀'];
const ENERGY_EMOJIS = ['🔋', '🔋', '⚡', '⚡⚡', '🔥'];

export const DailyCheckIn: React.FC<DailyCheckInProps> = ({ 
  sprintId, 
  sprintTitle, 
  onCheckInComplete 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayCheckIn, setTodayCheckIn] = useState<DailyCheckInRecord | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<DailyCheckInRecord[]>([]);
  const [formData, setFormData] = useState<CheckInData>({
    progress_summary: '',
    completed_tasks: [],
    blockers: '',
    mood_rating: 3,
    energy_level: 3,
  });
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch today's check-in and recent check-ins
  useEffect(() => {
    if (user && sprintId) {
      fetchCheckIns();
    }
  }, [user, sprintId]);

  const fetchCheckIns = async () => {
    if (!user) return;

    try {
      // Check if user already checked in today
      const today = new Date().toISOString().split('T')[0];
      const { data: todayData } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('sprint_id', sprintId)
        .eq('check_in_date', today)
        .maybeSingle();

      setTodayCheckIn(todayData);

      // Fetch recent check-ins for streak display
      const { data: recentData } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('sprint_id', sprintId)
        .order('check_in_date', { ascending: false })
        .limit(7);

      setRecentCheckIns(recentData || []);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
    }
  };

  const handleSubmit = async () => {
    if (!user || !formData.progress_summary.trim()) {
      toast({
        title: "Missing Information",
        description: "Please add a progress summary",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate streak count
      const streakCount = calculateStreak(recentCheckIns) + 1;

      const checkInData = {
        user_id: user.id,
        sprint_id: sprintId,
        check_in_date: today,
        progress_summary: formData.progress_summary,
        completed_tasks: formData.completed_tasks,
        blockers: formData.blockers || null,
        mood_rating: formData.mood_rating,
        energy_level: formData.energy_level,
        streak_count: streakCount,
        photo_url: formData.photo_url || null,
      };

      const { error } = await supabase
        .from('daily_check_ins')
        .insert(checkInData);

      if (error) throw error;

      // Update sprint accountability last_checkin_at
      await supabase
        .from('sprint_accountability')
        .upsert({
          user_id: user.id,
          sprint_id: sprintId,
          last_checkin_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,sprint_id'
        });

      toast({
        title: "Check-in Complete! 🎉",
        description: `Day ${streakCount} of your accountability streak!`,
      });

      setIsOpen(false);
      fetchCheckIns();
      onCheckInComplete?.();
    } catch (error) {
      console.error('Error submitting check-in:', error);
      toast({
        title: "Error",
        description: "Failed to submit check-in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateStreak = (checkIns: DailyCheckInRecord[]): number => {
    if (checkIns.length === 0) return 0;
    
    const sortedCheckIns = [...checkIns].sort((a, b) => 
      new Date(b.check_in_date).getTime() - new Date(a.check_in_date).getTime()
    );
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 1); // Start from yesterday
    
    for (const checkIn of sortedCheckIns) {
      const checkInDate = new Date(checkIn.check_in_date);
      const expectedDate = new Date(currentDate.toISOString().split('T')[0]);
      
      if (checkInDate.getTime() === expectedDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  const addTask = () => {
    const taskInput = (document.getElementById('new-task') as HTMLInputElement);
    if (taskInput && taskInput.value.trim()) {
      setFormData(prev => ({
        ...prev,
        completed_tasks: [...prev.completed_tasks, taskInput.value.trim()]
      }));
      taskInput.value = '';
    }
  };

  const removeTask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      completed_tasks: prev.completed_tasks.filter((_, i) => i !== index)
    }));
  };

  const currentStreak = calculateStreak(recentCheckIns);
  const hasCheckedInToday = !!todayCheckIn;

  return (
    <div className="space-y-4">
      {/* Streak Display */}
      {recentCheckIns.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">
                  {currentStreak} day streak
                </span>
              </div>
              <div className="flex space-x-1">
                {[...Array(7)].map((_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (6 - i));
                  const dateStr = date.toISOString().split('T')[0];
                  const hasCheckIn = recentCheckIns.some(c => c.check_in_date === dateStr);
                  
                  return (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        hasCheckIn ? 'bg-primary' : 'bg-muted'
                      }`}
                      title={dateStr}
                    />
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check-in Button/Status */}
      {hasCheckedInToday ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-success" />
                <span className="text-sm font-medium">Checked in today!</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{MOOD_EMOJIS[todayCheckIn.mood_rating - 1]}</span>
                <span className="text-2xl">{ENERGY_EMOJIS[todayCheckIn.energy_level - 1]}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {todayCheckIn.progress_summary}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" size="lg">
              <MessageSquare className="w-4 h-4 mr-2" />
              Daily Check-in
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Daily Check-in: {sprintTitle}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Progress Summary */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  What did you accomplish today? *
                </label>
                <Textarea
                  placeholder="Share your wins, progress, and what you worked on..."
                  value={formData.progress_summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, progress_summary: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>

              {/* Completed Tasks */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Completed Tasks
                </label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      id="new-task"
                      type="text"
                      placeholder="Add a completed task..."
                      className="flex-1 px-3 py-2 border rounded-md"
                      onKeyPress={(e) => e.key === 'Enter' && addTask()}
                    />
                    <Button onClick={addTask} size="sm">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.completed_tasks.map((task, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeTask(index)}
                      >
                        {task} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Blockers */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Any blockers or challenges?
                </label>
                <Textarea
                  placeholder="What's slowing you down or blocking progress?"
                  value={formData.blockers}
                  onChange={(e) => setFormData(prev => ({ ...prev, blockers: e.target.value }))}
                />
              </div>

              {/* Mood & Energy */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Mood</label>
                  <div className="flex space-x-2">
                    {MOOD_EMOJIS.map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`text-2xl p-2 rounded-lg border-2 ${
                          formData.mood_rating === index + 1
                            ? 'border-primary bg-primary/10'
                            : 'border-muted hover:border-primary/50'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, mood_rating: index + 1 }))}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Energy</label>
                  <div className="flex space-x-2">
                    {ENERGY_EMOJIS.map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`text-2xl p-2 rounded-lg border-2 ${
                          formData.energy_level === index + 1
                            ? 'border-primary bg-primary/10'
                            : 'border-muted hover:border-primary/50'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, energy_level: index + 1 }))}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.progress_summary.trim()}
                  className="flex-1"
                >
                  {isSubmitting ? 'Submitting...' : 'Complete Check-in'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};