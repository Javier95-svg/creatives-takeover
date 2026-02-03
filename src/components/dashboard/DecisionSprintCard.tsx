import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DecisionSprintCard = () => {
  return (
    <Card className="border-border/70 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Decision Sprint</CardTitle>
            <p className="text-xs text-muted-foreground">Score and pick your best idea</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Compare up to 3 ideas, rate the signals, and lock in the next build.
        </p>
        <Button size="sm" className="w-full" asChild>
          <Link to="/decision-sprint">Open Decision Sprint</Link>
        </Button>
      </CardContent>
    </Card>
  );
};
