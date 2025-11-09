"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./theme-provider";
import { AudioPlayerProvider } from "./audio-player-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider defaultTheme="system" storageKey="mixdrop-theme">
        <AudioPlayerProvider>
          {children}
        </AudioPlayerProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
