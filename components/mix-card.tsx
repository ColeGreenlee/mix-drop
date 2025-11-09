"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Music2, Edit, ExternalLink, Trash2, Download, ListPlus, FolderPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useAudioPlayer } from "./audio-player-context";
import Image from "next/image";
import Link from "next/link";
import { EditMixDialog } from "./edit-mix-dialog";
import { AddToPlaylistDialog } from "./add-to-playlist-dialog";
import { Waveform } from "./waveform";

interface Mix {
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
}

interface MixCardProps {
  mix: Mix;
  onPlay: (mix: Mix) => void;
  onUpdate?: () => void;
}

export function MixCard({ mix, onPlay, onUpdate }: MixCardProps) {
  const { data: session } = useSession();
  const { addToQueue } = useAudioPlayer();
  const [coverArtUrl, setCoverArtUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = session?.user?.id === mix.uploader.id;
  const isAdmin = session?.user?.role === "admin";
  const canEdit = isOwner || isAdmin;

  useEffect(() => {
    async function fetchUrls() {
      // Fetch cover art
      if (mix.coverArtKey) {
        try {
          const response = await fetch(`/api/stream/${mix.id}?type=cover`);
          const data = await response.json();
          setCoverArtUrl(data.url);
        } catch (error) {
          console.error("Failed to fetch cover art:", error);
        }
      }

      // Fetch audio URL for waveform
      try {
        const response = await fetch(`/api/stream/${mix.id}`);
        const data = await response.json();
        setAudioUrl(data.url);
      } catch (error) {
        console.error("Failed to fetch audio URL:", error);
      }
    }

    fetchUrls();
  }, [mix.id, mix.coverArtKey]);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditDialogOpen(true);
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${mix.title}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/mixes/${mix.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete mix");
      }

      // Refresh the list
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to delete mix:", error);
      alert("Failed to delete mix. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const response = await fetch(`/api/mixes/${mix.id}/download`);
      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error("Failed to get download URL");
      }

      // Create a temporary link and click it to trigger download
      const link = document.createElement('a');
      link.href = data.url;
      link.download = data.filename || `${mix.artist} - ${mix.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download mix:", error);
      alert("Failed to download mix. Please try again.");
    }
  };

  return (
    <>
      <div className="flex gap-3">
      {/* Cover Art */}
      <div className="relative flex-shrink-0 cursor-pointer group" onClick={() => onPlay(mix)}>
        {coverArtUrl ? (
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden">
            <Image
              src={coverArtUrl}
              alt={`${mix.title} cover art`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 80px, 96px"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="white" />
            </div>
          </div>
        ) : (
          <div className="relative w-20 h-20 sm:w-24 sm:h-24">
            <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
              <Music2 className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="white" />
            </div>
          </div>
        )}
      </div>

      {/* Mix Info Card */}
      <Card className="flex-1 min-w-0 transition-colors relative group/card overflow-hidden">
        <CardContent className="p-3 h-20 sm:h-24 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-base sm:text-lg truncate leading-tight pr-16">
              {mix.title}
            </h3>
            <Link
              href={`/user/${mix.uploader.id}`}
              className="text-sm text-muted-foreground hover:text-foreground truncate block transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {mix.artist}
            </Link>
          </div>

          {/* Waveform */}
          <div className="mt-1">
            <Waveform
              audioUrl={audioUrl || undefined}
              peaks={mix.waveformPeaks ? JSON.parse(mix.waveformPeaks) : undefined}
            />
          </div>
        </CardContent>

        {/* Action Toolbar - top-right corner */}
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          {canEdit && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleEditClick}
                disabled={isDeleting}
                title="Edit mix"
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDeleteClick}
                disabled={isDeleting}
                title="Delete mix"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          {session && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                setAddToPlaylistOpen(true);
              }}
              title="Add to playlist"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              addToQueue(mix);
            }}
            title="Add to queue"
          >
            <ListPlus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleDownloadClick}
            title="Download mix"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            asChild
            title="View mix details"
          >
            <Link href={`/mix/${mix.id}`}>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </Card>
    </div>

      <EditMixDialog
        mix={mix}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={onUpdate}
      />

      <AddToPlaylistDialog
        mixId={mix.id}
        open={addToPlaylistOpen}
        onOpenChange={setAddToPlaylistOpen}
      />
    </>
  );
}
