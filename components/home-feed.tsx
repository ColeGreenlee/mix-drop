"use client";

import { useEffect, useState } from "react";
import { MixCard } from "./mix-card";
import { useAudioPlayer } from "./audio-player-context";

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

export function HomeFeed() {
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [loading, setLoading] = useState(true);
  const { playMix } = useAudioPlayer();

  const fetchMixes = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/mixes");
      const data = await response.json();
      setMixes(data.mixes);
    } catch (error) {
      console.error("Failed to fetch mixes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMixes();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (mixes.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">No mixes yet</h2>
        <p className="text-muted-foreground">
          Be the first to upload a mix!
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-32">
      <h1 className="text-3xl font-bold mb-6">Latest Mixes</h1>

      <div className="space-y-4">
        {mixes.map((mix) => (
          <MixCard
            key={mix.id}
            mix={mix}
            onPlay={playMix}
            onUpdate={fetchMixes}
          />
        ))}
      </div>
    </div>
  );
}
