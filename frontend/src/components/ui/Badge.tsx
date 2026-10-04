import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

// ── Types ────────────────────────────────────────────────────
type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

// ── Variant styles ───────────────────────────────────────────
const variantClasses: Record<BadgeVariant, string> = {
  default:
    "bg-secondary-100 text-secondary-700",
  primary:
    "bg-primary-100 text-primary-700",
  success:
    "bg-[var(--color-success-light)] text-[var(--color-success-dark)]",
  warning:
    "bg-[var(--color-warning-light)] text-[var(--color-warning-dark)]",
  danger:
    "bg-[var(--color-error-light)] text-[var(--color-error-dark)]",
  info:
    "bg-[var(--color-info-light)] text-[var(--color-info-dark)]",
};

// ── Status badge helpers — notulen status ────────────────────
type NotulenStatus = "draft" | "final" | "deleted";

const statusVariantMap: Record<NotulenStatus, BadgeVariant> = {
  draft:   "warning",
  final:   "success",
  deleted: "danger",
};

const statusLabelMap: Record<NotulenStatus, string> = {
  draft:   "Draft",
  final:   "Final",
  deleted: "Dihapus",
};

// ── Role badge helpers ───────────────────────────────────────
type UserRole = "admin" | "operator" | "officer";

const roleVariantMap: Record<UserRole, BadgeVariant> = {
  admin:    "primary",
  operator: "info",
  officer:  "default",
};

const roleLabelMap: Record<UserRole, string> = {
  admin:    "Super Admin",
  operator: "Operator OPD",
  officer:  "Pegawai",
};

// ── Badge component ──────────────────────────────────────────
export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        "rounded-[var(--radius-sm)] px-2.5 py-0.5",
        "text-[12px] font-medium leading-none",
        "whitespace-nowrap select-none",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// ── Convenience: Notulen Status Badge ───────────────────────
export function StatusBadge({ status }: { status: NotulenStatus }) {
  return (
    <Badge variant={statusVariantMap[status]}>
      {statusLabelMap[status]}
    </Badge>
  );
}

// ── Convenience: Role Badge ──────────────────────────────────
export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge variant={roleVariantMap[role]}>
      {roleLabelMap[role]}
    </Badge>
  );
}
