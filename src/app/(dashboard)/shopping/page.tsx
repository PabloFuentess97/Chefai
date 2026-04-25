import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ShoppingList } from "@/components/dashboard/shopping-list";

export const metadata = { title: "Lista de la compra" };

export default async function ShoppingPage() {
  const user = await requireUser();
  const items = await prisma.shoppingListItem.findMany({
    where: { userId: user.id },
    orderBy: [{ isBought: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <Link
        href="/planner"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver al menú
      </Link>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Lista de la compra
        </h1>
        <p className="text-muted-foreground">
          Marca lo que vayas echando al carro. Las cantidades se suman
          automáticamente cuando añades el mismo ingrediente desde otra
          receta o menú.
        </p>
      </div>

      <ShoppingList
        initialItems={items.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          isBought: i.isBought,
        }))}
      />
    </div>
  );
}
