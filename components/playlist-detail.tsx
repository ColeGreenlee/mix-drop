"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MixCard } from "./mix-card";
import { useAudioPlayer } from "./audio-player-context";
import { Button } from "./ui/button";
import { ArrowLeft, Edit, Trash2, Lock, Globe } from "lucide-react";
import Link from "next/link";

interface PlaylistMix {
  id: string;
  order: number;
  mix: {
    id: string;
    title: string;
    artist: string;
    description: string | null;
    duration: number;
    createdAt: string;
    coverArtKey: string | null;
    waveformPeaks: string | null;
    isPublic: boolean;
    uploader: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  };
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  mixes: PlaylistMix[];
}

export function PlaylistDetail() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const playlistId = params.id as string;
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { playMix, addToQueue } = useAudioPlayer();

  const isOwner = session?.user?.id === playlist?.userId;

  useEffect(() => {
    async function fetchPlaylist() {
      try {
        const response = await fetch(`/api/playlists/${playlistId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Playlist not found");
          } else if (response.status === 403) {
            setError("This playlist is private");
          } else {
            setError("Failed to load playlist");
          }
          return;
        }

        const data = await response.json();
        setPlaylist(data);
      } catch (err) {
        console.error("Failed to fetch playlist:", err);
        setError("Failed to load playlist");
      } finally {
        setLoading(false);
      }
    }

    fetchPlaylist();
  }, [playlistId]);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${playlist?.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/playlists");
      }
    } catch (error) {
      console.error("Failed to delete playlist:", error);
      alert("Failed to delete playlist");
    }
  };

  const handlePlayAll = () => {
    if (!playlist || playlist.mixes.length === 0) return;

    // Play first mix and add rest to queue
    const [first, ...rest] = playlist.mixes.map((pm) => pm.mix);
    playMix(first);
    rest.forEach((mix) => addToQueue(mix));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">{error || "Playlist not found"}</h2>
        <Button asChild>
          <Link href="/playlists">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Playlists
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-32">
      <Button asChild variant="ghost" className="mb-6">
        <Link href="/playlists">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Playlists
        </Link>
      </Button>

      {/* Playlist Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{playlist.name}</h1>
              {playlist.isPublic ? (
                <Globe className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Lock className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            {playlist.description && (
              <p className="text-muted-foreground">{playlist.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {playlist.mixes.length} {playlist.mixes.length === 1 ? "mix" : "mixes"} •
              by {playlist.user.name || playlist.user.email}
            </p>
          </div>

          {isOwner && (
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" title="Edit playlist">
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="hover:bg-destructive/10 hover:text-destructive"
                title="Delete playlist"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {playlist.mixes.length > 0 && (
          <Button onClick={handlePlayAll}>
            Play All
          </Button>
        )}
      </div>

      {/* Playlist Mixes */}
      {playlist.mixes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>This playlist is empty</p>
        </div>
      ) : (
        <div className="space-y-4">
          {playlist.mixes.map((playlistMix) => (
            <MixCard
              key={playlistMix.id}
              mix={playlistMix.mix}
              onPlay={playMix}
            />
          ))}
        </div>
      )}
    </div>
  );
}
