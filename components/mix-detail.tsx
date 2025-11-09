"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MixCard } from "./mix-card";
import { useAudioPlayer } from "./audio-player-context";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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

export function MixDetail() {
  const params = useParams();
  const mixId = params.id as string;
  const [mix, setMix] = useState<Mix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { playMix } = useAudioPlayer();

  useEffect(() => {
    async function fetchMix() {
      try {
        const response = await fetch(`/api/mixes/${mixId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Mix not found");
          } else {
            setError("Failed to load mix");
          }
          return;
        }

        const data = await response.json();
        setMix(data);
      } catch (err) {
        console.error("Failed to fetch mix:", err);
        setError("Failed to load mix");
      } finally {
        setLoading(false);
      }
    }

    fetchMix();
  }, [mixId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error || !mix) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">{error || "Mix not found"}</h2>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-32">
      <Button asChild variant="ghost" className="mb-6">
        <Link href="/">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feed
        </Link>
      </Button>

      <MixCard
        mix={mix}
        onPlay={playMix}
        onUpdate={async () => {
          // Refetch mix data after edit
          const response = await fetch(`/api/mixes/${mixId}`);
          const data = await response.json();
          setMix(data);
        }}
      />
    </div>
  );
}
