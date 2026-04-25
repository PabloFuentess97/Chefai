import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { UsersTable } from "@/components/admin/users-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FREE_PLAN_SLUG } from "@/lib/plans";

export const metadata = { title: "Admin · Usuarios" };

const PAGE_SIZE = 30;

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function AdminUsersPage({ searchParams }: Props) {
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);

  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [usersRaw, total, freePlan] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        subscription: { include: { plan: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.plan.findUnique({ where: { slug: FREE_PLAN_SLUG } }),
  ]);

  const users = usersRaw.map((u) => {
    const sub = u.subscription;
    const isActive =
      sub &&
      (sub.status === "ACTIVE" || sub.status === "TRIALING") &&
      sub.currentPeriodEnd > new Date();
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      emailVerifiedAt: u.emailVerifiedAt,
      planName: isActive && sub ? sub.plan.name : (freePlan?.name ?? "Free"),
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Usuarios
        </h1>
        <p className="text-muted-foreground">{total} usuarios en total.</p>
      </div>

      <form className="flex gap-2 max-w-md">
        <Input
          name="q"
          placeholder="Buscar por email o nombre"
          defaultValue={q}
        />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <UsersTable users={users} />
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            const active = p === pageNum;
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            params.set("page", String(p));
            return (
              <Button
                key={p}
                size="sm"
                variant={active ? "default" : "outline"}
                render={<Link href={`/admin/users?${params}`} />}
              >
                {p}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
