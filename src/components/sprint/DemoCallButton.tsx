import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Video, Calendar } from 'lucide-react';
import { Sprint } from '@/hooks/useSprints';
import DemoCallScheduler from '@/components/demo/DemoCallScheduler';

interface DemoCallButtonProps {
  sprint: Sprint;
  disabled?: boolean;
}

const DemoCallButton: React.FC<DemoCallButtonProps> = ({ sprint, disabled = false }) => {
  const [open, setOpen] = useState(false);

  const handleScheduled = () => {
    setOpen(false);
  };

  // Only show for completed or in-progress sprints
  if (sprint.status === 'planning' || sprint.status === 'paused') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <Video className="w-4 h-4" />
          Schedule Demo
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Demo for "{sprint.title}"
          </DialogTitle>
        </DialogHeader>
        
        <DemoCallScheduler
          sprintId={sprint.id}
          onScheduled={handleScheduled}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default DemoCallButton;