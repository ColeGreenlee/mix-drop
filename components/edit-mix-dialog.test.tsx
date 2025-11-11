import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditMixDialog } from "./edit-mix-dialog";
import { createMockMix } from "@/tests/utils/test-factories";

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

describe("EditMixDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockMix = createMockMix({
    id: "mix-123",
    title: "Original Title",
    artist: "Original Artist",
    description: "Original description",
    isPublic: true,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render when open is true", () => {
    render(
      <EditMixDialog
        mix={mockMix}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByText("Edit Mix")).toBeInTheDocument();
  });

  it("should not render when open is false", () => {
    render(
      <EditMixDialog
        mix={mockMix}
        open={false}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.queryByText("Edit Mix")).not.toBeInTheDocument();
  });

  it("should populate form with existing mix data", () => {
    render(
      <EditMixDialog
        mix={mockMix}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByDisplayValue("Original Title")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Original Artist")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Original description")).toBeInTheDocument();
  });

  it("should allow editing title", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ mix: { ...mockMix, title: "New Title" } }),
    });

    render(
      <EditMixDialog
        mix={mockMix}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    await user.clear(titleInput);
    await user.type(titleInput, "New Title");

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/mixes/mix-123`,
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("New Title"),
        })
      );
    });
  });

  it("should allow editing artist", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ mix: mockMix }),
    });

    render(
      <EditMixDialog
        mix={mockMix}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const artistInput = screen.getByLabelText(/artist/i);
    await user.clear(artistInput);
    await user.type(artistInput, "New Artist");

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("New Artist"),
        })
      );
    });
  });

  it("should toggle public/private", async () => {
    const user = userEvent.setup();

    render(
      <EditMixDialog
        mix={mockMix}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const publicSwitch = screen.getByRole("switch");

    // Initially should be checked (isPublic: true)
    expect(publicSwitch).toBeChecked();

    await user.click(publicSwitch);

    expect(publicSwitch).not.toBeChecked();
  });

  it("should display error on failed update", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Update failed" }),
    });

    render(
      <EditMixDialog
        mix={mockMix}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/update failed/i)).toBeInTheDocument();
    });
  });

  it("should disable save button while saving", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 1000))
    );

    render(
      <EditMixDialog
        mix={mockMix}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    expect(saveButton).toBeDisabled();
  });

  it("should call onSuccess after successful update", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ mix: mockMix }),
    });

    render(
      <EditMixDialog
        mix={mockMix}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("should handle empty description", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ mix: mockMix }),
    });

    render(
      <EditMixDialog
        mix={mockMix}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const descriptionInput = screen.getByLabelText(/description/i);
    await user.clear(descriptionInput);

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it("should close dialog on cancel", async () => {
    const user = userEvent.setup();

    render(
      <EditMixDialog
        mix={mockMix}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
