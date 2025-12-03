import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mail, CheckCircle2, Loader2, Settings } from 'lucide-react';
import { useGmailIntegration } from '@/hooks/useGmailIntegration';

export const GmailIntegration = () => {
  const { connection, loading, connecting, connectGmail, disconnectGmail, enableTaskReminders } = useGmailIntegration();

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="text-base">Gmail Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!connection) {
    return (
      <Card className="backdrop-blur-sm bg-card/95 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-5 w-5 text-primary" />
            Gmail Integration
          </CardTitle>
          <CardDescription>
            Connect your Gmail to receive automated task deadline reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Get email reminders for tasks before their deadlines. Never miss an important task again!
              </p>
            </div>
            <Button
              onClick={connectGmail}
              disabled={connecting}
              className="w-full"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Connect Gmail
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-5 w-5 text-primary" />
              Gmail Integration
            </CardTitle>
            <CardDescription className="mt-1">
              Connected to {connection.email}
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="task-reminders" className="text-sm font-medium">
                Task Deadline Reminders
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive email reminders 24 hours before task deadlines
              </p>
            </div>
            <Switch
              id="task-reminders"
              checked={connection.task_reminders_enabled || false}
              onCheckedChange={enableTaskReminders}
            />
          </div>

          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={disconnectGmail}
              className="w-full"
            >
              Disconnect Gmail
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

