"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Check } from "lucide-react";
import { CreatePlaylistDialog } from "./create-playlist-dialog";

interface Playlist {
  id: string;
  name: string;
  _count: { mixes: number };
}

interface AddToPlaylistDialogProps {
  mixId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddToPlaylistDialog({
  mixId,
  open,
  onOpenChange,
}: AddToPlaylistDialogProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPlaylists();
    }
  }, [open]);

  async function fetchPlaylists() {
    setLoading(true);
    try {
      const response = await fetch("/api/playlists");
      const data = await response.json();
      setPlaylists(data.playlists);
    } catch (error) {
      console.error("Failed to fetch playlists:", error);
    } finally {
      setLoading(false);
    }
  }

  async function addToPlaylist(playlistId: string) {
    try {
      const response = await fetch(`/api/playlists/${playlistId}/mixes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mixId }),
      });

      if (response.ok) {
        setAddedTo((prev) => new Set(prev).add(playlistId));
        setTimeout(() => {
          setAddedTo((prev) => {
            const next = new Set(prev);
            next.delete(playlistId);
            return next;
          });
        }, 2000);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add to playlist");
      }
    } catch (error) {
      console.error("Failed to add to playlist:", error);
      alert("Failed to add to playlist");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Playlist</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You don&apos;t have any playlists yet
              </p>
              <Button onClick={() => {
                setCreateDialogOpen(true);
                onOpenChange(false);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Playlist
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => addToPlaylist(playlist.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors text-left"
                  disabled={addedTo.has(playlist.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{playlist.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {playlist._count.mixes} mixes
                    </p>
                  </div>
                  {addedTo.has(playlist.id) && (
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  )}
                </button>
              ))}

              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  setCreateDialogOpen(true);
                  onOpenChange(false);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Playlist
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreatePlaylistDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            fetchPlaylists();
          }
        }}
        onSuccess={() => {
          setCreateDialogOpen(false);
          fetchPlaylists();
        }}
      />
    </>
  );
}
