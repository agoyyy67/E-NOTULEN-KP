"use client";

import React, { useState } from "react";
import { Plus, Trash2, Edit2, ArrowUp, ArrowDown, Users, UserPlus, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/Skeleton";
import { Combobox } from "@/components/ui/Combobox";
import type { Attendee, AttendeeInput } from "@/types/notulen";
import type { OpdData } from "@/types/api";

interface AttendeeTableProps {
  attendees: Attendee[];
  onAdd: (input: AttendeeInput) => void;
  onUpdate: (id: string, input: AttendeeInput) => void;
  onDelete: (id: string) => void;
  onReorder?: (orderedIds: string[]) => void;
  readOnly?: boolean;
  opdList?: OpdData[];
  notulenId?: string;
}

export function AttendeeTable({
  attendees,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  readOnly = false,
  opdList = [],
  notulenId,
}: AttendeeTableProps) {
  // Modal state for Add/Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Attendee | null>(null);

  // Form fields
  const [nama, setNama] = useState("");
  const [instansi, setInstansi] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [formError, setFormError] = useState("");

  // Confirmation dialog for delete
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // QR Code State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const openAddModal = () => {
    setEditingItem(null);
    setNama("");
    setInstansi("");
    setJabatan("");
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (item: Attendee) => {
    setEditingItem(item);
    setNama(item.nama);
    setInstansi(item.instansi || "");
    setJabatan(item.jabatan || "");
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      setFormError("Nama peserta wajib diisi");
      return;
    }

    const payload: AttendeeInput = {
      nama: nama.trim(),
      instansi: instansi.trim() || undefined,
      jabatan: jabatan.trim() || undefined,
    };

    if (editingItem) {
      onUpdate(editingItem.id, payload);
    } else {
      onAdd(payload);
    }

    setModalOpen(false);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    if (!onReorder) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= attendees.length) return;

    const reordered = [...attendees];
    const temp = reordered[index];
    reordered[index] = reordered[newIndex];
    reordered[newIndex] = temp;

    onReorder(reordered.map((a) => a.id));
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-primary-600" />
          <h3 className="text-base font-bold text-secondary-900">
            Daftar Hadir Peserta Rapat
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-700">
            {attendees.length} Orang
          </span>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            {notulenId && (
              <Button variant="secondary" size="sm" onClick={() => setIsQrModalOpen(true)}>
                <QrCode size={15} />
                Print QR Code
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={openAddModal}>
              <UserPlus size={15} />
              Tambah Peserta
            </Button>
          </div>
        )}
      </div>

      {/* Table Content */}
      {attendees.length === 0 ? (
        <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)]">
          <EmptyState
            icon={<Users size={32} />}
            title="Belum Ada Peserta Rapat"
            description="Tambahkan peserta yang hadir dalam rapat ini (Nama, Instansi, dan Jabatan)."
            action={
              !readOnly ? (
                <Button variant="secondary" size="sm" onClick={openAddModal}>
                  <Plus size={15} />
                  Tambah Peserta Pertama
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <Table responsive>
          <THead>
            <Tr hoverable={false}>
              <Th className="w-12 text-center">No</Th>
              <Th>Nama Lengkap</Th>
              <Th>Instansi / OPD</Th>
              <Th>Jabatan</Th>
              {!readOnly && <Th className="w-32 text-right">Aksi</Th>}
            </Tr>
          </THead>
          <TBody>
            {attendees.map((item, index) => (
              <Tr key={item.id}>
                <Td className="text-center font-semibold text-secondary-500">
                  {index + 1}
                </Td>
                <Td className="font-semibold text-secondary-900">
                  {item.nama}
                </Td>
                <Td className="text-secondary-600">
                  {item.instansi || "—"}
                </Td>
                <Td className="text-secondary-600">
                  {item.jabatan || "—"}
                </Td>
                {!readOnly && (
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Move up / down buttons */}
                      {onReorder && (
                        <>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMove(index, "up")}
                            className="p-1 rounded text-secondary-400 hover:text-secondary-700 disabled:opacity-30"
                            title="Naikkan urutan"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={index === attendees.length - 1}
                            onClick={() => handleMove(index, "down")}
                            className="p-1 rounded text-secondary-400 hover:text-secondary-700 disabled:opacity-30"
                            title="Turunkan urutan"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded text-secondary-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="Edit data peserta"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetId(item.id)}
                        className="p-1.5 rounded text-secondary-500 hover:text-[var(--color-error)] hover:bg-[var(--color-error-light)] transition-colors"
                        title="Hapus peserta"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      {/* Modal Form: Add / Edit Attendee */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? "Edit Data Peserta Rapat" : "Tambah Peserta Rapat"}
        description="Masukkan informasi peserta (Nama, Instansi, dan Jabatan)."
        size="md"
      >
        <form onSubmit={handleSubmit} className="flex flex-col min-h-[380px]">
          <div className="flex-1 space-y-4">
            <Input
              fieldId="attendee-nama"
              label="Nama Lengkap"
              placeholder="misal: Ir. Budi Santoso, M.T."
              value={nama}
              onChange={(e) => {
                setNama(e.target.value);
                if (formError) setFormError("");
              }}
              errorMessage={formError}
              required
            />

            <div className="space-y-2">
              <label className="text-xs font-bold text-secondary-900 block">
                Instansi / OPD
              </label>
              <Combobox
                options={opdList.map((opd) => ({
                  value: opd.nama, // Save label instead of code
                  label: opd.nama,
                }))}
                value={instansi}
                onChange={(val) => setInstansi(val)}
                placeholder="Pilih instansi..."
              />
            </div>

            <Input
              fieldId="attendee-jabatan"
              label="Jabatan"
              placeholder="misal: Analis Kebijakan Ahli Muda"
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 mt-6 border-t border-[var(--color-divider)]">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="md">
              {editingItem ? "Simpan Perubahan" : "Tambah Peserta"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) onDelete(deleteTargetId);
          setDeleteTargetId(null);
        }}
        title="Hapus Peserta Rapat?"
        message="Peserta yang dihapus tidak dapat dikembalikan lagi. Apakah Anda yakin?"
        confirmLabel="Hapus Peserta"
        danger
      />

      {/* QR Code Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="QR Code Absensi Rapat"
      >
        <div className="p-6 flex flex-col items-center justify-center space-y-4">
          <p className="text-sm text-secondary-600 text-center mb-2">
            Peserta dapat melakukan pemindaian (scan) QR Code ini menggunakan kamera ponsel untuk mengisi daftar hadir secara mandiri.
          </p>
          <div className="bg-white p-4 rounded-xl border border-[var(--color-divider)] shadow-sm">
            {notulenId ? (
              <QRCodeSVG 
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/absensi/${notulenId}`} 
                size={220}
                level="H"
                includeMargin={true}
              />
            ) : null}
          </div>
          <div className="mt-4 flex gap-3 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setIsQrModalOpen(false)}>
              Tutup
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => {
              window.open(`/absensi/${notulenId}`, '_blank');
            }}>
              Buka Link
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
