import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_6px_18px_hsl(var(--primary)/.25)]">
        <span className="font-display text-base font-bold leading-none">F</span>
      </div>
      <div className="leading-none">
        <span className="block text-sm font-bold tracking-[0.12em] text-sidebar-foreground">FITNESS</span>
        <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[.24em] text-sidebar-foreground/45">Toolkit portal</span>
      </div>
    </div>
  );
}
