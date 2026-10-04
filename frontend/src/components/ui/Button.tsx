import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";

// ── Types ────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type ButtonSize    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Render as square icon-only button */
  iconOnly?: boolean;
}

// ── Style maps ───────────────────────────────────────────────
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-600 text-white shadow-[var(--shadow-xs)] " +
    "hover:bg-primary-700 hover:-translate-y-px hover:shadow-[var(--shadow-sm)] " +
    "active:bg-primary-800 active:translate-y-0 " +
    "disabled:bg-secondary-200 disabled:text-secondary-400 disabled:shadow-none disabled:translate-y-0",
  secondary:
    "bg-white text-secondary-700 border border-[var(--color-border)] " +
    "hover:bg-secondary-50 hover:border-secondary-300 " +
    "active:bg-secondary-100 " +
    "disabled:bg-secondary-50 disabled:text-secondary-300 disabled:border-secondary-200",
  outline:
    "bg-white text-secondary-700 border border-[var(--color-border)] " +
    "hover:bg-secondary-50 hover:border-secondary-300 " +
    "active:bg-secondary-100 " +
    "disabled:bg-secondary-50 disabled:text-secondary-300 disabled:border-secondary-200",
  danger:
    "bg-[var(--color-error)] text-white shadow-[var(--shadow-xs)] " +
    "hover:bg-[var(--color-error-dark)] hover:-translate-y-px hover:shadow-[var(--shadow-sm)] " +
    "active:translate-y-0 " +
    "disabled:bg-secondary-200 disabled:text-secondary-400 disabled:shadow-none",
  ghost:
    "bg-transparent text-secondary-600 " +
    "hover:bg-secondary-100 " +
    "active:bg-secondary-200 " +
    "disabled:text-secondary-300",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8  px-3   text-[13px] gap-1.5 rounded-[var(--radius-md)]",
  md: "h-10 px-5   text-[14px] gap-2   rounded-[var(--radius-md)]",
  lg: "h-12 px-6   text-[16px] gap-2   rounded-[var(--radius-md)]",
};

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: "h-8  w-8  rounded-[var(--radius-md)]",
  md: "h-10 w-10 rounded-[var(--radius-md)]",
  lg: "h-12 w-12 rounded-[var(--radius-md)]",
};

// ── Component ────────────────────────────────────────────────
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      iconOnly = false,
      className,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-semibold",
          "cursor-pointer select-none",
          "transition-all duration-150 ease-out",
          "focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed",
          variantClasses[variant],
          iconOnly ? iconSizeClasses[size] : sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={14} aria-hidden="true" />
            {!iconOnly && <span>Memuat...</span>}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
