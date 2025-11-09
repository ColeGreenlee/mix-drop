import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default admin user for local development
  const hashedPassword = await bcrypt.hash("admin", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@mixdrop.local" },
    update: {}, // Don't update if already exists
    create: {
      email: "admin@mixdrop.local",
      username: "admin",
      name: "Default Admin",
      hashedPassword: hashedPassword,
      role: "admin",
      status: "active",
      emailVerified: new Date(),
    },
  });

  console.log("✅ Created default admin user:");
  console.log("   Email:    admin@mixdrop.local");
  console.log("   Username: admin");
  console.log("   Password: admin");
  console.log("   Role:     admin");
  console.log("");
  console.log("⚠️  Change the default password in production!");
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
