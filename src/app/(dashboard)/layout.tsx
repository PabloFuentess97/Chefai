import { requireUser } from "@/lib/auth";
import { getCurrentPlan } from "@/lib/plans";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { Brand } from "@/components/shared/brand";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const plan = await getCurrentPlan(user.id);

  return (
    <div className="flex min-h-svh bg-background">
      <Sidebar role={user.role} brand={<Brand />} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar email={user.email} name={user.name} planName={plan.name} />
        <main className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
