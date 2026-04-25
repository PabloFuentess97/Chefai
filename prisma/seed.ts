import { PrismaClient, Role, BillingInterval } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ---------- Settings (singleton) ----------
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      brandName: process.env.BRAND_NAME ?? "ChefAI",
      brandTagline: "Recetas con IA en segundos",
      brandColor: "#16a34a",
      supportEmail: process.env.SUPPORT_EMAIL ?? "hola@chefai.app",
    },
  });

  // ---------- Plans ----------
  const plans = [
    {
      slug: "free",
      name: "Free",
      description: "Pruébalo sin compromiso. 3 recetas al mes.",
      priceCents: 0,
      currency: "EUR",
      interval: BillingInterval.MONTH,
      recipesPerMonth: 3,
      imagesEnabled: false,
      imageQuality: "low",
      pdfExport: false,
      shoppingList: false,
      weeklyPlanner: false,
      prioritySupport: false,
      sortOrder: 0,
    },
    {
      slug: "pro",
      name: "Pro",
      description: "Para entusiastas de la cocina. 50 recetas con imagen, menús y PDF.",
      priceCents: 990,
      currency: "EUR",
      interval: BillingInterval.MONTH,
      recipesPerMonth: 50,
      imagesEnabled: true,
      imageQuality: "standard",
      pdfExport: true,
      shoppingList: true,
      weeklyPlanner: false,
      mealPlanner: true,
      prioritySupport: false,
      sortOrder: 1,
    },
    {
      slug: "chef",
      name: "Chef",
      description:
        "Sin límites. Imágenes HD, menús semanales y soporte prioritario.",
      priceCents: 2490,
      currency: "EUR",
      interval: BillingInterval.MONTH,
      recipesPerMonth: -1,
      imagesEnabled: true,
      imageQuality: "hd",
      pdfExport: true,
      shoppingList: true,
      weeklyPlanner: true,
      mealPlanner: true,
      prioritySupport: true,
      sortOrder: 2,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }

  // ---------- Admin user ----------
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@chefai.app";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMeNow1234!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN },
    create: {
      email: adminEmail,
      passwordHash,
      name: "Admin",
      role: Role.ADMIN,
      emailVerifiedAt: new Date(),
    },
  });

  console.log("Seed completed:");
  console.log(`  - Settings (singleton)`);
  console.log(`  - Plans: ${plans.map((p) => p.slug).join(", ")}`);
  console.log(`  - Admin: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
