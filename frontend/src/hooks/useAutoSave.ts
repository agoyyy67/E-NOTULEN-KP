"use client";

/**
 * useAutoSave.ts — Auto-save hook for Tiptap Editor
 * Source: PRD Bagian VI.4 — Auto-Save Logic (debounce 2s + throttle 5s)
 *
 * Implements:
 * 1. Debounce 2 seconds after user stops typing
 * 2. Minimum 5-second interval between saves (throttle)
 * 3. Retry up to 3 times with exponential backoff on failure
 * 4. Status states: idle | saving | saved | error
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
  /** Called to persist the content. Should return a Promise. */
  onSave: (content: Record<string, unknown>) => Promise<void>;
  /** Debounce delay in ms (default: 2000) */
  debounceMs?: number;
  /** Minimum interval between saves in ms (default: 5000) */
  throttleMs?: number;
  /** Max retry attempts on failure (default: 3) */
  maxRetries?: number;
  /** Whether auto-save is enabled (false when notulen is in read-only view) */
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  /** Trigger a manual save immediately */
  saveNow: (content: Record<string, unknown>) => Promise<void>;
  /** Call this every time editor content changes */
  onContentChange: (content: Record<string, unknown>) => void;
}

export function useAutoSave({
  onSave,
  debounceMs = 2000,
  throttleMs = 5000,
  maxRetries = 3,
  enabled = true,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const debounceTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedTime     = useRef<number>(0);
  const pendingContent    = useRef<Record<string, unknown> | null>(null);
  const isSaving          = useRef(false);

  // ── Core save with retry ────────────────────────────────────
  const executeSave = useCallback(
    async (content: Record<string, unknown>) => {
      if (isSaving.current) return;
      isSaving.current = true;
      setStatus("saving");

      let attempt = 0;
      while (attempt <= maxRetries) {
        try {
          await onSave(content);
          setStatus("saved");
          setLastSavedAt(new Date());
          lastSavedTime.current = Date.now();

          // Auto-clear "saved" indicator after 3 seconds
          setTimeout(() => {
            setStatus((prev) => (prev === "saved" ? "idle" : prev));
          }, 3000);

          isSaving.current = false;
          return;
        } catch {
          attempt++;
          if (attempt > maxRetries) {
            setStatus("error");
            isSaving.current = false;
            return;
          }
          // Exponential backoff: 1s, 2s, 4s
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise((r) => setTimeout(r, backoffMs));
        }
      }
    },
    [onSave, maxRetries],
  );

  // ── Debounced content change handler ─────────────────────────
  const onContentChange = useCallback(
    (content: Record<string, unknown>) => {
      if (!enabled) return;

      pendingContent.current = content;

      // Clear previous debounce timer
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(() => {
        if (!pendingContent.current) return;

        const now = Date.now();
        const timeSinceLast = now - lastSavedTime.current;

        if (timeSinceLast >= throttleMs) {
          // Ready to save immediately
          executeSave(pendingContent.current);
          pendingContent.current = null;
        } else {
          // Schedule for when throttle window passes
          const waitMs = throttleMs - timeSinceLast;
          debounceTimer.current = setTimeout(() => {
            if (pendingContent.current) {
              executeSave(pendingContent.current);
              pendingContent.current = null;
            }
          }, waitMs);
        }
      }, debounceMs);
    },
    [enabled, debounceMs, throttleMs, executeSave],
  );

  // ── Manual save (Ctrl+S) ─────────────────────────────────────
  const saveNow = useCallback(
    async (content: Record<string, unknown>) => {
      if (!enabled) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      pendingContent.current = null;
      await executeSave(content);
    },
    [enabled, executeSave],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return { status, lastSavedAt, saveNow, onContentChange };
}
