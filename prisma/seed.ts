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
      cookbookExport: false,
      shoppingList: true, // engagement
      weeklyPlanner: false,
      mealPlanner: false,
      voiceCooking: true, // engagement (no cuesta nada extra)
      fridgePhoto: false,
      substitutions: false,
      prioritySupport: false,
      sortOrder: 0,
    },
    {
      slug: "pro",
      name: "Pro",
      description:
        "Para entusiastas de la cocina. 50 recetas con imagen, menús y PDF.",
      priceCents: 990,
      currency: "EUR",
      interval: BillingInterval.MONTH,
      recipesPerMonth: 50,
      imagesEnabled: true,
      imageQuality: "standard",
      pdfExport: true,
      cookbookExport: true,
      shoppingList: true,
      weeklyPlanner: false,
      mealPlanner: true,
      voiceCooking: true,
      fridgePhoto: true,
      substitutions: true,
      prioritySupport: false,
      sortOrder: 1,
    },
    {
      slug: "chef",
      name: "Chef",
      description:
        "Sin límites. Imágenes HD, menús semanales y todo desbloqueado.",
      priceCents: 2490,
      currency: "EUR",
      interval: BillingInterval.MONTH,
      recipesPerMonth: -1,
      imagesEnabled: true,
      imageQuality: "hd",
      pdfExport: true,
      cookbookExport: true,
      shoppingList: true,
      weeklyPlanner: true,
      mealPlanner: true,
      voiceCooking: true,
      fridgePhoto: true,
      substitutions: true,
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
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Refuse to create an admin with placeholder, weak, or missing credentials.
  // Production deploys MUST provide real values, otherwise every install
  // would ship with a known-credential admin account.
  const PLACEHOLDER_PASSWORDS = new Set([
    "ChangeMeNow1234!",
    "replace-with-a-strong-password-min-16-chars",
    "changeme",
    "password",
    "admin",
  ]);

  if (
    !adminEmail ||
    !adminPassword ||
    adminPassword.length < 16 ||
    PLACEHOLDER_PASSWORDS.has(adminPassword) ||
    adminEmail === "admin@example.com" ||
    adminEmail === "admin@chefai.app"
  ) {
    console.warn(
      "\n⚠️  Skipping admin seed — ADMIN_EMAIL/ADMIN_PASSWORD missing or " +
        "still set to a placeholder/weak value. Set them to real values " +
        "in .env (password ≥16 chars, non-default) and re-run `pnpm db:seed`.\n"
    );
    console.log("Seed completed (no admin):");
    console.log(`  - Settings (singleton)`);
    console.log(`  - Plans: ${plans.map((p) => p.slug).join(", ")}`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 14);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN },
    create: {
      email: adminEmail,
      passwordHash,
      // Don't bake "Admin" into the display name — the dashboard greeting
      // will derive a friendlier fallback from the email local-part, and
      // the user can override from /settings.
      name: null,
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
