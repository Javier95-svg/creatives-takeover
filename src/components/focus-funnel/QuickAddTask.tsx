import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface QuickAddTaskProps {
  onAdd: (title: string) => void | Promise<void>;
  onCancel: () => void;
}

export function QuickAddTask({ onAdd, onCancel }: QuickAddTaskProps) {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAdd(trimmed);
      setTitle('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-background/70 p-3">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a quick task"
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void handleSubmit();
          }
        }}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={handleSubmit}
          disabled={!title.trim() || isSubmitting}
        >
          Add
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
