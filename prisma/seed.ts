import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");
  console.log("");
  console.log("ℹ️  MixDrop uses OAuth-only authentication.");
  console.log("");
  console.log("📝 To designate admin users:");
  console.log("   1. Set ADMIN_EMAILS environment variable with comma-separated emails");
  console.log("      Example: ADMIN_EMAILS=admin@example.com,other@example.com");
  console.log("");
  console.log("   2. OR: The first user to log in will automatically become admin");
  console.log("");
  console.log("🔑 Ensure your OAuth provider is configured with:");
  console.log("   - OAUTH_CLIENT_ID");
  console.log("   - OAUTH_CLIENT_SECRET");
  console.log("   - OAUTH_ISSUER");
  console.log("   - OAUTH_AUTHORIZATION_URL");
  console.log("   - OAUTH_TOKEN_URL");
  console.log("   - OAUTH_USERINFO_URL");
  console.log("");

  // Add any additional seed data here (e.g., default site settings)
  // Example:
  // await prisma.siteSetting.upsert({
  //   where: { key: "site_name" },
  //   update: {},
  //   create: { key: "site_name", value: "MixDrop" },
  // });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("🎉 Seeding completed successfully");
  })
  .catch(async (e) => {
    console.error("❌ Seeding error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
