"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X, GripVertical } from "lucide-react";
import { useAudioPlayer } from "./audio-player-context";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface QueueItemProps {
  mix: { id: string; title: string; artist: string };
  onRemove: () => void;
}

function QueueItem({ mix, onRemove }: QueueItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mix.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card rounded-lg border group"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-sm">{mix.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {mix.artist}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0"
        onClick={onRemove}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function QueueDrawer() {
  const { queue, isQueueOpen, toggleQueue, removeFromQueue, clearQueue, reorderQueue } =
    useAudioPlayer();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = queue.findIndex((m) => m.id === active.id);
      const newIndex = queue.findIndex((m) => m.id === over.id);
      reorderQueue(oldIndex, newIndex);
    }
  }

  return (
    <Sheet open={isQueueOpen} onOpenChange={toggleQueue}>
      <SheetContent
        side="bottom"
        className="h-[calc(100vh-120px)] sm:h-[calc(100vh-110px)] pb-0"
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <SheetTitle className="flex-1">Queue ({queue.length})</SheetTitle>
            {queue.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearQueue}
                className="flex-shrink-0"
              >
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-y-auto space-y-2" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            {queue.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Queue is empty</p>
                <p className="text-sm mt-2">Add mixes to play them in order</p>
              </div>
            ) : (
              <SortableContext
                items={queue.map((m) => m.id)}
                strategy={verticalListSortingStrategy}
              >
                {queue.map((mix, index) => (
                  <QueueItem
                    key={mix.id}
                    mix={mix}
                    onRemove={() => removeFromQueue(index)}
                  />
                ))}
              </SortableContext>
            )}
          </div>
        </DndContext>

        <div className="mt-4 pb-4 text-xs text-muted-foreground text-center">
          Tip: Tracks will play in order when the current mix ends
        </div>
      </SheetContent>
    </Sheet>
  );
}
