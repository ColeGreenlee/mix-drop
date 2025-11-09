import { describe, it, expect } from "vitest";
import { generateWaveformPeaks } from "@/lib/waveform";
import { createMockAudioBuffer } from "../../helpers/fixtures";

describe("generateWaveformPeaks", () => {
  it("should generate waveform peaks from audio buffer", () => {
    const buffer = createMockAudioBuffer(1000);
    const peaks = generateWaveformPeaks(buffer, 100);

    expect(peaks).toHaveLength(2); // Two channels
    expect(peaks[0]).toHaveLength(100);
    expect(peaks[1]).toHaveLength(100);
  });

  it("should return values between 0 and 1", () => {
    const buffer = createMockAudioBuffer(1000);
    const peaks = generateWaveformPeaks(buffer, 50);

    peaks[0].forEach((peak) => {
      expect(peak).toBeGreaterThanOrEqual(0);
      expect(peak).toBeLessThanOrEqual(1);
    });

    peaks[1].forEach((peak) => {
      expect(peak).toBeGreaterThanOrEqual(0);
      expect(peak).toBeLessThanOrEqual(1);
    });
  });

  it("should handle default numSamples parameter", () => {
    const buffer = createMockAudioBuffer(5000);
    const peaks = generateWaveformPeaks(buffer);

    expect(peaks[0]).toHaveLength(500); // Default is 500
    expect(peaks[1]).toHaveLength(500);
  });

  it("should generate deterministic output for same input", () => {
    const buffer = Buffer.alloc(1000);
    // Fill with consistent data
    for (let i = 0; i < 1000; i++) {
      buffer[i] = i % 256;
    }

    const peaks1 = generateWaveformPeaks(buffer, 50);
    const peaks2 = generateWaveformPeaks(buffer, 50);

    expect(peaks1).toEqual(peaks2);
  });

  it("should handle small buffers", () => {
    const buffer = createMockAudioBuffer(50);
    const peaks = generateWaveformPeaks(buffer, 10);

    expect(peaks).toHaveLength(2);
    expect(peaks[0]).toHaveLength(10);
    expect(peaks[1]).toHaveLength(10);
  });

  it("should handle large number of samples", () => {
    const buffer = createMockAudioBuffer(10000);
    const peaks = generateWaveformPeaks(buffer, 1000);

    expect(peaks[0]).toHaveLength(1000);
    expect(peaks[1]).toHaveLength(1000);
  });

  it("should create slightly different peaks for stereo effect", () => {
    const buffer = createMockAudioBuffer(1000);
    const peaks = generateWaveformPeaks(buffer, 100);

    // Left and right channels should be similar but not identical
    const allIdentical = peaks[0].every((val, idx) => val === peaks[1][idx]);
    expect(allIdentical).toBe(false);
  });

  it("should handle buffer with all zeros", () => {
    const buffer = Buffer.alloc(1000, 128); // All values at midpoint
    const peaks = generateWaveformPeaks(buffer, 50);

    // Should have minimal peaks since all values are the same
    peaks[0].forEach((peak) => {
      expect(peak).toBeLessThan(0.1);
    });
  });
});
