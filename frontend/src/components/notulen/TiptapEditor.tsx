"use client";

import React, { useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextAlign } from "@tiptap/extension-text-align";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { CharacterCount } from "@tiptap/extension-character-count";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ListTodo,
  Table as TableIcon,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AutoSaveStatus } from "@/hooks/useAutoSave";

interface TiptapEditorProps {
  content?: Record<string, unknown> | string;
  onChange?: (content: Record<string, unknown>) => void;
  readOnly?: boolean;
  autoSaveStatus?: AutoSaveStatus;
  lastSavedAt?: Date | null;
  onManualSave?: () => void;
  className?: string;
}

/**
 * Safely parse content parameter into a Tiptap-compatible JSON document object or string.
 * Handles nested/double stringified JSON from PostgreSQL / Go backend.
 */
function parseTiptapContent(raw: any): any {
  if (!raw) return { type: "doc", content: [] };
  let parsed = raw;
  while (typeof parsed === "string") {
    try {
      const result = JSON.parse(parsed);
      if (typeof result === "string" || (typeof result === "object" && result !== null)) {
        parsed = result;
      } else {
        break;
      }
    } catch {
      break; // Stop if it's HTML string or unparseable plain text
    }
  }
  return parsed;
}

export function TiptapEditor({
  content,
  onChange,
  readOnly = false,
  autoSaveStatus = "idle",
  lastSavedAt,
  onManualSave,
  className,
}: TiptapEditorProps) {
  const initialParsedContent = useMemo(() => parseTiptapContent(content), [content]);
  const loadedContentRef = React.useRef<string>(JSON.stringify(initialParsedContent));
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Esc key listener & body scroll lock for Fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CharacterCount,
    ],
    editorProps: {
      attributes: {
        class:
          "focus:outline-none min-h-[300px] cursor-text max-w-none p-4 sm:p-6",
      },
    },
    content: initialParsedContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (onChange) {
        const json = editor.getJSON();
        loadedContentRef.current = JSON.stringify(json);
        // Ensure pure plain object for Next.js Server Action serialization
        onChange(JSON.parse(JSON.stringify(json)) as Record<string, unknown>);
      }
    },
  });

  // Sync content only if changed externally (e.g. initial load or switching document ID)
  useEffect(() => {
    if (editor && content) {
      const parsed = parseTiptapContent(content);
      const parsedStr = JSON.stringify(parsed);

      // Only set content if this is a genuine external update, avoiding reset during focus loss / button click
      if (loadedContentRef.current !== parsedStr && !editor.isFocused) {
        editor.commands.setContent(parsed);
        loadedContentRef.current = parsedStr;
      }
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="h-64 border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 flex items-center justify-center text-secondary-400">
        <RefreshCw size={20} className="animate-spin mr-2" />
        Memuat Editor...
      </div>
    );
  }

  const wordCount = editor.storage.characterCount?.words() ?? 0;
  const charCount = editor.storage.characterCount?.characters() ?? 0;

  return (
    <div
      className={cn(
        "flex flex-col bg-white overflow-hidden transition-all",
        isFullscreen
          ? "fixed inset-0 z-[9999] w-screen h-screen bg-slate-100/95 overflow-hidden flex flex-col"
          : "border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)]",
        !readOnly && !isFullscreen && "focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20",
        className,
      )}
    >
      {/* Editor Toolbar (Edit Mode Only) */}
      {!readOnly && (
        <div className={cn(
          "flex flex-wrap items-center justify-between gap-1 p-2.5 border-b border-[var(--color-border)] shrink-0",
          isFullscreen
            ? "sticky top-0 z-10 bg-white/95 backdrop-blur-sm shadow-sm"
            : "bg-secondary-50",
        )}>
          {/* Formatting tools */}
          <div className="flex items-center flex-wrap gap-0.5">
            {/* Text styles */}
            <ToolbarButton
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Cetak Tebal (Ctrl+B)"
            >
              <Bold size={16} />
            </ToolbarButton>

            <ToolbarButton
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Cetak Miring (Ctrl+I)"
            >
              <Italic size={16} />
            </ToolbarButton>

            <ToolbarButton
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Coret Teks"
            >
              <Strikethrough size={16} />
            </ToolbarButton>

            <div className="w-[1px] h-5 bg-secondary-300 mx-1" aria-hidden="true" />

            {/* Headings */}
            <ToolbarButton
              active={editor.isActive("heading", { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Judul Utama (H1)"
            >
              <Heading1 size={16} />
            </ToolbarButton>

            <ToolbarButton
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Sub-Judul (H2)"
            >
              <Heading2 size={16} />
            </ToolbarButton>

            <ToolbarButton
              active={editor.isActive("heading", { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              title="Sub Sub-Judul (H3)"
            >
              <Heading3 size={16} />
            </ToolbarButton>

            <div className="w-[1px] h-5 bg-secondary-300 mx-1" aria-hidden="true" />

            {/* Text Alignment */}
            <ToolbarButton
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              title="Rata Kiri"
            >
              <AlignLeft size={16} />
            </ToolbarButton>

            <ToolbarButton
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              title="Rata Tengah"
            >
              <AlignCenter size={16} />
            </ToolbarButton>

            <ToolbarButton
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              title="Rata Kanan"
            >
              <AlignRight size={16} />
            </ToolbarButton>

            <ToolbarButton
              active={editor.isActive({ textAlign: "justify" })}
              onClick={() => editor.chain().focus().setTextAlign("justify").run()}
              title="Rata Kanan Kiri (Justify)"
            >
              <AlignJustify size={16} />
            </ToolbarButton>

            <div className="w-[1px] h-5 bg-secondary-300 mx-1" aria-hidden="true" />

            {/* Lists & Task List */}
            <ToolbarButton
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Daftar Simbol"
            >
              <List size={16} />
            </ToolbarButton>

            <ToolbarButton
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Daftar Angka"
            >
              <ListOrdered size={16} />
            </ToolbarButton>

            <ToolbarButton
              active={editor.isActive("taskList")}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              title="Daftar Centang / Checklist"
            >
              <ListTodo size={16} />
            </ToolbarButton>

            <ToolbarButton
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Kutipan Teks"
            >
              <Quote size={16} />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Garis Pemisah"
            >
              <Minus size={16} />
            </ToolbarButton>

            <div className="w-[1px] h-5 bg-secondary-300 mx-1" aria-hidden="true" />

            {/* Table Tools */}
            <ToolbarButton
              active={editor.isActive("table")}
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
              title="Sisipkan Tabel (3x3)"
            >
              <TableIcon size={16} />
            </ToolbarButton>

            {editor.isActive("table") && (
              <>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  className="px-1.5 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded flex items-center gap-0.5 border border-emerald-200"
                  title="Tambah Baris"
                >
                  <Plus size={11} /> Baris
                </button>

                <button
                  type="button"
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  className="px-1.5 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded flex items-center gap-0.5 border border-emerald-200"
                  title="Tambah Kolom"
                >
                  <Plus size={11} /> Kolom
                </button>

                <button
                  type="button"
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  className="px-1.5 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 rounded flex items-center gap-0.5 border border-rose-200"
                  title="Hapus Tabel"
                >
                  <Trash2 size={11} /> Hapus
                </button>
              </>
            )}

            <div className="w-[1px] h-5 bg-secondary-300 mx-1" aria-hidden="true" />

            {/* Undo / Redo */}
            <ToolbarButton
              disabled={!editor.can().undo()}
              onClick={() => editor.chain().focus().undo().run()}
              title="Batal (Ctrl+Z)"
            >
              <Undo size={16} />
            </ToolbarButton>

            <ToolbarButton
              disabled={!editor.can().redo()}
              onClick={() => editor.chain().focus().redo().run()}
              title="Ulangi (Ctrl+Y)"
            >
              <Redo size={16} />
            </ToolbarButton>
          </div>

          {/* Auto-Save, Word Count & Manual Save Indicator */}
          <div className="flex items-center gap-3 px-2 text-xs font-medium">
            <span className="text-[11px] text-secondary-500 hidden sm:inline">
              {wordCount} kata | {charCount} karakter
            </span>

            <AutoSaveBadge status={autoSaveStatus} lastSavedAt={lastSavedAt} />

            {onManualSave && (
              <button
                type="button"
                onClick={onManualSave}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-secondary-200 hover:bg-secondary-300 text-secondary-800 transition-colors text-[11px] font-semibold cursor-pointer"
                title="Simpan Sekarang (Ctrl+S)"
              >
                <Save size={13} />
                <span>Simpan</span>
              </button>
            )}

            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer border",
                isFullscreen
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
                  : "bg-white hover:bg-secondary-100 text-secondary-700 border-secondary-300 shadow-xs"
              )}
              title={isFullscreen ? "Keluar Mode Layar Penuh (Esc)" : "Mode Layar Penuh (Fullscreen)"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 size={13} />
                  <span className="hidden sm:inline">Keluar Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 size={13} />
                  <span className="hidden sm:inline">Layar Penuh</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Editor Content Box (Centered Paper view in Fullscreen mode) */}
      <div
        className={cn(
          "flex-1 focus:outline-none transition-all cursor-text",
          isFullscreen
            ? "overflow-y-auto p-4 sm:p-8 bg-slate-100/90 flex justify-center"
            : "p-0 max-w-none"
        )}
        onClick={() => {
          if (!readOnly && editor && !editor.isFocused) {
            editor.chain().focus().run();
          }
        }}
      >
        <div
          className={cn(
            "w-full transition-all cursor-text",
            isFullscreen
              ? "max-w-4xl bg-white p-6 sm:p-12 rounded-2xl border border-slate-200/90 shadow-xl min-h-[calc(100vh-140px)] focus-within:ring-2 focus-within:ring-emerald-500/20"
              : !readOnly
              ? "min-h-[320px] max-h-[600px] overflow-y-auto cursor-text"
              : "min-h-[120px]"
          )}
          onClick={() => {
            if (!readOnly && editor && !editor.isFocused) {
              editor.chain().focus().run();
            }
          }}
        >
          <EditorContent editor={editor} className="cursor-text min-h-[300px]" />
        </div>
      </div>
    </div>
  );
}

// ── Toolbar Button Helper ────────────────────────────────────
function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "p-1.5 rounded transition-colors text-secondary-700",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        active
          ? "bg-primary-600 text-white font-semibold shadow-xs"
          : "hover:bg-secondary-200 hover:text-secondary-900",
      )}
    >
      {children}
    </button>
  );
}

// ── Auto Save Status Badge Helper ─────────────────────────────
function AutoSaveBadge({
  status,
  lastSavedAt,
}: {
  status: AutoSaveStatus;
  lastSavedAt?: Date | null;
}) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-primary-600 animate-pulse">
        <RefreshCw size={13} className="animate-spin" />
        <span>Menyimpan...</span>
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-[var(--color-success)] font-semibold">
        <CheckCircle2 size={13} />
        <span>Tersimpan</span>
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-[var(--color-error)] font-semibold">
        <AlertCircle size={13} />
        <span>Gagal menyimpan</span>
      </span>
    );
  }

  if (lastSavedAt) {
    const formattedTime = lastSavedAt.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <span className="text-secondary-400 text-[11px]">
        Tersimpan {formattedTime} WIB
      </span>
    );
  }

  return null;
}
