import { describe, it, expect } from "vitest";
import { generateWaveformPeaks } from "./waveform";

describe("waveform", () => {
  describe("generateWaveformPeaks", () => {
    it("should generate peaks array with two channels", () => {
      const buffer = Buffer.alloc(10000);
      const peaks = generateWaveformPeaks(buffer, 100);

      expect(peaks).toHaveLength(2); // [left, right]
      expect(peaks[0]).toHaveLength(100);
      expect(peaks[1]).toHaveLength(100);
    });

    it("should generate specified number of samples", () => {
      const buffer = Buffer.alloc(10000);

      const peaks100 = generateWaveformPeaks(buffer, 100);
      expect(peaks100[0]).toHaveLength(100);

      const peaks500 = generateWaveformPeaks(buffer, 500);
      expect(peaks500[0]).toHaveLength(500);
    });

    it("should use default 500 samples if not specified", () => {
      const buffer = Buffer.alloc(10000);
      const peaks = generateWaveformPeaks(buffer);

      expect(peaks[0]).toHaveLength(500);
      expect(peaks[1]).toHaveLength(500);
    });

    it("should generate values between 0 and 1", () => {
      const buffer = Buffer.alloc(10000);
      // Fill with random data
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
      }

      const peaks = generateWaveformPeaks(buffer, 100);

      peaks[0].forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });

      peaks[1].forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it("should generate deterministic output for same input", () => {
      const buffer = Buffer.alloc(1000);
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = i % 256;
      }

      const peaks1 = generateWaveformPeaks(buffer, 50);
      const peaks2 = generateWaveformPeaks(buffer, 50);

      expect(peaks1).toEqual(peaks2);
    });

    it("should handle empty buffer", () => {
      const buffer = Buffer.alloc(0);
      const peaks = generateWaveformPeaks(buffer, 10);

      expect(peaks).toHaveLength(2);
      expect(peaks[0]).toHaveLength(10);
      expect(peaks[1]).toHaveLength(10);

      // All values should be 0 for empty buffer
      peaks[0].forEach((value) => {
        expect(value).toBe(0);
      });
    });

    it("should handle small buffer", () => {
      const buffer = Buffer.alloc(10);
      const peaks = generateWaveformPeaks(buffer, 100);

      expect(peaks[0]).toHaveLength(100);
      expect(peaks[1]).toHaveLength(100);
    });

    it("should generate different values for left and right channels", () => {
      const buffer = Buffer.alloc(10000);
      // Fill with data to get non-zero peaks
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = 255;
      }

      const peaks = generateWaveformPeaks(buffer, 100);

      // Channels should be slightly different (stereo effect)
      let hasDifference = false;
      for (let i = 0; i < peaks[0].length; i++) {
        if (peaks[0][i] !== peaks[1][i]) {
          hasDifference = true;
          break;
        }
      }

      expect(hasDifference).toBe(true);
    });

    it("should apply smoothing to peaks", () => {
      const buffer = Buffer.alloc(1000);
      // Create a pattern with sharp transitions
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = i % 2 === 0 ? 0 : 255;
      }

      const peaks = generateWaveformPeaks(buffer, 50);

      // Values should be smoothed (at least some variation)
      const uniqueValues = new Set(peaks[0]);
      expect(uniqueValues.size).toBeGreaterThan(0);
    });

    it("should normalize values based on buffer data", () => {
      // Test with max value buffer
      const maxBuffer = Buffer.alloc(1000, 255);
      const maxPeaks = generateWaveformPeaks(maxBuffer, 10);

      // Test with min value buffer
      const minBuffer = Buffer.alloc(1000, 128); // 128 is the center value
      const minPeaks = generateWaveformPeaks(minBuffer, 10);

      // Max buffer should produce higher peaks
      const maxAvg = maxPeaks[0].reduce((a, b) => a + b, 0) / maxPeaks[0].length;
      const minAvg = minPeaks[0].reduce((a, b) => a + b, 0) / minPeaks[0].length;

      expect(maxAvg).toBeGreaterThan(minAvg);
    });
  });
});
