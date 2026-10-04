import { cn } from "@/lib/utils";
import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

// ── Shared label / helper / error ────────────────────────────
export interface FormFieldProps {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  required?: boolean;
  fieldId: string; // renamed from `id` to avoid collision with HTML element's id
}

function FormLabel({ fieldId, label, required }: { fieldId: string; label?: string; required?: boolean }) {
  if (!label) return null;
  return (
    <label htmlFor={fieldId} className="block text-[13px] font-medium text-secondary-700 mb-1.5">
      {label}
      {required && <span className="text-[var(--color-error)] ml-0.5" aria-hidden="true">*</span>}
    </label>
  );
}

function FormHelper({ helperText, errorMessage }: { helperText?: string; errorMessage?: string }) {
  if (errorMessage) {
    return <p className="mt-1.5 text-[12px] text-[var(--color-error)]">{errorMessage}</p>;
  }
  if (helperText) {
    return <p className="mt-1.5 text-[12px] text-secondary-400">{helperText}</p>;
  }
  return null;
}

// ── Base input classes ───────────────────────────────────────
function baseInputClass(hasError: boolean, size: "md" | "lg" = "md") {
  return cn(
    "w-full bg-white text-secondary-900 placeholder:text-secondary-400",
    "border rounded-[var(--radius-md)] transition-all duration-150",
    "focus:outline-none focus:ring-[3px]",
    hasError
      ? "border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[color:var(--color-error)]/20"
      : "border-[var(--color-border)] focus:border-[var(--color-border-focus)] focus:ring-primary-500/20",
    "disabled:bg-secondary-50 disabled:text-secondary-400 disabled:cursor-not-allowed",
    size === "lg" ? "h-12 px-4 text-[15px]" : "h-10 px-3 text-[14px]",
  );
}

// ── Input ────────────────────────────────────────────────────
type InputSize = "md" | "lg";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "size"> {
  fieldId: string;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  size?: InputSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      fieldId,
      label,
      helperText,
      errorMessage,
      required,
      size = "md",
      leftIcon,
      rightIcon,
      className,
      ...props
    },
    ref,
  ) => {
    const hasError = Boolean(errorMessage);
    return (
      <div className="flex flex-col">
        <FormLabel fieldId={fieldId} label={label} required={required} />
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none z-10 flex items-center justify-center">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={fieldId}
            required={required}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
            className={cn(
              baseInputClass(hasError, size),
              leftIcon  && "pl-9",
              rightIcon && "pr-9",
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none z-10 flex items-center justify-center">
              {rightIcon}
            </span>
          )}
        </div>
        <FormHelper helperText={helperText} errorMessage={errorMessage} />
      </div>
    );
  },
);
Input.displayName = "Input";

// ── Select ───────────────────────────────────────────────────
interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "size"> {
  fieldId: string;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  size?: InputSize;
  placeholder?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ fieldId, label, helperText, errorMessage, required, size = "md", placeholder, options, className, ...props }, ref) => {
    const hasError = Boolean(errorMessage);
    return (
      <div className="flex flex-col">
        <FormLabel fieldId={fieldId} label={label} required={required} />
        <select
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={hasError}
          className={cn(
            baseInputClass(hasError, size),
            "appearance-none cursor-pointer pr-9",
            // custom dropdown arrow via background-image
            "bg-no-repeat bg-[right_12px_center] bg-[length:16px_16px]",
            className,
          )}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          }}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <FormHelper helperText={helperText} errorMessage={errorMessage} />
      </div>
    );
  },
);
Select.displayName = "Select";

// ── Textarea ─────────────────────────────────────────────────
interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  fieldId: string;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  rows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ fieldId, label, helperText, errorMessage, required, rows = 4, className, ...props }, ref) => {
    const hasError = Boolean(errorMessage);
    return (
      <div className="flex flex-col">
        <FormLabel fieldId={fieldId} label={label} required={required} />
        <textarea
          ref={ref}
          id={fieldId}
          required={required}
          rows={rows}
          aria-invalid={hasError}
          className={cn(
            "w-full bg-white text-secondary-900 placeholder:text-secondary-400",
            "border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px]",
            "transition-all duration-150 resize-y min-h-[80px]",
            "focus:outline-none focus:ring-[3px]",
            hasError
              ? "border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[color:var(--color-error)]/20"
              : "border-[var(--color-border)] focus:border-[var(--color-border-focus)] focus:ring-primary-500/20",
            "disabled:bg-secondary-50 disabled:text-secondary-400 disabled:cursor-not-allowed",
            className,
          )}
          {...props}
        />
        <FormHelper helperText={helperText} errorMessage={errorMessage} />
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
