import { cn } from "@/lib/utils";
import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

// ── Table Container ──────────────────────────────────────────
interface TableProps extends HTMLAttributes<HTMLDivElement> {
  /** Overflow scroll wrapper */
  responsive?: boolean;
}

export function Table({ responsive = true, className, children, ...props }: TableProps) {
  const table = (
    <table
      className={cn(
        "w-full border-collapse",
        "text-[14px] text-secondary-700",
        className,
      )}
      {...props}
    >
      {children}
    </table>
  );

  if (responsive) {
    return (
      <div
        className={cn(
          "w-full overflow-x-auto",
          "border border-[var(--color-border)]",
          "rounded-[var(--radius-lg)]",
          "shadow-[var(--shadow-xs)]",
        )}
      >
        {table}
      </div>
    );
  }
  return table;
}

// ── Table Head ───────────────────────────────────────────────
export function THead({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "bg-secondary-50 border-b border-[var(--color-border)]",
        className,
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

// ── Table Body ───────────────────────────────────────────────
export function TBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn(
        "divide-y divide-[var(--color-divider)]",
        "bg-white",
        className,
      )}
      {...props}
    >
      {children}
    </tbody>
  );
}

// ── Table Row ────────────────────────────────────────────────
interface TrProps extends HTMLAttributes<HTMLTableRowElement> {
  hoverable?: boolean;
}

export function Tr({ hoverable = true, className, children, ...props }: TrProps) {
  return (
    <tr
      className={cn(
        "transition-colors duration-100",
        hoverable && "hover:bg-primary-50/50",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

// ── Table Header Cell ────────────────────────────────────────
export function Th({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3",
        "text-[12px] font-semibold text-secondary-500",
        "uppercase tracking-wider",
        "text-left whitespace-nowrap",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

// ── Table Data Cell ──────────────────────────────────────────
export function Td({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-4 py-3 align-middle text-[14px] text-secondary-700", className)}
      {...props}
    >
      {children}
    </td>
  );
}

// ── Pagination ───────────────────────────────────────────────
interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, perPage, onPageChange }: PaginationProps) {
  const start = Math.min((page - 1) * perPage + 1, total);
  const end   = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-3 text-[13px] text-secondary-500">
      {/* Info */}
      <span>
        Menampilkan <strong className="text-secondary-700">{start}–{end}</strong> dari{" "}
        <strong className="text-secondary-700">{total}</strong> data
      </span>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <PagButton
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          aria-label="Halaman pertama"
        >
          «
        </PagButton>
        <PagButton
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Halaman sebelumnya"
        >
          ‹
        </PagButton>

        {/* Page numbers */}
        {generatePages(page, totalPages).map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 py-1 text-secondary-400">
              …
            </span>
          ) : (
            <PagButton
              key={p}
              onClick={() => onPageChange(p as number)}
              active={p === page}
              aria-label={`Halaman ${p}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </PagButton>
          ),
        )}

        <PagButton
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Halaman selanjutnya"
        >
          ›
        </PagButton>
        <PagButton
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          aria-label="Halaman terakhir"
        >
          »
        </PagButton>
      </div>
    </div>
  );
}

// ── Internal pagination button ───────────────────────────────
function PagButton({
  active,
  disabled,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "min-w-[32px] h-8 px-2 rounded-[var(--radius-md)]",
        "text-[13px] font-medium",
        "transition-colors duration-100",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        active
          ? "bg-primary-600 text-white"
          : "bg-white border border-[var(--color-border)] text-secondary-600 hover:bg-secondary-50",
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Generate page list with ellipsis ────────────────────────
function generatePages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
