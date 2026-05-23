"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getCurrentPlan, planHasFeature } from "@/lib/plans";
import type { ActionResult } from "@/types/session";

async function ensureShoppingEnabled(
  userId: string
): Promise<ActionResult<never> | null> {
  const plan = await getCurrentPlan(userId);
  if (!planHasFeature(plan, "shoppingList")) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "La lista de la compra está disponible en planes superiores",
      },
    };
  }
  return null;
}

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

type IngredientLike = {
  name: string;
  quantity: number;
  unit: string;
  optional?: boolean | null;
};

function normaliseKey(name: string, unit: string): string {
  return `${name.trim().toLowerCase()}::${unit.trim().toLowerCase()}`;
}

async function upsertItems(
  userId: string,
  ingredients: IngredientLike[],
  recipeId: string | null,
  servingsMultiplier: number = 1
): Promise<number> {
  const usable = ingredients.filter(
    (i) => !i.optional && i.quantity > 0 && i.name.trim()
  );

  // Existing unbought items for merging
  const existing = await prisma.shoppingListItem.findMany({
    where: { userId, isBought: false },
  });
  const byKey = new Map<string, (typeof existing)[number]>();
  for (const it of existing) byKey.set(normaliseKey(it.name, it.unit), it);

  let added = 0;
  for (const ing of usable) {
    const key = normaliseKey(ing.name, ing.unit);
    const qty = ing.quantity * servingsMultiplier;
    const found = byKey.get(key);
    if (found) {
      await prisma.shoppingListItem.update({
        where: { id: found.id },
        data: { quantity: found.quantity + qty },
      });
    } else {
      await prisma.shoppingListItem.create({
        data: {
          userId,
          name: ing.name.trim(),
          quantity: qty,
          unit: ing.unit.trim(),
          recipeId,
          isBought: false,
        },
      });
      added += 1;
    }
  }
  return added;
}

export async function addRecipeToShoppingListAction(
  recipeId: string
): Promise<ActionResult<{ added: number }>> {
  const user = await requireUser();
  const gate = await ensureShoppingEnabled(user.id);
  if (gate) return gate;
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { ingredients: { orderBy: { sortOrder: "asc" } } },
  });
  if (!recipe) {
    return fail("NOT_FOUND", "Receta no encontrada");
  }
  // Allow adding ingredients from any recipe the user can view (community pool)
  const added = await upsertItems(user.id, recipe.ingredients, recipeId, 1);
  revalidatePath("/shopping");
  return { ok: true, data: { added } };
}

export async function addPlanToShoppingListAction(
  planId: string
): Promise<ActionResult<{ added: number; recipesAdded: number }>> {
  const user = await requireUser();
  const gate = await ensureShoppingEnabled(user.id);
  if (gate) return gate;
  const plan = await prisma.mealPlan.findUnique({
    where: { id: planId },
    include: {
      items: {
        include: {
          recipe: {
            include: { ingredients: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
  });
  if (!plan || plan.userId !== user.id) {
    return fail("NOT_FOUND", "Menú no encontrado");
  }
  let totalAdded = 0;
  for (const item of plan.items) {
    // multiplier = item.servings / recipe.servings (rescale ingredients)
    const mult =
      item.recipe.servings > 0 ? item.servings / item.recipe.servings : 1;
    const added = await upsertItems(
      user.id,
      item.recipe.ingredients,
      item.recipe.id,
      mult
    );
    totalAdded += added;
  }
  revalidatePath("/shopping");
  return {
    ok: true,
    data: { added: totalAdded, recipesAdded: plan.items.length },
  };
}

export async function toggleShoppingItemAction(
  itemId: string
): Promise<ActionResult<{ isBought: boolean }>> {
  const user = await requireUser();
  const item = await prisma.shoppingListItem.findUnique({
    where: { id: itemId },
  });
  if (!item || item.userId !== user.id) {
    return fail("NOT_FOUND", "Item no encontrado");
  }
  const updated = await prisma.shoppingListItem.update({
    where: { id: itemId },
    data: { isBought: !item.isBought },
  });
  revalidatePath("/shopping");
  return { ok: true, data: { isBought: updated.isBought } };
}

export async function deleteShoppingItemAction(
  itemId: string
): Promise<ActionResult<{ deleted: true }>> {
  const user = await requireUser();
  const item = await prisma.shoppingListItem.findUnique({
    where: { id: itemId },
  });
  if (!item || item.userId !== user.id) {
    return fail("NOT_FOUND", "Item no encontrado");
  }
  await prisma.shoppingListItem.delete({ where: { id: itemId } });
  revalidatePath("/shopping");
  return { ok: true, data: { deleted: true } };
}

export async function clearBoughtItemsAction(): Promise<
  ActionResult<{ deleted: number }>
> {
  const user = await requireUser();
  const result = await prisma.shoppingListItem.deleteMany({
    where: { userId: user.id, isBought: true },
  });
  revalidatePath("/shopping");
  return { ok: true, data: { deleted: result.count } };
}

export async function clearAllShoppingItemsAction(): Promise<
  ActionResult<{ deleted: number }>
> {
  const user = await requireUser();
  const result = await prisma.shoppingListItem.deleteMany({
    where: { userId: user.id },
  });
  revalidatePath("/shopping");
  return { ok: true, data: { deleted: result.count } };
}

/**
 * Manually add a single item to the shopping list — for things the user
 * knows they need ("pan de molde", "papel cocina") that don't come from
 * any recipe. Deduplicates against existing unbought items the same way
 * recipe ingredients do: if the same (name+unit) already exists, sum
 * quantities rather than creating a duplicate row.
 */
export async function addManualShoppingItemAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const gate = await ensureShoppingEnabled(user.id);
  if (gate) return gate;

  const { addManualShoppingItemSchema } = await import("@/lib/validators");
  const parsed = addManualShoppingItemSchema.safeParse({
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(
      "VALIDATION",
      first?.message ?? "Datos no válidos"
    );
  }

  const { name, quantity, unit } = parsed.data;
  const cleanName = name.trim();
  const cleanUnit = unit.trim();

  // Look for an existing unbought item with the same (name, unit) and
  // sum quantities — same behavior as adding from a recipe.
  const existing = await prisma.shoppingListItem.findFirst({
    where: {
      userId: user.id,
      isBought: false,
      name: { equals: cleanName, mode: "insensitive" },
      unit: { equals: cleanUnit, mode: "insensitive" },
    },
  });

  let row;
  if (existing) {
    row = await prisma.shoppingListItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    row = await prisma.shoppingListItem.create({
      data: {
        userId: user.id,
        name: cleanName,
        quantity,
        unit: cleanUnit,
        isBought: false,
      },
    });
  }

  revalidatePath("/shopping");
  return { ok: true, data: { id: row.id } };
}
