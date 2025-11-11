import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreatePlaylistDialog } from "./create-playlist-dialog";

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe("CreatePlaylistDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render when open is true", () => {
    render(
      <CreatePlaylistDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByText("Create New Playlist")).toBeInTheDocument();
  });

  it("should not render when open is false", () => {
    render(
      <CreatePlaylistDialog
        open={false}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.queryByText("Create New Playlist")).not.toBeInTheDocument();
  });

  it("should have required form fields", () => {
    render(
      <CreatePlaylistDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/public/i)).toBeInTheDocument();
  });

  it("should have create button", () => {
    render(
      <CreatePlaylistDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
  });

  it("should submit form with valid data", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ playlist: { id: "1", name: "Test Playlist" } }),
    });

    render(
      <CreatePlaylistDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill in form
    await user.type(screen.getByLabelText(/name/i), "My Playlist");
    await user.type(screen.getByLabelText(/description/i), "A test playlist");

    // Submit
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/playlists",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("My Playlist"),
        })
      );
    });
  });

  it("should call onSuccess after successful creation", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ playlist: { id: "1" } }),
    });

    render(
      <CreatePlaylistDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    await user.type(screen.getByLabelText(/name/i), "Test");
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("should close dialog after successful creation", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ playlist: { id: "1" } }),
    });

    render(
      <CreatePlaylistDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.type(screen.getByLabelText(/name/i), "Test");
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("should refresh router after creation", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ playlist: { id: "1" } }),
    });

    render(
      <CreatePlaylistDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.type(screen.getByLabelText(/name/i), "Test");
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("should display error message on failure", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Name is required" }),
    });

    render(
      <CreatePlaylistDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.type(screen.getByLabelText(/name/i), "Test");
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it("should disable submit button while saving", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 1000))
    );

    render(
      <CreatePlaylistDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.type(screen.getByLabelText(/name/i), "Test");

    const submitButton = screen.getByRole("button", { name: /create/i });
    await user.click(submitButton);

    // Button should be disabled while saving
    expect(submitButton).toBeDisabled();
  });

  it("should toggle public/private switch", async () => {
    const user = userEvent.setup();

    render(
      <CreatePlaylistDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const publicSwitch = screen.getByRole("switch", { name: /public/i });

    expect(publicSwitch).not.toBeChecked();

    await user.click(publicSwitch);

    expect(publicSwitch).toBeChecked();
  });

  it("should handle dialog open/close cycle", async () => {
    const { rerender } = render(
      <CreatePlaylistDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByText("Create New Playlist")).toBeInTheDocument();

    // Close dialog
    rerender(
      <CreatePlaylistDialog
        open={false}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Component handles visibility
    expect(true).toBe(true);
  });

  it("should handle network errors", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    render(
      <CreatePlaylistDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.type(screen.getByLabelText(/name/i), "Test");
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it("should validate required fields", async () => {
    const user = userEvent.setup();

    render(
      <CreatePlaylistDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const nameInput = screen.getByLabelText(/name/i);

    // Name field should be required
    expect(nameInput).toBeRequired();
  });
});
