import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Combobox({ options, value, onChange, placeholder = "Pilih...", className, disabled }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = query === "" 
    ? options 
    : options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-white text-left px-3 py-2.5 text-[14px] border rounded-[var(--radius-md)] flex items-center justify-between",
          "transition-all duration-150 focus:outline-none focus:ring-[3px]",
          isOpen ? "border-[var(--color-border-focus)] ring-primary-500/20" : "border-[var(--color-border)]",
          disabled && "bg-secondary-50 text-secondary-400 cursor-not-allowed"
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-secondary-400")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className="text-secondary-400 ml-2 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-secondary-200 rounded-md shadow-lg py-1 max-h-96 overflow-hidden flex flex-col">
          <div className="px-2 pb-2 pt-1 sticky top-0 bg-white border-b border-secondary-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary-400" />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-secondary-200 rounded-md focus:outline-none focus:border-primary-500"
                placeholder="Cari OPD..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-auto flex-1 h-full max-h-[300px]">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-secondary-500 text-center">Tidak ditemukan.</div>
            ) : (
              <ul className="text-sm">
                {filteredOptions.map((option) => (
                  <li
                    key={option.value}
                    className={cn(
                      "px-3 py-2 cursor-pointer hover:bg-primary-50 flex items-start justify-between",
                      value === option.value && "bg-primary-50 text-primary-700 font-medium"
                    )}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="whitespace-normal break-words leading-snug pr-2 text-left">{option.label}</span>
                    {value === option.value && <Check size={14} className="text-primary-600 shrink-0 ml-auto mt-0.5" />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
