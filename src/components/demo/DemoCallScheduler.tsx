import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Users, Globe, Lock } from 'lucide-react';
import { useDemoCalls } from '@/hooks/useDemoCalls';
import { useCreditActions } from '@/hooks/useCreditActions';
import { CREDIT_COSTS } from '@/config/constants';

interface DemoCallSchedulerProps {
  sprintId?: string;
  onScheduled?: () => void;
  onCancel?: () => void;
}

const DemoCallScheduler: React.FC<DemoCallSchedulerProps> = ({
  sprintId,
  onScheduled,
  onCancel
}) => {
  const { createCall, loading } = useDemoCalls();
  const { ensureCredits, deductCredits } = useCreditActions();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(30);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const requiredCredits = ensureCredits('PREMIUM_FEATURE', { featureName: 'Demo Call Scheduling' });
    if (requiredCredits === null) return;

    setSubmitting(true);

    try {
      const call = await createCall({
        title,
        description,
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        is_public: isPublic,
        max_participants: maxParticipants,
        sprint_id: sprintId,
        status: 'scheduled'
      });

      if (call) {
        const deducted = await deductCredits('PREMIUM_FEATURE', { featureName: 'Demo Call Scheduling' });
        if (deducted) {
          onScheduled?.();
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = title.trim() && scheduledAt && new Date(scheduledAt) > new Date();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule Demo Call
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Schedule a demo call to showcase your progress and get feedback from the community.
          Cost: {CREDIT_COSTS.PREMIUM_FEATURE} credits
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Demo Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Startup Demo - MVP Launch"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what you'll be demoing..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_at">Date & Time *</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select value={duration.toString()} onValueChange={(value) => setDuration(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_participants">Max Participants</Label>
              <Select value={maxParticipants.toString()} onValueChange={(value) => setMaxParticipants(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 people</SelectItem>
                  <SelectItem value="10">10 people</SelectItem>
                  <SelectItem value="20">20 people</SelectItem>
                  <SelectItem value="50">50 people</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Visibility
              </Label>
              <div className="flex items-center space-x-2 p-3 border rounded-md">
                <Switch
                  id="is_public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <Label htmlFor="is_public" className="flex items-center gap-2">
                  {isPublic ? (
                    <>
                      <Globe className="h-4 w-4" />
                      Public
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Private
                    </>
                  )}
                </Label>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={!isFormValid || submitting || loading}
              className="flex-1"
            >
              <Clock className="w-4 h-4 mr-2" />
              {submitting ? 'Scheduling...' : 'Schedule Demo Call'}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DemoCallScheduler;
