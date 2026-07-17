import { useEffect, useState } from 'react';
import { HeartHandshake } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { captureEvent } from '@/lib/analytics';
import { fetchValidationOptIn, setValidationOptIn } from '@/lib/pmfValidationMatches';
import { toast } from 'sonner';

export function ValidationNetworkCard() {
  const { user } = useAuth();
  const [optedIn, setOptedIn] = useState(false);
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void fetchValidationOptIn(user.id).then((value) => {
      if (cancelled) return;
      if (value === null) setAvailable(false);
      else setOptedIn(value);
    });
    return () => { cancelled = true; };
  }, [user]);

  if (!user || !available) return null;

  const toggle = async (next: boolean) => {
    setSaving(true);
    setOptedIn(next);
    try {
      await setValidationOptIn(user.id, next);
      captureEvent(next ? 'pmf_validation_network_opt_in' : 'pmf_validation_network_opt_out', { source: 'account_settings' });
      toast.success(next
        ? 'You joined the validation network. Founders in your space can now find you.'
        : 'You left the validation network.');
    } catch (error) {
      console.warn('Failed to update validation network preference:', error);
      setOptedIn(!next);
      toast.error('Could not update your preference. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartHandshake className="w-5 h-5" />
          Validation network
        </CardTitle>
        <CardDescription>
          Let other founders find you for short customer-discovery interviews, and get matched with founders building
          in your space through PMF Lab.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="validation-network-opt-in" className="text-sm leading-relaxed text-muted-foreground">
            Appear in interview matches (uses your public profile: name, startup, industry, and bio)
          </Label>
          <Switch
            id="validation-network-opt-in"
            checked={optedIn}
            disabled={saving}
            onCheckedChange={(next) => void toggle(next)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
