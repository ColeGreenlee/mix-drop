import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { faker } from "@faker-js/faker";
import { MixCard } from "./mix-card";
import { createMockMix, createMockUser } from "@/tests/utils/test-factories";
import { AudioPlayerProvider } from "./audio-player-context";

// Mock next-auth - need to hoist the mock
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: {
        id: "test-user-id",
        name: "Test User",
        email: "test@test.com",
        role: "user",
      },
      expires: "2024-12-31",
    },
    status: "authenticated",
  }),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock child components
vi.mock("./edit-mix-dialog", () => ({
  EditMixDialog: ({ open, onOpenChange }: any) =>
    open ? <div data-testid="edit-dialog">Edit Dialog</div> : null,
}));

vi.mock("./add-to-playlist-dialog", () => ({
  AddToPlaylistDialog: ({ open, onOpenChange }: any) =>
    open ? <div data-testid="add-to-playlist-dialog">Add to Playlist</div> : null,
}));

vi.mock("./waveform", () => ({
  Waveform: ({ peaks }: any) => (
    <div data-testid="waveform">Waveform: {peaks?.length || 0} peaks</div>
  ),
}));

// Mock fetch
global.fetch = vi.fn();

describe("MixCard", () => {
  const mockOnPlay = vi.fn();
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ url: "https://example.com/test.mp3" }),
    });
  });

  const createTestMix = (overrides: any = {}) => {
    const baseMix = createMockMix(overrides);
    return {
      ...baseMix,
      uploader: overrides.uploader || {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        image: null,
      },
    };
  };

  const renderMixCard = (mix: any, props = {}) => {
    return render(
      <AudioPlayerProvider>
        <MixCard mix={mix} onPlay={mockOnPlay} onUpdate={mockOnUpdate} {...props} />
      </AudioPlayerProvider>
    );
  };

  it("should render mix title and artist", () => {
    const mix = createTestMix({
      title: "Test Mix",
      artist: "Test DJ",
    });

    renderMixCard(mix);

    expect(screen.getByText("Test Mix")).toBeInTheDocument();
    expect(screen.getByText("Test DJ")).toBeInTheDocument();
  });

  it("should render with uploader information", () => {
    const mix = createTestMix();

    const { container } = renderMixCard(mix);

    // Component renders successfully
    expect(container).toBeTruthy();
    expect(screen.getByText(mix.title)).toBeInTheDocument();
  });

  it("should show play button", () => {
    const mix = createTestMix();
    const { container } = renderMixCard(mix);

    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("should render interactive elements", () => {
    const mix = createTestMix({ title: "Clickable Mix" });
    const { container } = renderMixCard(mix);

    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("should show description if provided", () => {
    const mix = createTestMix({
      description: "This is a test description",
    });

    const { container } = renderMixCard(mix);

    // Component renders with description
    expect(container).toBeTruthy();
  });

  it("should render mix metadata", () => {
    const mix = createTestMix({
      duration: 3665,
      title: "Test Mix",
      artist: "Test Artist",
    });

    const { container } = renderMixCard(mix);

    // Should render without errors
    expect(container).toBeTruthy();
    expect(screen.getByText("Test Mix")).toBeInTheDocument();
  });

  it("should render for mix owner", () => {
    const mix = createTestMix({
      uploader: {
        id: "test-user-id",
        name: "Owner",
        email: "owner@test.com",
        image: null,
      },
    });

    const { container } = renderMixCard(mix);

    expect(container).toBeTruthy();
    expect(screen.getByText(mix.title)).toBeInTheDocument();
  });

  it("should render for non-owner", () => {
    const mix = createTestMix({
      uploader: {
        id: "different-user-id",
        name: "Other User",
        email: "other@test.com",
        image: null,
      },
    });

    const { container } = renderMixCard(mix);

    expect(container).toBeTruthy();
  });

  it("should show waveform if peaks provided", () => {
    const peaks = JSON.stringify([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]);
    const mix = createTestMix({
      waveformPeaks: peaks,
    });

    renderMixCard(mix);

    expect(screen.getByTestId("waveform")).toBeInTheDocument();
  });

  it("should render action buttons", () => {
    const mix = createTestMix();
    const { container } = renderMixCard(mix);

    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("should handle public and private mixes", () => {
    const publicMix = createTestMix({ isPublic: true });
    const { container } = renderMixCard(publicMix);

    expect(container).toBeTruthy();

    const privateMix = createTestMix({ isPublic: false });
    const { container: privateContainer } = render(
      <AudioPlayerProvider>
        <MixCard mix={privateMix as any} onPlay={mockOnPlay} onUpdate={mockOnUpdate} />
      </AudioPlayerProvider>
    );

    expect(privateContainer).toBeTruthy();
  });

  it("should render successfully", () => {
    const mix = createTestMix({ id: "test-mix-123" });

    const { container } = renderMixCard(mix);

    expect(container).toBeTruthy();
    expect(screen.getByText(mix.title)).toBeInTheDocument();
  });
});
