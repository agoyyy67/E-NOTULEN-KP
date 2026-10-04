import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

// ── Skeleton base ────────────────────────────────────────────
interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Width, e.g. "100%", "120px", "w-full" (Tailwind) */
  width?: string;
  height?: string;
  rounded?: "sm" | "md" | "lg" | "full";
}

const roundedMap = {
  sm:   "rounded-[var(--radius-sm)]",
  md:   "rounded-[var(--radius-md)]",
  lg:   "rounded-[var(--radius-lg)]",
  full: "rounded-full",
};

export function Skeleton({ width, height, rounded = "md", className, style, ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Memuat..."
      className={cn("skeleton", roundedMap[rounded], className)}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}

// ── Skeleton preset: StatCard ─────────────────────────────────
export function StatCardSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-xs)]">
      <Skeleton width="48px" height="48px" rounded="lg" />
      <div className="flex-1">
        <Skeleton height="13px" width="60%" className="mb-2" />
        <Skeleton height="28px" width="40%" />
      </div>
    </div>
  );
}

// ── Skeleton preset: Table row & full table ────────────────────
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton height="14px" width={i === 0 ? "60%" : "80%"} />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 space-y-3 shadow-[var(--shadow-xs)]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-secondary-100 last:border-0">
          <Skeleton height="16px" width="35%" />
          <Skeleton height="16px" width="25%" />
          <Skeleton height="16px" width="20%" />
          <Skeleton height="16px" width="10%" />
        </div>
      ))}
    </div>
  );
}

// ── Skeleton preset: Page header ──────────────────────────────
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <Skeleton height="28px" width="200px" className="mb-2" />
        <Skeleton height="14px" width="140px" />
      </div>
      <Skeleton height="40px" width="140px" />
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────
interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "py-12 px-6",
        className,
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 p-4 rounded-full bg-secondary-100 text-secondary-400">
          {icon}
        </div>
      )}
      <h3 className="text-[16px] font-semibold text-secondary-700 mb-1">{title}</h3>
      {description && (
        <p className="text-[13px] text-secondary-400 mb-4 max-w-xs">{description}</p>
      )}
      {action}
    </div>
  );
}
