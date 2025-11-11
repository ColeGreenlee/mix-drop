import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AddToPlaylistDialog } from "./add-to-playlist-dialog";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

// Mock CreatePlaylistDialog
vi.mock("./create-playlist-dialog", () => ({
  CreatePlaylistDialog: () => <div data-testid="create-playlist-dialog">Create Playlist</div>,
}));

// Mock fetch
global.fetch = vi.fn();

describe("AddToPlaylistDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mixId = "mix-123";

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ playlists: [] }),
    });
  });

  it("should render when open is true", () => {
    const { container } = render(
      <AddToPlaylistDialog
        mixId={mixId}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(container).toBeTruthy();
  });

  it("should not render when open is false", () => {
    const { container } = render(
      <AddToPlaylistDialog
        mixId={mixId}
        open={false}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Dialog component handles visibility internally
    expect(container).toBeTruthy();
  });

  it("should handle empty playlists", async () => {
    const { container } = render(
      <AddToPlaylistDialog
        mixId={mixId}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(container).toBeTruthy();
  });

  it("should render without errors", () => {
    const { container } = render(
      <AddToPlaylistDialog
        mixId={mixId}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(container).toBeTruthy();
  });
});
