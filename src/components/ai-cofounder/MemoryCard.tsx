import { ConversationMemory } from '@/hooks/useConversationMemory';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MemoryCardProps {
  memory: ConversationMemory;
  onEdit?: (memory: ConversationMemory) => void;
  onDelete?: (id: string) => void;
}

const MEMORY_TYPE_CONFIG = {
  decision: { icon: '🎯', label: 'Decision', color: 'bg-blue-500/10 text-blue-700' },
  win: { icon: '🏆', label: 'Win', color: 'bg-green-500/10 text-green-700' },
  challenge: { icon: '⚠️', label: 'Challenge', color: 'bg-orange-500/10 text-orange-700' },
  insight: { icon: '💡', label: 'Insight', color: 'bg-purple-500/10 text-purple-700' },
  goal: { icon: '🎯', label: 'Goal', color: 'bg-indigo-500/10 text-indigo-700' },
  feedback: { icon: '💬', label: 'Feedback', color: 'bg-pink-500/10 text-pink-700' }
};

export const MemoryCard = ({ memory, onEdit, onDelete }: MemoryCardProps) => {
  const config = MEMORY_TYPE_CONFIG[memory.memory_type];
  const isImportant = memory.importance_score > 0.7;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl">{config.icon}</span>
            <Badge variant="secondary" className={config.color}>
              {config.label}
            </Badge>
            {isImportant && (
              <Badge variant="outline" className="gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                Important
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(memory.created_at), { addSuffix: true })}
            </span>
          </div>

          <h4 className="font-semibold text-lg">{memory.title}</h4>
          <p className="text-sm text-muted-foreground">{memory.content}</p>

          {memory.tags && memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {memory.tags.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(memory)}
              className="h-8 w-8"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(memory.id)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
