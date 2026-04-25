import { requireAdmin } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { Brand } from "@/components/shared/brand";
import { getCurrentPlan } from "@/lib/plans";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const plan = await getCurrentPlan(user.id);

  return (
    <div className="flex min-h-svh bg-background">
      <Sidebar role={user.role} brand={<Brand />} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          email={user.email}
          name={user.name}
          planName={plan.name}
          role={user.role}
          brand={<Brand showName={false} />}
        />
        <main className="flex-1 px-4 py-5 md:px-6 md:py-8 pb-28 lg:pb-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileNav role={user.role} />
    </div>
  );
}
