import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { logError } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { cacheDelete, CacheKeys } from "@/lib/cache";

// GET /api/admin/settings - Get all settings
export async function GET() {
  try {
    await requireAdmin();

    const settings = await prisma.siteSetting.findMany({
      orderBy: { key: "asc" },
    });

    // Convert to key-value object for easier consumption
    const settingsObject = settings.reduce(
      (acc, setting) => {
        acc[setting.key] = {
          value: setting.value,
          description: setting.description,
          updatedAt: setting.updatedAt,
        };
        return acc;
      },
      {} as Record<string, { value: string; description: string | null; updatedAt: Date }>
    );

    return NextResponse.json({ settings: settingsObject, raw: settings });
  } catch (error) {
    logError(error, { operation: "fetch_settings" });
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/settings - Update settings
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const updates = await req.json();

    // updates should be an object like: { allow_registrations: "true", site_name: "My MixDrop" }
    const results = [];

    for (const [key, value] of Object.entries(updates)) {
      const setting = await prisma.siteSetting.upsert({
        where: { key },
        update: {
          value: String(value),
          updatedBy: session.user.id,
        },
        create: {
          key,
          value: String(value),
          updatedBy: session.user.id,
        },
      });

      // Audit log
      await createAuditLog(AUDIT_ACTIONS.SETTING_UPDATE, session.user.id, null, {
        settingKey: key,
        newValue: value,
      });

      results.push(setting);
    }

    // Invalidate public settings cache
    await cacheDelete(CacheKeys.publicSettings());

    return NextResponse.json({ success: true, updated: results });
  } catch (error) {
    logError(error, { operation: "update_settings" });
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
