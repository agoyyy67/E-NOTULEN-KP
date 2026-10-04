"use client";

import React, { useState, useRef } from "react";
import { Camera, Upload, Trash2, Eye, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { FILE_CONSTRAINTS, validateAttachmentFile } from "@/lib/utils/upload-validation";
import { getPublicImageUrl } from "@/lib/utils";
import type { Attachment } from "@/types/notulen";

interface AttachmentManagerProps {
  attachments: Attachment[];
  onUpload: (files: FileList) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  readOnly?: boolean;
}

/**
 * Helper to ensure attachment image URLs are valid absolute URLs (e.g. MinIO localhost:9000)
 */
function getFullAttachmentUrl(url?: string): string {
  return getPublicImageUrl(url);
}

export function AttachmentManager({
  attachments,
  onUpload,
  onDelete,
  readOnly = false,
}: AttachmentManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Preview modal state
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMessage(null);

    // Validate max count
    if (attachments.length + files.length > FILE_CONSTRAINTS.attachment.maxCount) {
      setErrorMessage(
        `Maksimal ${FILE_CONSTRAINTS.attachment.maxCount} foto dokumentasi per notulen.`,
      );
      return;
    }

    // Validate each file
    for (let i = 0; i < files.length; i++) {
      const validation = validateAttachmentFile(files[i]);
      if (!validation.valid) {
        setErrorMessage(validation.error);
        return;
      }
    }

    try {
      setIsUploading(true);
      await onUpload(files);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setErrorMessage("Gagal mengunggah foto. Silakan coba lagi.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      setIsDeleting(true);
      await onDelete(deleteTargetId);
      setDeleteTargetId(null);
    } catch {
      setErrorMessage("Gagal menghapus foto.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={20} className="text-primary-600" />
          <h3 className="text-base font-bold text-secondary-900">
            Dokumentasi Foto Rapat
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-700">
            {attachments.length} / {FILE_CONSTRAINTS.attachment.maxCount} Foto
          </span>
        </div>

        {!readOnly && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="attachment-file-input"
            />
            <Button
              variant="secondary"
              size="sm"
              loading={isUploading}
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= FILE_CONSTRAINTS.attachment.maxCount}
            >
              <Upload size={15} />
              Unggah Foto
            </Button>
          </div>
        )}
      </div>

      {/* Validation Error Banner */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-[var(--color-error-light)] text-[var(--color-error-dark)] rounded-lg text-xs font-medium">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-black/5 rounded"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Image Grid Preview */}
      {attachments.length === 0 ? (
        <div
          onClick={() => !readOnly && fileInputRef.current?.click()}
          className={`border-2 border-dashed border-secondary-300 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors ${
            !readOnly ? "cursor-pointer hover:border-primary-500 hover:bg-primary-50/20" : ""
          }`}
        >
          <div className="p-3 rounded-full bg-secondary-100 text-secondary-500 mb-3">
            <Camera size={28} />
          </div>
          <p className="text-sm font-semibold text-secondary-800">
            Belum Ada Foto Dokumentasi
          </p>
          <p className="text-xs text-secondary-500 mt-1 max-w-sm">
            {!readOnly
              ? "Klik di sini atau gunakan tombol unggah untuk menambahkan foto (Maks 10MB per foto, format JPG/PNG)."
              : "Tidak ada foto dokumentasi yang dilampirkan."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {attachments.map((item) => {
            const fullUrl = getFullAttachmentUrl(item.url);
            return (
              <div
                key={item.id}
                className="group relative aspect-4/3 rounded-lg overflow-hidden border border-secondary-200 bg-secondary-100 shadow-xs"
              >
                {/* Image thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fullUrl}
                  alt={item.filename}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />

                {/* Hover overlay actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewAttachment(item)}
                    className="p-2 rounded-full bg-white/90 text-secondary-800 hover:bg-white transition-colors"
                    title="Lihat foto penuh"
                  >
                    <Eye size={16} />
                  </button>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(item.id)}
                      className="p-2 rounded-full bg-red-600/90 text-white hover:bg-red-600 transition-colors"
                      title="Hapus foto"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal Preview */}
      <Modal
        isOpen={Boolean(previewAttachment)}
        onClose={() => setPreviewAttachment(null)}
        title={previewAttachment?.filename || "Foto Dokumentasi"}
        size="lg"
      >
        {previewAttachment && (
          <div className="flex flex-col items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getFullAttachmentUrl(previewAttachment.url)}
              alt={previewAttachment.filename}
              className="max-h-[70vh] w-auto object-contain rounded-lg shadow-md"
            />
          </div>
        )}
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
        title="Hapus Foto Dokumentasi?"
        message="Apakah Anda yakin ingin menghapus foto ini?"
        confirmLabel="Hapus Foto"
        danger
      />
    </div>
  );
}
