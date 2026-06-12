import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, GripVertical, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DemoStudioStep } from '@/lib/demoStudio/types';

interface StepThumbnailListProps {
  steps: DemoStudioStep[];
  selectedStepId: string | null;
  uploading: boolean;
  onSelect: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onAddClick: () => void;
}

function SortableStep({
  step,
  index,
  selected,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  step: DemoStudioStep;
  index: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex items-center gap-2 rounded-lg border p-2',
        selected ? 'border-primary bg-primary/5' : 'border-border bg-card',
        isDragging && 'opacity-60',
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onSelect(step.id)}
        className="flex flex-1 items-center gap-2 overflow-hidden text-left"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-label font-medium">
          {index + 1}
        </span>
        {step.asset_url ? (
          <img src={step.asset_url} alt={`Step ${index + 1}`} className="h-10 w-16 rounded object-cover" />
        ) : (
          <span className="flex h-10 w-16 items-center justify-center rounded bg-muted text-caption text-muted-foreground">
            Needs image
          </span>
        )}
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {step.title || `Step ${index + 1}`}
        </span>
      </button>
      {onDuplicate && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground opacity-0 transition group-hover:opacity-100"
          onClick={() => onDuplicate(step.id)}
          aria-label="Duplicate step"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
        onClick={() => onDelete(step.id)}
        aria-label="Delete step"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function StepThumbnailList({
  steps,
  selectedStepId,
  uploading,
  onSelect,
  onReorder,
  onDelete,
  onDuplicate,
  onAddClick,
}: StepThumbnailListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(steps, oldIndex, newIndex).map((s) => s.id));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Steps</h4>
        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={onAddClick} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
        </Button>
      </div>

      {steps.length === 0 ? (
        <p className="rounded-lg border border-dashed border-muted-foreground/30 p-3 text-xs text-muted-foreground">
          Upload screenshots to build your walkthrough. Each image becomes a step.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <SortableStep
                  key={step.id}
                  step={step}
                  index={index}
                  selected={step.id === selectedStepId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
