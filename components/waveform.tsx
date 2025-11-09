"use client";

import { useRef, useEffect, useState } from "react";
import { useWavesurfer } from "@wavesurfer/react";
import { WaveformSkeleton } from "./waveform-skeleton";
import { WAVEFORM } from "@/lib/constants";

interface WaveformProps {
  audioUrl?: string;
  peaks?: number[][];
  height?: number;
}

export function Waveform({ audioUrl, peaks, height = WAVEFORM.CARD_HEIGHT }: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { wavesurfer, isPlaying, isReady } = useWavesurfer({
    container: containerRef,
    url: audioUrl,
    peaks, // Use precomputed peaks if available
    height,
    waveColor: "oklch(0.65 0.08 90)", // Sage green (muted)
    progressColor: "oklch(0.45 0.08 110)", // Earthy olive green (primary)
    cursorColor: "oklch(0.45 0.08 110)",
    cursorWidth: 2,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    interact: false, // Disable seeking in preview
    hideScrollbar: true,
    normalize: true,
  });

  // Prevent the waveform from playing - it's just a preview
  useEffect(() => {
    if (wavesurfer && isPlaying) {
      wavesurfer.pause();
    }
  }, [wavesurfer, isPlaying]);

  // Update loading state when waveform is ready
  useEffect(() => {
    if (isReady) {
      setIsLoading(false);
    }
  }, [isReady]);

  if (isLoading && !peaks) {
    return <WaveformSkeleton height={height} />;
  }

  return (
    <div
      ref={containerRef}
      className="w-full rounded-sm overflow-hidden opacity-70"
    />
  );
}
