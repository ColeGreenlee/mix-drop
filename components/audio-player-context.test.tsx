import React, { ReactNode } from "react";
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AudioPlayerProvider, useAudioPlayer } from "./audio-player-context";

// Test wrapper
const wrapper = ({ children }: { children: ReactNode }) => (
  <AudioPlayerProvider>{children}</AudioPlayerProvider>
);

// Mock mix data
const createMockMix = (id: string, title: string = "Test Mix") => ({
  id,
  title,
  artist: "Test Artist",
});

describe("AudioPlayerContext", () => {
  describe("useAudioPlayer", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console errors for this test
      const consoleError = console.error;
      console.error = () => {};

      expect(() => {
        renderHook(() => useAudioPlayer());
      }).toThrow("useAudioPlayer must be used within AudioPlayerProvider");

      console.error = consoleError;
    });

    it("should provide context when used within provider", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.currentMix).toBeNull();
      expect(result.current.queue).toEqual([]);
      expect(result.current.isPlayerOpen).toBe(false);
    });
  });

  describe("playMix", () => {
    it("should set current mix and open player", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix = createMockMix("1");

      act(() => {
        result.current.playMix(mix);
      });

      expect(result.current.currentMix).toEqual(mix);
      expect(result.current.isPlayerOpen).toBe(true);
    });

    it("should replace current mix when playing different mix", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix1 = createMockMix("1", "Mix 1");
      const mix2 = createMockMix("2", "Mix 2");

      act(() => {
        result.current.playMix(mix1);
      });

      expect(result.current.currentMix?.id).toBe("1");

      act(() => {
        result.current.playMix(mix2);
      });

      expect(result.current.currentMix?.id).toBe("2");
    });
  });

  describe("addToQueue", () => {
    it("should add mix to queue", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix = createMockMix("1");

      act(() => {
        result.current.addToQueue(mix);
      });

      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0]).toEqual(mix);
      expect(result.current.isPlayerOpen).toBe(true);
    });

    it("should add multiple mixes to queue", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix1 = createMockMix("1", "Mix 1");
      const mix2 = createMockMix("2", "Mix 2");
      const mix3 = createMockMix("3", "Mix 3");

      act(() => {
        result.current.addToQueue(mix1);
        result.current.addToQueue(mix2);
        result.current.addToQueue(mix3);
      });

      expect(result.current.queue).toHaveLength(3);
      expect(result.current.queue[0].id).toBe("1");
      expect(result.current.queue[1].id).toBe("2");
      expect(result.current.queue[2].id).toBe("3");
    });

    it("should not add duplicate mixes", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix = createMockMix("1");

      act(() => {
        result.current.addToQueue(mix);
        result.current.addToQueue(mix);
      });

      expect(result.current.queue).toHaveLength(1);
    });

    it("should prevent duplicates by ID", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix1 = createMockMix("1", "Mix 1");
      const mix2 = { ...mix1, title: "Different Title" }; // Same ID

      act(() => {
        result.current.addToQueue(mix1);
        result.current.addToQueue(mix2);
      });

      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].title).toBe("Mix 1"); // Original kept
    });
  });

  describe("removeFromQueue", () => {
    it("should remove mix from queue by index", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix1 = createMockMix("1", "Mix 1");
      const mix2 = createMockMix("2", "Mix 2");
      const mix3 = createMockMix("3", "Mix 3");

      act(() => {
        result.current.addToQueue(mix1);
        result.current.addToQueue(mix2);
        result.current.addToQueue(mix3);
      });

      expect(result.current.queue).toHaveLength(3);

      act(() => {
        result.current.removeFromQueue(1); // Remove middle item
      });

      expect(result.current.queue).toHaveLength(2);
      expect(result.current.queue[0].id).toBe("1");
      expect(result.current.queue[1].id).toBe("3");
    });

    it("should remove first item from queue", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix1 = createMockMix("1");
      const mix2 = createMockMix("2");

      act(() => {
        result.current.addToQueue(mix1);
        result.current.addToQueue(mix2);
        result.current.removeFromQueue(0);
      });

      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].id).toBe("2");
    });

    it("should remove last item from queue", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix1 = createMockMix("1");
      const mix2 = createMockMix("2");

      act(() => {
        result.current.addToQueue(mix1);
        result.current.addToQueue(mix2);
        result.current.removeFromQueue(1);
      });

      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].id).toBe("1");
    });
  });

  describe("playNext", () => {
    it("should play next mix in queue", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix1 = createMockMix("1", "Mix 1");
      const mix2 = createMockMix("2", "Mix 2");

      act(() => {
        result.current.addToQueue(mix1);
        result.current.addToQueue(mix2);
      });

      act(() => {
        result.current.playNext();
      });

      expect(result.current.currentMix?.id).toBe("1");
      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].id).toBe("2");
    });

    it("should close player when queue is empty", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix = createMockMix("1");

      act(() => {
        result.current.playMix(mix);
      });

      expect(result.current.isPlayerOpen).toBe(true);

      act(() => {
        result.current.playNext();
      });

      expect(result.current.isPlayerOpen).toBe(false);
      expect(result.current.currentMix).toBeNull();
    });

    it("should advance through entire queue", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix1 = createMockMix("1");
      const mix2 = createMockMix("2");
      const mix3 = createMockMix("3");

      act(() => {
        result.current.addToQueue(mix1);
        result.current.addToQueue(mix2);
        result.current.addToQueue(mix3);
      });

      // Play first
      act(() => {
        result.current.playNext();
      });
      expect(result.current.currentMix?.id).toBe("1");
      expect(result.current.queue).toHaveLength(2);

      // Play second
      act(() => {
        result.current.playNext();
      });
      expect(result.current.currentMix?.id).toBe("2");
      expect(result.current.queue).toHaveLength(1);

      // Play third
      act(() => {
        result.current.playNext();
      });
      expect(result.current.currentMix?.id).toBe("3");
      expect(result.current.queue).toHaveLength(0);

      // Queue empty - should close
      act(() => {
        result.current.playNext();
      });
      expect(result.current.isPlayerOpen).toBe(false);
    });
  });

  describe("reorderQueue", () => {
    it("should reorder queue items", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix1 = createMockMix("1", "Mix 1");
      const mix2 = createMockMix("2", "Mix 2");
      const mix3 = createMockMix("3", "Mix 3");

      act(() => {
        result.current.addToQueue(mix1);
        result.current.addToQueue(mix2);
        result.current.addToQueue(mix3);
      });

      // Move first item to end (0 → 2)
      act(() => {
        result.current.reorderQueue(0, 2);
      });

      expect(result.current.queue[0].id).toBe("2");
      expect(result.current.queue[1].id).toBe("3");
      expect(result.current.queue[2].id).toBe("1");
    });

    it("should move item forward in queue", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix1 = createMockMix("1");
      const mix2 = createMockMix("2");
      const mix3 = createMockMix("3");

      act(() => {
        result.current.addToQueue(mix1);
        result.current.addToQueue(mix2);
        result.current.addToQueue(mix3);
        result.current.reorderQueue(2, 0); // Move last to first
      });

      expect(result.current.queue[0].id).toBe("3");
      expect(result.current.queue[1].id).toBe("1");
      expect(result.current.queue[2].id).toBe("2");
    });
  });

  describe("toggleQueue", () => {
    it("should toggle queue visibility", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });

      expect(result.current.isQueueOpen).toBe(false);

      act(() => {
        result.current.toggleQueue();
      });

      expect(result.current.isQueueOpen).toBe(true);

      act(() => {
        result.current.toggleQueue();
      });

      expect(result.current.isQueueOpen).toBe(false);
    });
  });

  describe("closePlayer", () => {
    it("should close player and clear all state", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix1 = createMockMix("1");
      const mix2 = createMockMix("2");

      act(() => {
        result.current.playMix(mix1);
        result.current.addToQueue(mix2);
        result.current.toggleQueue();
      });

      expect(result.current.isPlayerOpen).toBe(true);
      expect(result.current.currentMix).not.toBeNull();
      expect(result.current.queue).toHaveLength(1);
      expect(result.current.isQueueOpen).toBe(true);

      act(() => {
        result.current.closePlayer();
      });

      expect(result.current.isPlayerOpen).toBe(false);
      expect(result.current.currentMix).toBeNull();
      expect(result.current.queue).toHaveLength(0);
      expect(result.current.isQueueOpen).toBe(false);
    });
  });

  describe("clearQueue", () => {
    it("should clear queue without affecting current mix", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix1 = createMockMix("1");
      const mix2 = createMockMix("2");

      act(() => {
        result.current.playMix(mix1);
        result.current.addToQueue(mix2);
      });

      expect(result.current.queue).toHaveLength(1);
      expect(result.current.currentMix).not.toBeNull();

      act(() => {
        result.current.clearQueue();
      });

      expect(result.current.queue).toHaveLength(0);
      expect(result.current.currentMix).toEqual(mix1); // Still playing
      expect(result.current.isPlayerOpen).toBe(true);
    });
  });

  describe("complex user flows", () => {
    it("should handle adding to queue while playing", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix1 = createMockMix("1");
      const mix2 = createMockMix("2");

      act(() => {
        result.current.playMix(mix1);
      });

      expect(result.current.currentMix?.id).toBe("1");
      expect(result.current.queue).toHaveLength(0);

      act(() => {
        result.current.addToQueue(mix2);
      });

      expect(result.current.currentMix?.id).toBe("1"); // Still playing
      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].id).toBe("2");
    });

    it("should handle play next with current mix", () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const mix1 = createMockMix("1");
      const mix2 = createMockMix("2");

      act(() => {
        result.current.playMix(mix1);
      });

      act(() => {
        result.current.addToQueue(mix2);
      });

      act(() => {
        result.current.playNext();
      });

      expect(result.current.currentMix?.id).toBe("2");
      expect(result.current.queue).toHaveLength(0);
    });
  });
});
