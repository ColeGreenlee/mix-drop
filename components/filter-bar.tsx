"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Filter } from "lucide-react";

interface FilterUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface FilterBarProps {
  uploaders: FilterUser[];
  onRemoveUploader: (id: string) => void;
  onClearAll: () => void;
}

export function FilterBar({ uploaders, onRemoveUploader, onClearAll }: FilterBarProps) {
  if (uploaders.length === 0) {
    return null;
  }

  return (
    <div className="bg-muted/50 border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground">Filtered by:</span>
          {uploaders.map((uploader) => (
            <Badge
              key={uploader.id}
              variant="secondary"
              className="gap-1 pr-1 cursor-pointer hover:bg-secondary/80"
            >
              <span>{uploader.name || uploader.email}</span>
              <button
                onClick={() => onRemoveUploader(uploader.id)}
                className="hover:bg-background/50 rounded-full p-0.5"
                aria-label={`Remove ${uploader.name || uploader.email} filter`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="flex-shrink-0"
        >
          Clear all
        </Button>
      </div>
    </div>
  );
}
