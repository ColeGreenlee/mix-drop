import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { cacheGet, cacheSet, CacheKeys } from "@/lib/cache";
import { CACHE_TTL } from "@/lib/constants";

// GET /api/settings/public - Get public settings (no auth required)
export async function GET() {
  try {
    // Try cache first
    const cacheKey = CacheKeys.publicSettings();
    const cached = await cacheGet<Record<string, string>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch from database - only return public settings
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: ["site_name"], // Only expose public settings
        },
      },
      select: {
        key: true,
        value: true,
      },
    });

    // Convert to key-value object
    const settingsObject = settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, string>
    );

    // Add defaults for missing settings
    const publicSettings = {
      site_name: settingsObject.site_name || "MixDrop",
    };

    // Cache for 5 minutes
    await cacheSet(cacheKey, publicSettings, CACHE_TTL.PUBLIC_SETTINGS);

    return NextResponse.json(publicSettings);
  } catch (error) {
    logError(error, { operation: "fetch_public_settings" });
    // Return defaults on error
    return NextResponse.json({ site_name: "MixDrop" });
  }
}
