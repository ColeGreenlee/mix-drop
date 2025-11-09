"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ListMusic, Lock, Globe } from "lucide-react";
import Link from "next/link";
import { CreatePlaylistDialog } from "@/components/create-playlist-dialog";

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  _count: {
    mixes: number;
  };
}

export default function PlaylistsPage() {
  const { data: session } = useSession();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchPlaylists = async () => {
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
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-32">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Playlists</h1>
        {session && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Playlist
          </Button>
        )}
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-16">
          <ListMusic className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">No playlists yet</h2>
          <p className="text-muted-foreground mb-6">
            {session
              ? "Create your first playlist to organize your favorite mixes"
              : "Sign in to create playlists"}
          </p>
          {session && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Playlist
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((playlist) => (
            <Link key={playlist.id} href={`/playlists/${playlist.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-lg truncate flex-1">
                      {playlist.name}
                    </h3>
                    {playlist.isPublic ? (
                      <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  {playlist.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {playlist.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{playlist._count.mixes} mixes</span>
                    <span>by {playlist.user.name || playlist.user.email}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreatePlaylistDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchPlaylists}
      />
    </div>
  );
}
