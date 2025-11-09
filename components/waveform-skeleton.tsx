"use client";

export function WaveformSkeleton({ height = 24 }: { height?: number }) {
  // Generate random bar heights for realistic loading state
  const bars = Array.from({ length: 60 }, () => Math.random() * 0.7 + 0.3);

  return (
    <div
      className="w-full flex items-center gap-0.5 animate-pulse"
      style={{ height: `${height}px` }}
    >
      {bars.map((barHeight, i) => (
        <div
          key={i}
          className="flex-1 bg-muted-foreground/30 rounded-sm"
          style={{
            height: `${barHeight * height}px`,
          }}
        />
      ))}
    </div>
  );
}
