"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, X, Volume2, VolumeX, ListMusic, SkipForward } from "lucide-react";
import { useAudioPlayer } from "./audio-player-context";
import { QueueDrawer } from "./queue-drawer";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayer() {
  const { currentMix, isPlayerOpen, closePlayer, playNext } = useAudioPlayer();

  if (!isPlayerOpen || !currentMix) {
    return null;
  }

  return (
    <>
      <AudioPlayerContent mix={currentMix} onClose={closePlayer} onEnded={playNext} />
      <QueueDrawer />
    </>
  );
}

function AudioPlayerContent({
  mix,
  onClose,
  onEnded,
}: {
  mix: { id: string; title: string; artist: string };
  onClose: () => void;
  onEnded: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { queue, toggleQueue } = useAudioPlayer();

  // Fetch stream URL
  useEffect(() => {
    async function fetchStreamUrl() {
      try {
        const response = await fetch(`/api/stream/${mix.id}`);
        const data = await response.json();
        setAudioUrl(data.url);
      } catch (error) {
        console.error("Failed to fetch stream URL:", error);
      }
    }

    fetchStreamUrl();
  }, [mix.id]);

  // Setup Media Session API
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: mix.title,
        artist: mix.artist,
        album: "MixDrop",
      });

      navigator.mediaSession.setActionHandler("play", () => {
        audioRef.current?.play();
      });

      navigator.mediaSession.setActionHandler("pause", () => {
        audioRef.current?.pause();
      });

      navigator.mediaSession.setActionHandler("seekbackward", () => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(
            0,
            audioRef.current.currentTime - 10
          );
        }
      });

      navigator.mediaSession.setActionHandler("seekforward", () => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(
            audioRef.current.duration,
            audioRef.current.currentTime + 10
          );
        }
      });
    }

    return () => {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = null;
      }
    };
  }, [mix]);

  // Auto-play when URL is loaded
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
    }
  }, [audioUrl]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 0.5;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  return (
    <Card className="fixed bottom-0 left-0 right-0 border-t shadow-lg z-50">
      <div className="px-2 sm:px-4 py-3 sm:py-4">
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              onEnded(); // Play next track from queue
            }}
          />
        )}

        {/* Mobile Layout */}
        <div className="flex flex-col gap-2 md:hidden">
          {/* Top Row: Track Info and Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={togglePlayPause}
              disabled={!audioUrl}
              className="flex-shrink-0"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" fill="currentColor" />
              ) : (
                <Play className="w-5 h-5" fill="currentColor" />
              )}
            </Button>

            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate text-sm">{mix.title}</div>
              <div className="text-xs text-muted-foreground truncate">
                {mix.artist}
              </div>
            </div>

            {queue.length > 0 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onEnded()}
                className="flex-shrink-0"
                title="Skip to next"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            )}

            <Button
              size="icon"
              variant="ghost"
              onClick={toggleQueue}
              className="flex-shrink-0 relative"
              title="Queue"
            >
              <ListMusic className="w-4 h-4" />
              {queue.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {queue.length}
                </span>
              )}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={toggleMute}
              className="flex-shrink-0"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Bottom Row: Progress Bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
              disabled={!audioUrl}
            />
            <span className="text-xs text-muted-foreground w-10 flex-shrink-0">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center gap-4">
          {/* Play/Pause Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={togglePlayPause}
            disabled={!audioUrl}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" fill="currentColor" />
            ) : (
              <Play className="w-6 h-6" fill="currentColor" />
            )}
          </Button>

          {/* Track Info */}
          <div className="flex-shrink-0 min-w-0 w-48">
            <div className="font-semibold truncate">{mix.title}</div>
            <div className="text-sm text-muted-foreground truncate">
              {mix.artist}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
              disabled={!audioUrl}
            />
            <span className="text-sm text-muted-foreground w-12">
              {formatTime(duration)}
            </span>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2 w-32">
            <Button size="icon" variant="ghost" onClick={toggleMute}>
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="flex-1"
            />
          </div>

          {/* Queue Controls */}
          {queue.length > 0 && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEnded()}
              title="Skip to next"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={toggleQueue}
            className="relative"
            title="Queue"
          >
            <ListMusic className="w-4 h-4" />
            {queue.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {queue.length}
              </span>
            )}
          </Button>

          {/* Close Button */}
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
