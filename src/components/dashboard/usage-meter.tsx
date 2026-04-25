import { cn } from "@/lib/utils";

export function UsageMeter({
  used,
  limit,
}: {
  used: number;
  limit: number; // -1 = unlimited
}) {
  const unlimited = limit === -1;
  const ratio = unlimited ? 0 : Math.min(1, used / Math.max(1, limit));
  const tone =
    unlimited
      ? "primary"
      : ratio < 0.66
        ? "primary"
        : ratio < 0.9
          ? "warning"
          : "destructive";

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">Recetas este mes</span>
        <span className="text-muted-foreground">
          {used}
          {unlimited ? " · ilimitado" : ` / ${limit}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            tone === "primary" && "bg-primary",
            tone === "warning" && "bg-amber-500",
            tone === "destructive" && "bg-destructive"
          )}
          style={{ width: unlimited ? "12%" : `${Math.max(4, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}
