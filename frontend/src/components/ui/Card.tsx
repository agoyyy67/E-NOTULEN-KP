import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

// ── Types ────────────────────────────────────────────────────
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Show hover elevation + border color shift */
  hoverable?: boolean;
  /** Remove default padding on the outer card container */
  noPadding?: boolean;
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}
interface CardBodyProps   extends HTMLAttributes<HTMLDivElement> {}
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

// ── Card Container ───────────────────────────────────────────
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable = false, noPadding = false, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-white border border-[var(--color-border)]",
        "rounded-[var(--radius-lg)]",
        "shadow-[var(--shadow-xs)]",
        "transition-all duration-200 ease-out",
        !noPadding && "p-5 sm:p-6",
        hoverable && [
          "cursor-pointer",
          "hover:shadow-[var(--shadow-card-hover)]",
          "hover:border-primary-300",
          "hover:-translate-y-0.5",
        ],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
Card.displayName = "Card";

// ── Card Header ──────────────────────────────────────────────
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between gap-4",
        "pb-4 mb-4 border-b border-[var(--color-divider)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
CardHeader.displayName = "CardHeader";

// ── Card Body ────────────────────────────────────────────────
export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("flex-1", className)} {...props}>
      {children}
    </div>
  ),
);
CardBody.displayName = "CardBody";

// ── Card Footer ──────────────────────────────────────────────
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-end gap-3",
        "pt-4 mt-4 border-t border-[var(--color-divider)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
CardFooter.displayName = "CardFooter";

// ── Stat Card (Dashboard Widget) ─────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; direction: "up" | "down" | "neutral" };
  className?: string;
}

export function StatCard({ icon, label, value, trend, className }: StatCardProps) {
  const trendColor =
    trend?.direction === "up"
      ? "text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full"
      : trend?.direction === "down"
        ? "text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-full"
        : "text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full";

  const trendArrow =
    trend?.direction === "up" ? "↑" : trend?.direction === "down" ? "↓" : "→";

  return (
    <Card className={cn("flex items-center gap-3.5 hoverable p-4 sm:p-5", className)}>
      {/* Icon wrapper */}
      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-center",
          "w-11 h-11 rounded-xl",
          "bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs",
        )}
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 mb-0.5 truncate">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 leading-tight">
          {value}
        </p>
      </div>

      {/* Trend badge */}
      {trend && (
        <span className={cn("text-[11px] font-bold flex-shrink-0 whitespace-nowrap inline-flex items-center gap-0.5", trendColor)}>
          <span>{trendArrow}</span>
          <span>{Math.abs(trend.value)}%</span>
        </span>
      )}
    </Card>
  );
}
