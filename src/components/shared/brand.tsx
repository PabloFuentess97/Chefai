import Link from "next/link";
import { ChefHat } from "lucide-react";
import { getBranding } from "@/lib/branding";
import { cn } from "@/lib/utils";

export async function Brand({
  className,
  href = "/",
  showName = true,
}: {
  className?: string;
  href?: string;
  showName?: boolean;
}) {
  const branding = await getBranding();
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 font-semibold text-foreground",
        className
      )}
    >
      <span
        className="grid place-items-center rounded-lg size-8 text-white"
        style={{ backgroundColor: branding.color }}
        aria-hidden
      >
        {branding.logoUrl && branding.logoUrl !== "/logo.svg" ? (
          // Custom logo from settings
          <img
            src={branding.logoUrl}
            alt={branding.name}
            className="size-6 object-contain"
          />
        ) : (
          <ChefHat className="size-5" />
        )}
      </span>
      {showName && <span className="text-base">{branding.name}</span>}
    </Link>
  );
}
