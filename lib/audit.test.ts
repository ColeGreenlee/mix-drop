import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma - MUST be hoisted before imports
vi.mock("./prisma", () => ({
  default: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

// Mock logger - MUST be hoisted before imports
vi.mock("./logger", () => ({
  logger: {
    info: vi.fn(),
  },
  logError: vi.fn(),
}));

import { createAuditLog, AUDIT_ACTIONS } from "./audit";
import prisma from "./prisma";
import { logger, logError } from "./logger";

const mockCreate = (prisma.auditLog.create as any);
const mockLogger = logger;
const mockLogError = logError as any;

describe("audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createAuditLog", () => {
    it("should create audit log entry", async () => {
      mockCreate.mockResolvedValueOnce({
        id: "audit-1",
        action: "user.role.change",
        actorId: "user-1",
        targetId: "user-2",
        details: JSON.stringify({ oldRole: "user", newRole: "admin" }),
        createdAt: new Date(),
      });

      await createAuditLog(
        AUDIT_ACTIONS.USER_ROLE_CHANGE,
        "user-1",
        "user-2",
        { oldRole: "user", newRole: "admin" }
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          action: "user.role.change",
          actorId: "user-1",
          targetId: "user-2",
          details: JSON.stringify({ oldRole: "user", newRole: "admin" }),
        },
      });
    });

    it("should log info message after creating audit log", async () => {
      mockCreate.mockResolvedValueOnce({});

      await createAuditLog(
        AUDIT_ACTIONS.USER_STATUS_CHANGE,
        "admin-1",
        "user-1",
        { oldStatus: "active", newStatus: "suspended" }
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          audit: {
            action: "user.status.change",
            actorId: "admin-1",
            targetId: "user-1",
            details: { oldStatus: "active", newStatus: "suspended" },
          },
        },
        "Audit: user.status.change"
      );
    });

    it("should handle audit log without targetId", async () => {
      mockCreate.mockResolvedValueOnce({});

      await createAuditLog(
        AUDIT_ACTIONS.SETTING_UPDATE,
        "admin-1",
        null,
        { setting: "siteName", value: "MixDrop" }
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          action: "setting.update",
          actorId: "admin-1",
          targetId: null,
          details: JSON.stringify({ setting: "siteName", value: "MixDrop" }),
        },
      });
    });

    it("should handle audit log without details", async () => {
      mockCreate.mockResolvedValueOnce({});

      await createAuditLog(AUDIT_ACTIONS.MIX_DELETE, "admin-1", "mix-1");

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          action: "mix.delete",
          actorId: "admin-1",
          targetId: "mix-1",
          details: null,
        },
      });
    });

    it("should not throw error if audit log creation fails", async () => {
      mockCreate.mockRejectedValueOnce(new Error("Database error"));

      // Should not throw
      await expect(
        createAuditLog(AUDIT_ACTIONS.USER_DELETE, "admin-1", "user-1")
      ).resolves.toBeUndefined();

      expect(mockLogError).toHaveBeenCalled();
    });

    it("should log error if audit log creation fails", async () => {
      const error = new Error("Database error");
      mockCreate.mockRejectedValueOnce(error);

      await createAuditLog(AUDIT_ACTIONS.USER_DELETE, "admin-1", "user-1");

      expect(mockLogError).toHaveBeenCalledWith(error, {
        audit: {
          action: "user.delete",
          actorId: "admin-1",
          targetId: "user-1",
        },
      });
    });

    it("should handle missing targetId parameter", async () => {
      mockCreate.mockResolvedValueOnce({});

      await createAuditLog(AUDIT_ACTIONS.SETTING_UPDATE, "admin-1");

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          action: "setting.update",
          actorId: "admin-1",
          targetId: null,
          details: null,
        },
      });
    });
  });

  describe("AUDIT_ACTIONS", () => {
    it("should have all expected action types", () => {
      expect(AUDIT_ACTIONS.USER_ROLE_CHANGE).toBe("user.role.change");
      expect(AUDIT_ACTIONS.USER_STATUS_CHANGE).toBe("user.status.change");
      expect(AUDIT_ACTIONS.USER_DELETE).toBe("user.delete");
      expect(AUDIT_ACTIONS.MIX_DELETE).toBe("mix.delete");
      expect(AUDIT_ACTIONS.PLAYLIST_DELETE).toBe("playlist.delete");
      expect(AUDIT_ACTIONS.SETTING_UPDATE).toBe("setting.update");
    });

    it("should use consistent naming pattern", () => {
      Object.values(AUDIT_ACTIONS).forEach((action) => {
        // Format: resource.action
        expect(action).toMatch(/^[a-z]+\.[a-z.]+$/);
      });
    });

    it("should not have duplicate values", () => {
      const values = Object.values(AUDIT_ACTIONS);
      const uniqueValues = new Set(values);

      expect(uniqueValues.size).toBe(values.length);
    });
  });
});
