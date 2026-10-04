"use server";

/**
 * actions/attendee.ts — Server Actions for Attendee (Daftar Hadir)
 * Source: PRD Bagian VI.3 — Daftar Hadir (3 columns only: Nama, Instansi, Jabatan)
 */

import type { Attendee, AttendeeInput } from "@/types/notulen";
import { sleep, generateId } from "@/lib/utils";
import { mockAttendees } from "@/lib/data/notulen";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const API_URL  = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

// ── Get attendees for a notulen ───────────────────────────────
export async function getAttendees(notulenId: string): Promise<Attendee[]> {
  if (USE_MOCK) {
    await sleep(200);
    return mockAttendees[notulenId] ?? [];
  }

  const res = await fetch(`${API_URL}/notulen/${notulenId}/attendees`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Gagal memuat daftar hadir");
  const json = await res.json();
  return json.data;
}

// ── Add attendee ──────────────────────────────────────────────
export async function addAttendee(
  notulenId: string,
  input: AttendeeInput,
): Promise<Attendee> {
  if (USE_MOCK) {
    await sleep(300);
    const existing = mockAttendees[notulenId] ?? [];
    const newAttendee: Attendee = {
      id: generateId(),
      notulen_id: notulenId,
      nama: input.nama,
      instansi: input.instansi,
      jabatan: input.jabatan,
      urutan: existing.length + 1,
    };
    mockAttendees[notulenId] = [...existing, newAttendee];
    return newAttendee;
  }

  const res = await fetch(`${API_URL}/notulen/${notulenId}/attendees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Gagal menambah peserta");
  const json = await res.json();
  return json.data;
}

// ── Update attendee ───────────────────────────────────────────
export async function updateAttendee(
  notulenId: string,
  attendeeId: string,
  input: Partial<AttendeeInput>,
): Promise<Attendee> {
  if (USE_MOCK) {
    await sleep(200);
    const list = mockAttendees[notulenId] ?? [];
    const idx  = list.findIndex((a) => a.id === attendeeId);
    if (idx === -1) throw new Error("Peserta tidak ditemukan");
    list[idx] = { ...list[idx], ...input };
    return list[idx];
  }

  const res = await fetch(
    `${API_URL}/notulen/${notulenId}/attendees/${attendeeId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) throw new Error("Gagal mengupdate peserta");
  const json = await res.json();
  return json.data;
}

// ── Delete attendee ───────────────────────────────────────────
export async function deleteAttendee(
  notulenId: string,
  attendeeId: string,
): Promise<void> {
  if (USE_MOCK) {
    await sleep(200);
    if (mockAttendees[notulenId]) {
      mockAttendees[notulenId] = mockAttendees[notulenId]
        .filter((a) => a.id !== attendeeId)
        .map((a, i) => ({ ...a, urutan: i + 1 }));
    }
    return;
  }

  const res = await fetch(
    `${API_URL}/notulen/${notulenId}/attendees/${attendeeId}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!res.ok) throw new Error("Gagal menghapus peserta");
}

// ── Reorder attendees (drag-and-drop) ────────────────────────
export async function reorderAttendees(
  notulenId: string,
  orderedIds: string[],
): Promise<void> {
  if (USE_MOCK) {
    await sleep(200);
    const list = mockAttendees[notulenId] ?? [];
    const reordered = orderedIds
      .map((id, idx) => {
        const a = list.find((x) => x.id === id);
        return a ? { ...a, urutan: idx + 1 } : null;
      })
      .filter(Boolean) as Attendee[];
    mockAttendees[notulenId] = reordered;
    return;
  }

  const res = await fetch(
    `${API_URL}/notulen/${notulenId}/attendees/reorder`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ordered_ids: orderedIds }),
    },
  );
  if (!res.ok) throw new Error("Gagal menyimpan urutan peserta");
}
