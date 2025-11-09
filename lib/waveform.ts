/**
 * Generate waveform peaks from audio buffer
 * This is a simplified peak extraction - for production you might want
 * to use a more sophisticated library or server-side audio processing
 */
export function generateWaveformPeaks(
  audioBuffer: Buffer,
  numSamples: number = 500
): number[][] {
  // Generate deterministic peaks based on audio buffer data
  // This creates a stable waveform that looks realistic
  const peaks: number[][] = [[], []]; // [left channel, right channel]

  const chunkSize = Math.floor(audioBuffer.length / numSamples);

  for (let i = 0; i < numSamples; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, audioBuffer.length);

    // Calculate peak value from this chunk of audio data
    let max = 0;
    for (let j = start; j < end; j++) {
      const value = Math.abs(audioBuffer[j] - 128) / 128; // Normalize to 0-1
      if (value > max) max = value;
    }

    // Add some smoothing and ensure reasonable range
    const smoothedValue = Math.min(max * 1.2, 1);
    peaks[0].push(smoothedValue);
    peaks[1].push(smoothedValue * 0.95); // Slightly different for stereo effect
  }

  return peaks;
}

/**
 * Note: For production-grade waveform generation, consider:
 * 1. Using audiowaveform CLI tool in a Docker container
 * 2. Using fluent-ffmpeg to extract audio data
 * 3. Using music-metadata to parse audio files
 * 4. Processing audio with Web Audio API if running client-side
 *
 * The current implementation generates placeholder data that creates
 * a realistic-looking waveform for demonstration purposes.
 */
