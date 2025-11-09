"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { MixCard } from "./mix-card";
import { useAudioPlayer } from "./audio-player-context";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { ArrowLeft, Globe, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
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

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  _count: { mixes: number };
}

export function UserProfile() {
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { playMix } = useAudioPlayer();

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch mixes and playlists in parallel
      const [mixesRes, playlistsRes] = await Promise.all([
        fetch(`/api/mixes?uploaders=${userId}`),
        fetch(`/api/playlists?userId=${userId}`),
      ]);

      const mixesData = await mixesRes.json();
      const playlistsData = await playlistsRes.json();

      if (mixesData.mixes.length > 0) {
        setMixes(mixesData.mixes);
        setUser(mixesData.mixes[0].uploader);
      } else if (playlistsData.playlists.length > 0) {
        // User has no mixes but has playlists
        setUser(playlistsData.playlists[0].user);
      } else {
        setError("User not found");
      }

      setPlaylists(playlistsData.playlists);
    } catch (err) {
      console.error("Failed to fetch user data:", err);
      setError("Failed to load user profile");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-32 bg-muted animate-pulse rounded-lg mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">{error || "User not found"}</h2>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </div>
    );
  }

  const userInitials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="container mx-auto px-4 py-8 pb-32">
      <Button asChild variant="ghost" className="mb-6">
        <Link href="/">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feed
        </Link>
      </Button>

      {/* User Header */}
      <div className="flex items-center gap-6 mb-8">
        <Avatar className="w-24 h-24">
          <AvatarImage src={user.image || undefined} />
          <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold mb-1">
            {user.name || user.email || "Unknown Artist"}
          </h1>
          <p className="text-muted-foreground">
            {mixes.length} {mixes.length === 1 ? "mix" : "mixes"}
          </p>
        </div>
      </div>

      {/* User's Mixes */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Mixes</h2>
        {mixes.length > 0 ? (
          <div className="space-y-4">
            {mixes.map((mix) => (
              <MixCard
                key={mix.id}
                mix={mix}
                onPlay={playMix}
                onUpdate={fetchUserData}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No mixes yet
          </p>
        )}
      </div>

      {/* Public Playlists */}
      {playlists.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Public Playlists</h2>
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
                    <div className="text-xs text-muted-foreground">
                      {playlist._count.mixes} mixes
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
