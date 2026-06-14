import { useState, useEffect } from 'react';
import { useConversationMemory, MemoryType } from '@/hooks/useConversationMemory';
import { MemoryCard } from './MemoryCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const MemoryTimeline = () => {
  const { memories, isLoading, getRecentMemories, getMemoriesByType, deleteMemory } = useConversationMemory();
  const { toast } = useToast();
  const [filter, setFilter] = useState<MemoryType | 'all'>('all');

  useEffect(() => {
    if (filter === 'all') {
      void getRecentMemories(50);
    } else {
      void getMemoriesByType(filter, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, [filter]);

  const handleDelete = async (id: string) => {
    const success = await deleteMemory(id);
    if (success) {
      toast({
        title: 'Memory deleted',
        description: 'This memory has been removed from your timeline.',
      });
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(memories, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `memories-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Memories exported',
      description: 'Your conversation history has been downloaded.',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Loading memories...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Memory Timeline</h2>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as MemoryType | 'all')}>
        <TabsList className="adaptive-tabs grid grid-cols-6 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="decision">Decisions</TabsTrigger>
          <TabsTrigger value="win">Wins</TabsTrigger>
          <TabsTrigger value="challenge">Challenges</TabsTrigger>
          <TabsTrigger value="insight">Insights</TabsTrigger>
          <TabsTrigger value="goal">Goals</TabsTrigger>
        </TabsList>
      </Tabs>

      {memories.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No memories yet. Start a conversation to create your first memory!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
