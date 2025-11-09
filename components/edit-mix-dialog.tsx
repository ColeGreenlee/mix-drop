"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

interface Mix {
  id: string;
  title: string;
  artist: string;
  description: string | null;
  isPublic: boolean;
}

interface EditMixDialogProps {
  mix: Mix;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditMixDialog({
  mix,
  open,
  onOpenChange,
  onSuccess,
}: EditMixDialogProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      artist: formData.get("artist") as string,
      description: formData.get("description") as string,
      isPublic: formData.get("isPublic") === "on",
    };

    try {
      const response = await fetch(`/api/mixes/${mix.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update mix");
      }

      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update mix");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Mix</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              name="title"
              defaultValue={mix.title}
              required
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-artist">DJ / Artist *</Label>
            <Input
              id="edit-artist"
              name="artist"
              defaultValue={mix.artist}
              required
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              name="description"
              defaultValue={mix.description || ""}
              rows={4}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-isPublic">Visibility</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="edit-isPublic" className="text-sm text-muted-foreground font-normal cursor-pointer">
                  Private
                </Label>
                <Switch
                  id="edit-isPublic"
                  name="isPublic"
                  defaultChecked={mix.isPublic}
                  disabled={saving}
                />
                <Label htmlFor="edit-isPublic" className="text-sm text-muted-foreground font-normal cursor-pointer">
                  Public
                </Label>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
