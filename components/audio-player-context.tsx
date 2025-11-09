"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface Mix {
  id: string;
  title: string;
  artist: string;
}

interface AudioPlayerContextType {
  currentMix: Mix | null;
  queue: Mix[];
  isPlayerOpen: boolean;
  isQueueOpen: boolean;
  playMix: (mix: Mix) => void;
  addToQueue: (mix: Mix) => void;
  removeFromQueue: (index: number) => void;
  playNext: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  toggleQueue: () => void;
  closePlayer: () => void;
  clearQueue: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(
  undefined
);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [currentMix, setCurrentMix] = useState<Mix | null>(null);
  const [queue, setQueue] = useState<Mix[]>([]);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const playMix = useCallback((mix: Mix) => {
    setCurrentMix(mix);
    setIsPlayerOpen(true);
  }, []);

  const addToQueue = useCallback((mix: Mix) => {
    setQueue((prev) => {
      // Don't add duplicates
      if (prev.some((m) => m.id === mix.id)) {
        return prev;
      }
      return [...prev, mix];
    });
    setIsPlayerOpen(true);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const closePlayer = useCallback(() => {
    setIsPlayerOpen(false);
    setCurrentMix(null);
    setQueue([]);
    setIsQueueOpen(false);
  }, []);

  const playNext = useCallback(() => {
    if (queue.length > 0) {
      const [nextMix, ...remainingQueue] = queue;
      setCurrentMix(nextMix);
      setQueue(remainingQueue);
    } else {
      // No more tracks in queue
      closePlayer();
    }
  }, [queue, closePlayer]);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      const newQueue = [...prev];
      const [removed] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, removed);
      return newQueue;
    });
  }, []);

  const toggleQueue = useCallback(() => {
    setIsQueueOpen((prev) => !prev);
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentMix,
        queue,
        isPlayerOpen,
        isQueueOpen,
        playMix,
        addToQueue,
        removeFromQueue,
        playNext,
        reorderQueue,
        toggleQueue,
        closePlayer,
        clearQueue,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return context;
}
