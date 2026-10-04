"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  Building,
  UploadCloud,
  Edit3,
  Save,
  CheckCircle,
  ArrowLeft,
  Users,
  Camera,
  Info,
  FileDown,
  FileType2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { AutoSaveBadge } from "./AutoSaveBadge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { TiptapEditor } from "./TiptapEditor";
import { AttendeeTable } from "./AttendeeTable";
import { AttachmentManager } from "./AttachmentManager";
import { SignatureSection } from "./SignatureSection";
import { autoSaveNotulen } from "@/lib/actions/notulen";
import { uploadNotulenDocument, uploadAttachment, deleteAttachment } from "@/lib/actions/upload";
import { getOpdSettings, getOpdList } from "@/lib/actions/settings";
import { mockOpdList } from "@/lib/data/settings";
import { formatDateID, getPublicImageUrl } from "@/lib/utils";
import type {
  Notulen,
  CreateNotulenInput,
  NotulenInputType,
  NotulenStatus,
  Attendee,
  AttendeeInput,
  Attachment,
  OpdSettings,
} from "@/types/notulen";

interface NotulenFormProps {
  initialData?: Notulen;
  isEdit?: boolean;
  onSave: (
    data: CreateNotulenInput & {
      status: NotulenStatus;
      content?: Record<string, unknown>;
      attendees: Attendee[];
      attachments: Attachment[];
    },
  ) => Promise<void>;
}

// Metadata edit modal toggle for document canvas layout
type MetadataEditMode = "closed" | "info" | "pelaksana";

export function NotulenForm({
  initialData,
  isEdit = false,
  onSave,
}: NotulenFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  // Metadata edit panel toggle for document canvas layout
  const [metadataEdit, setMetadataEdit] = useState<MetadataEditMode>("closed");

  // ── Form State ────────────────────────────────────────────────
  const [judul, setJudul] = useState(initialData?.judul || "");
  const [tanggal, setTanggal] = useState(
    initialData?.tanggal || new Date().toISOString().split("T")[0],
  );
  const [waktuMulai, setWaktuMulai] = useState(initialData?.waktu_mulai || "09:00");
  const [waktuSelesai, setWaktuSelesai] = useState(initialData?.waktu_selesai || "11:00");
  const [tempat, setTempat] = useState(initialData?.tempat || "");

  // Leader / Notulis
  const [dipimpinNama, setDipimpinNama] = useState(initialData?.dipimpin_nama || "");
  const [dipimpinJabatan, setDipimpinJabatan] = useState(initialData?.dipimpin_jabatan || "");
  const [dipimpinNip, setDipimpinNip] = useState(initialData?.dipimpin_nip || "");

  // Pimpinan (Penanda Tangan) — terpisah dari Pemimpin Rapat, digunakan di blok TTD
  // Jika dikosongkan, otomatis menggunakan data Pemimpin Rapat
  const [pimpinanNama, setPimpinanNama] = useState(initialData?.pimpinan_nama || "");
  const [pimpinanJabatan, setPimpinanJabatan] = useState(initialData?.pimpinan_jabatan || "");
  const [pimpinanNip, setPimpinanNip] = useState(initialData?.pimpinan_nip || "");

  const [notulisNama, setNotulisNama] = useState(
    initialData?.notulis_nama || user?.displayName || "",
  );
  const [notulisJabatan, setNotulisJabatan] = useState(
    initialData?.notulis_jabatan || user?.jabatan || "",
  );
  const [notulisNip, setNotulisNip] = useState(
    initialData?.notulis_nip || user?.nip || "",
  );

  // Scope OPD & OPD Settings
  const [opdList, setOpdList] = useState<{ kode_unit: string; nama: string }[]>(mockOpdList);

  useEffect(() => {
    getOpdList().then((list) => {
      if (list && list.length > 0) {
        setOpdList(
          list.map((item) => {
            const rec = item as unknown as Record<string, string>;
            return {
              kode_unit: item.kode_unit || rec.value || rec.id || "",
              nama: item.nama || rec.label || rec.opd_name || "",
            };
          })
        );
      }
    });
  }, []);

  const [opdCode, setOpdCode] = useState(
    initialData?.opd_code || user?.opdCode || "T8",
  );
  const [opdSettings, setOpdSettings] = useState<OpdSettings | null>(
    initialData?.opd_settings || null,
  );

  useEffect(() => {
    if (opdCode) {
      setOpdSettings(null);
      getOpdSettings(opdCode).then((settings) => {
        setOpdSettings(settings);
      });
    }
  }, [opdCode]);

  // Computed OPD Name for display & submit (updates instantly when opdCode changes)
  const selectedOpd = opdList.find((o) => o.kode_unit === opdCode);
  const mockMatch = mockOpdList.find((m) => m.kode_unit === opdCode);

  const currentOpdName =
    (opdSettings?.opd_code === opdCode && opdSettings?.opd_name ? opdSettings.opd_name : "") ||
    (selectedOpd?.nama ? selectedOpd.nama : "") ||
    (mockMatch?.nama ? mockMatch.nama : "") ||
    (initialData?.opd_code === opdCode && initialData?.opd_name ? initialData.opd_name : "") ||
    (user?.opdCode === opdCode && user?.opdName ? user.opdName : "") ||
    "Instansi Pemkab Purbalingga";

  // Input Type (editor vs upload)
  const [inputType, setInputType] = useState<NotulenInputType>(
    initialData?.input_type || "editor",
  );

  // Editor Content
  const [content, setContent] = useState<Record<string, unknown>>(
    initialData?.content || { type: "doc", content: [] },
  );

  // Attendees & Attachments
  const [attendees, setAttendees] = useState<Attendee[]>(
    initialData?.attendees || [],
  );
  const [attachments, setAttachments] = useState<Attachment[]>(
    initialData?.attachments || [],
  );

  // Document Upload State & Ref
  const [docFileName, setDocFileName] = useState<string>(
    initialData?.file_name || "",
  );
  const [docFile, setDocFile] = useState<File | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleDocFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFile(file);
      setDocFileName(file.name);
      toast.success("File Terpilih", file.name);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});


  // ── Auto Save Hook (Edit Mode with existing ID) ────────────────
  const notulenId = initialData?.id;

  const { status: autoSaveStatus, lastSavedAt, saveNow } = useAutoSave({
    enabled: isEdit && Boolean(notulenId) && inputType === "editor",
    onSave: async (updatedContent) => {
      if (notulenId) {
        await autoSaveNotulen(notulenId, updatedContent);
      }
    },
  });

  // ── Keyboard shortcut Ctrl+S ──────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isEdit && notulenId && inputType === "editor") {
          saveNow(content);
          toast.success("Draft disimpan", "Perubahan berhasil disimpan.");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEdit, notulenId, inputType, content, saveNow, toast]);

  // ── Validation ────────────────────────────────────────────────
  const validate = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (!judul.trim()) newErrors.judul = "Judul rapat wajib diisi.";
    if (!tanggal) newErrors.tanggal = "Tanggal rapat wajib diisi.";
    if (!waktuMulai) newErrors.waktuMulai = "Waktu mulai wajib diisi.";
    if (!waktuSelesai) newErrors.waktuSelesai = "Waktu selesai wajib diisi.";
    if (!tempat.trim()) newErrors.tempat = "Tempat rapat wajib diisi.";
    if (!dipimpinNama.trim()) newErrors.dipimpinNama = "Nama pemimpin rapat wajib diisi.";
    if (!notulisNama.trim()) newErrors.notulisNama = "Nama notulis wajib diisi.";

    // For upload type in edit mode, require a document file.
    // In create mode, the document can be uploaded later in the editor step.
    if (isEdit && inputType === "upload" && !docFileName) {
      newErrors.docFile = "Dokumen notulen wajib diunggah.";
    }

    setErrors(newErrors);
    return newErrors;
  };

  // ── Submit Handlers ───────────────────────────────────────────
  const handleSubmit = async (targetStatus: NotulenStatus) => {
    const validationErrors = validate();
    const errorKeys = Object.keys(validationErrors);

    if (errorKeys.length > 0) {
      // Show docFile-specific toast for upload validation failure
      if (validationErrors.docFile) {
        toast.error("Dokumen Belum Diunggah", "Silakan pilih dokumen notulen terlebih dahulu.");
      }

      // Show generic metadata toast only if there are non-docFile errors
      const hasMetadataErrors = errorKeys.some((k) => k !== "docFile");
      if (hasMetadataErrors) {
        if (isEdit) setMetadataEdit("info");
        toast.error("Data Belum Lengkap", "Silakan lengkapi bidang metadata yang ditandai merah.");
      }

      return;
    }

    try {
      setIsSubmitting(true);

      let finalFileUrl = initialData?.file_url;
      let finalFileName = docFileName;

      if (inputType === "upload" && docFile) {
        toast.info("Mengunggah dokumen...", "Mohon tunggu sebentar.");
        const formData = new FormData();
        formData.append("file", docFile);
        const res = await uploadNotulenDocument(initialData?.id || "temp", formData);
        finalFileName = res.file_name;
        finalFileUrl = res.file_url;
      }

      await onSave({
        judul: judul.trim(),
        tanggal,
        waktu_mulai: waktuMulai,
        waktu_selesai: waktuSelesai,
        tempat: tempat.trim(),
        dipimpin_nama: dipimpinNama.trim(),
        dipimpin_jabatan: dipimpinJabatan.trim() || undefined,
        dipimpin_nip: dipimpinNip.trim() || undefined,
        pimpinan_nama: pimpinanNama.trim() || undefined,
        pimpinan_jabatan: pimpinanJabatan.trim() || undefined,
        pimpinan_nip: pimpinanNip.trim() || undefined,
        notulis_nama: notulisNama.trim(),
        notulis_jabatan: notulisJabatan.trim() || undefined,
        notulis_nip: notulisNip.trim() || undefined,
        opd_code: opdCode,
        opd_name: currentOpdName,
        input_type: inputType,
        status: targetStatus,
        content,
        file_name: finalFileName,
        file_url: finalFileUrl,
        attendees,
        attachments,
      });

      toast.success(
        targetStatus === "final"
          ? "Notulen Berhasil Difinalisasi"
          : "Draft Notulen Berhasil Disimpan",
      );
      // In edit mode, redirect to list. In create mode, parent handles redirect.
      if (isEdit) {
        router.push("/notulen");
      }
    } catch (err: any) {
      console.error("Error saving notulen:", err);
      toast.error("Gagal Menyimpan Notulen", err?.message || "Terjadi kesalahan pada sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Attendee handlers ────────────────────────────────────────
  const handleAddAttendee = (input: AttendeeInput) => {
    const newAttendee: Attendee = {
      id: `att-temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      notulen_id: initialData?.id || "temp",
      ...input,
      urutan: attendees.length + 1,
    };
    setAttendees((prev) => [...prev, newAttendee]);
  };

  const handleUpdateAttendee = (id: string, input: AttendeeInput) => {
    setAttendees((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...input } : a)),
    );
  };

  const handleDeleteAttendee = (id: string) => {
    setAttendees((prev) =>
      prev.filter((a) => a.id !== id).map((a, i) => ({ ...a, urutan: i + 1 })),
    );
  };

  const handleReorderAttendees = (orderedIds: string[]) => {
    const map = new Map(attendees.map((a) => [a.id, a]));
    const reordered: Attendee[] = [];
    orderedIds.forEach((id, idx) => {
      const item = map.get(id);
      if (item) reordered.push({ ...item, urutan: idx + 1 });
    });
    setAttendees(reordered);
  };

  // ── Attachment handlers ──────────────────────────────────────
  const handleUploadAttachment = async (files: FileList) => {
    try {
      const newAttachments: Attachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (initialData?.id) {
          // Edit Mode: Upload directly to Go backend / MinIO
          toast.info("Mengunggah foto...", f.name);
          const formData = new FormData();
          formData.append("file", f);
          const uploaded = await uploadAttachment(initialData.id, formData);
          newAttachments.push(uploaded);
        } else {
          // Create Mode: Store preview URL
          newAttachments.push({
            id: `att-file-${Date.now()}-${i}`,
            notulen_id: initialData?.id || "temp",
            filename: f.name,
            mime_type: f.type,
            size_bytes: f.size,
            url: URL.createObjectURL(f),
            urutan: attachments.length + i + 1,
            created_at: new Date().toISOString(),
          });
        }
      }
      setAttachments((prev) => [...prev, ...newAttachments]);
      toast.success("Foto Dokumentasi Berhasil Diunggah");
    } catch (err) {
      console.error("Upload attachment error:", err);
      toast.error("Gagal Mengunggah Foto", "Terjadi kesalahan saat mengunggah berkas ke server.");
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    if (initialData?.id && !id.startsWith("att-file-")) {
      try {
        await deleteAttachment(initialData.id, id);
      } catch (err) {
        console.error("Delete attachment error:", err);
      }
    }
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    toast.success("Foto Dokumentasi Berhasil Dihapus");
  };

  // ── Render Full Metadata Form for Create Mode (PRD V.4) ─────
  if (!isEdit) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-24 animate-page-in">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              aria-label="Kembali"
            >
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Buat Notulen Rapat Baru
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Lengkapi metadata utama rapat untuk memulai penyusunan risalah
              </p>
            </div>
          </div>
        </div>

        {/* Metadata Form Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <FileText size={18} />
              <h2 className="text-base font-bold text-slate-900">Metadata & Informasi Utama Rapat</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-5">
            <Input
              fieldId="create-judul"
              label="Judul / Agenda Rapat"
              placeholder="misal: Rapat Koordinasi SIPD Kabupaten Purbalingga"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              errorMessage={errors.judul}
              required
              size="lg"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                fieldId="create-tanggal"
                type="date"
                label="Tanggal Rapat"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                errorMessage={errors.tanggal}
                leftIcon={<Calendar size={16} />}
                required
              />
              <Input
                fieldId="create-waktu-mulai"
                type="time"
                label="Waktu Mulai"
                value={waktuMulai}
                onChange={(e) => setWaktuMulai(e.target.value)}
                errorMessage={errors.waktuMulai}
                leftIcon={<Clock size={16} />}
                required
              />
              <Input
                fieldId="create-waktu-selesai"
                type="time"
                label="Waktu Selesai"
                value={waktuSelesai}
                onChange={(e) => setWaktuSelesai(e.target.value)}
                errorMessage={errors.waktuSelesai}
                leftIcon={<Clock size={16} />}
                required
              />
            </div>

            <Input
              fieldId="create-tempat"
              label="Tempat / Lokasi Rapat"
              placeholder="misal: Ruang Rapat Bupati, Gedung Setda Lt. 2"
              value={tempat}
              onChange={(e) => setTempat(e.target.value)}
              errorMessage={errors.tempat}
              leftIcon={<MapPin size={16} />}
              required
            />

            {/* OPD Selector */}
            {user?.role === "admin" ? (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-secondary-700 uppercase tracking-wider">
                  OPD Penanggung Jawab *
                </label>
                <Combobox
                  options={opdList.map((opd) => ({
                    value: opd.kode_unit,
                    label: `${opd.nama} (${opd.kode_unit})`,
                  }))}
                  value={opdCode}
                  onChange={(val) => setOpdCode(val)}
                  placeholder="Ketik nama atau kode OPD untuk mencari..."
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-secondary-50 border border-secondary-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Building size={18} className="text-primary-600" />
                  <span className="text-xs font-semibold text-secondary-800">
                    {user?.opdName || "Dinas Komunikasi dan Informatika"}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary-200 text-secondary-700">
                  Kode Unit: {opdCode}
                </span>
              </div>
            )}

            {/* Pimpinan Rapat */}
            <div className="p-4 bg-secondary-50/50 rounded-xl border border-secondary-200/60 space-y-3">
              <h3 className="text-xs font-bold text-secondary-900 uppercase tracking-wider">
                Pemimpin Rapat
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  fieldId="create-dipimpin-nama"
                  label="Nama Pemimpin Rapat"
                  placeholder="Nama lengkap & gelar"
                  value={dipimpinNama}
                  onChange={(e) => setDipimpinNama(e.target.value)}
                  errorMessage={errors.dipimpinNama}
                  required
                />
                <Input
                  fieldId="create-dipimpin-jabatan"
                  label="Jabatan Pemimpin"
                  placeholder="misal: Bupati / Kepala Dinas"
                  value={dipimpinJabatan}
                  onChange={(e) => setDipimpinJabatan(e.target.value)}
                />
                <Input
                  fieldId="create-dipimpin-nip"
                  label="NIP Pemimpin (opsional)"
                  placeholder="18 digit NIP"
                  value={dipimpinNip}
                  onChange={(e) => setDipimpinNip(e.target.value)}
                />
              </div>
            </div>

            {/* Pimpinan (Penanda Tangan) */}
            <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200/60 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-secondary-900 uppercase tracking-wider">
                  Pimpinan (Penanda Tangan)
                </h3>
                <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-semibold">
                  Blok TTD Kiri
                </span>
              </div>
              <p className="text-[11px] text-slate-500 -mt-1">
                Nama pejabat yang menandatangani notulen. Jika sama dengan Pemimpin Rapat, dapat dikosongkan.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  fieldId="create-pimpinan-nama"
                  label="Nama Pimpinan"
                  placeholder={dipimpinNama || "Nama lengkap & gelar"}
                  value={pimpinanNama}
                  onChange={(e) => setPimpinanNama(e.target.value)}
                />
                <Input
                  fieldId="create-pimpinan-jabatan"
                  label="Jabatan Pimpinan"
                  placeholder={dipimpinJabatan || "misal: Kepala Dinas"}
                  value={pimpinanJabatan}
                  onChange={(e) => setPimpinanJabatan(e.target.value)}
                />
                <Input
                  fieldId="create-pimpinan-nip"
                  label="NIP Pimpinan (opsional)"
                  placeholder={dipimpinNip || "18 digit NIP"}
                  value={pimpinanNip}
                  onChange={(e) => setPimpinanNip(e.target.value)}
                />
              </div>
            </div>

            {/* Notulis Rapat */}
            <div className="p-4 bg-secondary-50/50 rounded-xl border border-secondary-200/60 space-y-3">
              <h3 className="text-xs font-bold text-secondary-900 uppercase tracking-wider">
                Notulis Rapat
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  fieldId="create-notulis-nama"
                  label="Nama Notulis"
                  placeholder="Nama pembuat notulen"
                  value={notulisNama}
                  onChange={(e) => setNotulisNama(e.target.value)}
                  errorMessage={errors.notulisNama}
                  required
                />
                <Input
                  fieldId="create-notulis-jabatan"
                  label="Jabatan Notulis"
                  placeholder="misal: Analis Kebijakan"
                  value={notulisJabatan}
                  onChange={(e) => setNotulisJabatan(e.target.value)}
                />
                <Input
                  fieldId="create-notulis-nip"
                  label="NIP Notulis (opsional)"
                  placeholder="18 digit NIP"
                  value={notulisNip}
                  onChange={(e) => setNotulisNip(e.target.value)}
                />
              </div>
            </div>



            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-divider)]">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => router.back()}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                loading={isSubmitting}
                onClick={() => handleSubmit("draft")}
              >
                <Save size={16} />
                Simpan & Lanjutkan ke Editor
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ── Render Document Canvas Layout for Edit Mode ──────────────

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-24 animate-page-in">
      {/* Top Sticky Header with Actions */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3.5 border-b border-[var(--color-border)] shadow-xs -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-6 rounded-b-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              aria-label="Kembali"
              className="shrink-0"
            >
              <ArrowLeft size={18} />
            </Button>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {judul || "Edit Notulen Rapat"}
                </h1>
                {isEdit && notulenId && inputType === "editor" && (
                  <AutoSaveBadge status={autoSaveStatus} lastSavedAt={lastSavedAt} className="hidden md:inline-flex" />
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-secondary-500 min-w-0">
                <span className="truncate max-w-[260px] sm:max-w-md" title={`${formatDateID(tanggal)} • ${tempat || "Purbalingga"}`}>
                  {formatDateID(tanggal)} • {tempat || "Purbalingga"}
                </span>

                {isEdit && notulenId && inputType === "editor" && (
                  <AutoSaveBadge status={autoSaveStatus} lastSavedAt={lastSavedAt} className="inline-flex md:hidden" />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {notulenId && inputType === "editor" && (
              <Button
                variant="ghost"
                size="md"
                onClick={() => window.open(`/api/notulen/${notulenId}/pdf`, "_blank")}
                title="Unduh PDF Resmi"
              >
                <FileDown size={16} />
                <span className="hidden sm:inline">Unduh PDF</span>
              </Button>
            )}

            {notulenId && inputType === "editor" && (
              <Button
                variant="ghost"
                size="md"
                onClick={() => window.open(`/api/notulen/${notulenId}/word`, "_blank")}
                title="Unduh Word (.docx)"
              >
                <FileType2 size={16} />
                <span className="hidden sm:inline">Unduh Word</span>
              </Button>
            )}

            <Button
              variant="secondary"
              size="md"
              loading={isSubmitting}
              onClick={() => handleSubmit("draft")}
              className="whitespace-nowrap"
            >
              <Save size={16} />
              Simpan Draft
            </Button>

            <Button
              variant="primary"
              size="md"
              loading={isSubmitting}
              onClick={() => handleSubmit("final")}
              className="whitespace-nowrap"
            >
              <CheckCircle size={16} />
              Finalisasi
            </Button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          DOCUMENT CANVAS — Resembles the official printed document
         ══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-6 sm:p-10 space-y-8">

        {/* ── KOP SURAT HEADER ──────────────────────────────── */}
        <div className="border-b-4 border-double border-slate-900 pb-4 text-center space-y-1">
          <div className="flex items-center justify-center gap-4">
            {opdSettings?.logo_url ? (
              <img
                src={getPublicImageUrl(opdSettings.logo_url)}
                alt="Logo OPD"
                className="w-16 h-16 object-contain flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/logo-purbalingga-official.png";
                }}
              />
            ) : (
              <img
                src="/logo-purbalingga-official.png"
                alt="Logo Pemkab Purbalingga"
                className="w-16 h-16 object-contain flex-shrink-0"
              />
            )}
            <div className="text-center">
              <h2 className="text-sm font-bold text-slate-800 tracking-wider uppercase">
                PEMERINTAH KABUPATEN PURBALINGGA
              </h2>
              <h1 className="text-base font-extrabold text-slate-900 tracking-wide uppercase">
                {currentOpdName.toUpperCase()}
              </h1>
              {opdSettings?.opd_code === opdCode && opdSettings?.alamat && (
                <p className="text-[11px] text-slate-600 font-medium">
                  {opdSettings.alamat}
                </p>
              )}
              {opdSettings?.opd_code === opdCode && (opdSettings?.telepon || opdSettings?.email) && (
                <p className="text-[10px] text-slate-500 font-mono">
                  {opdSettings.telepon && `Telp: ${opdSettings.telepon}`}
                  {opdSettings.email && ` | Email: ${opdSettings.email}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── TITLE ─────────────────────────────────────────── */}
        <div className="text-center space-y-1 pt-2">
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
            NOTULEN
          </h2>
          <div className="max-w-lg mx-auto">
            <input
              type="text"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Ketik judul / agenda rapat..."
              className="w-full text-center text-base font-semibold text-slate-800 leading-snug bg-transparent border-b-2 border-dashed border-slate-300 focus:border-emerald-500 outline-none py-1 transition-colors"
            />
            {errors.judul && (
              <p className="text-xs text-red-600 mt-1">{errors.judul}</p>
            )}
          </div>
        </div>

        {/* ── METADATA GRID ────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs relative">
          {/* Edit metadata button */}
          <button
            type="button"
            onClick={() => setMetadataEdit(metadataEdit === "closed" ? "info" : "closed")}
            className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
            title="Edit metadata rapat"
          >
            <Edit3 size={14} />
          </button>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar size={14} className="text-emerald-700 flex-shrink-0" />
              <span className="font-semibold w-24">Hari / Tanggal:</span>
              <span className="text-slate-900 font-medium">{formatDateID(tanggal)}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Clock size={14} className="text-emerald-700 flex-shrink-0" />
              <span className="font-semibold w-24">Waktu:</span>
              <span className="text-slate-900 font-medium">{waktuMulai} - {waktuSelesai} WIB</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin size={14} className="text-emerald-700 flex-shrink-0" />
              <span className="font-semibold w-24">Tempat:</span>
              <span className="text-slate-900 font-medium">{tempat || "—"}</span>
            </div>
          </div>

          <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4">
            <div className="flex items-start gap-2 text-slate-700">
              <UserCheck size={14} className="text-emerald-700 flex-shrink-0 mt-0.5" />
              <span className="font-semibold w-24">Pimpinan Rapat:</span>
              <div>
                <span className="text-slate-900 font-bold block">{dipimpinNama || "—"}</span>
                {dipimpinJabatan && (
                  <span className="text-slate-600 text-[11px] block">{dipimpinJabatan}</span>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2 text-slate-700">
              <FileText size={14} className="text-emerald-700 flex-shrink-0 mt-0.5" />
              <span className="font-semibold w-24">Notulis:</span>
              <div>
                <span className="text-slate-900 font-bold block">{notulisNama || "—"}</span>
                {notulisJabatan && (
                  <span className="text-slate-600 text-[11px] block">{notulisJabatan}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── METADATA EDIT PANEL (Expandable) ─────────────── */}
        {metadataEdit !== "closed" && (
          <div className="p-5 bg-emerald-50/40 rounded-xl border border-emerald-200 space-y-4 animate-page-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                <Info size={16} />
                Edit Metadata Rapat
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setMetadataEdit("closed")}>
                ✕
              </Button>
            </div>

            <Input
              fieldId="canvas-judul"
              label="Judul / Agenda Rapat"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              errorMessage={errors.judul}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                fieldId="canvas-tanggal"
                type="date"
                label="Tanggal Rapat"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                errorMessage={errors.tanggal}
                leftIcon={<Calendar size={16} />}
                required
              />
              <Input
                fieldId="canvas-waktu-mulai"
                type="time"
                label="Waktu Mulai"
                value={waktuMulai}
                onChange={(e) => setWaktuMulai(e.target.value)}
                errorMessage={errors.waktuMulai}
                leftIcon={<Clock size={16} />}
                required
              />
              <Input
                fieldId="canvas-waktu-selesai"
                type="time"
                label="Waktu Selesai"
                value={waktuSelesai}
                onChange={(e) => setWaktuSelesai(e.target.value)}
                errorMessage={errors.waktuSelesai}
                leftIcon={<Clock size={16} />}
                required
              />
            </div>

            <Input
              fieldId="canvas-tempat"
              label="Tempat / Lokasi Rapat"
              placeholder="misal: Ruang Rapat Bupati"
              value={tempat}
              onChange={(e) => setTempat(e.target.value)}
              errorMessage={errors.tempat}
              leftIcon={<MapPin size={16} />}
              required
            />

            {/* OPD Selector */}
            {user?.role === "admin" ? (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-secondary-700 uppercase tracking-wider">
                  OPD Penanggung Jawab *
                </label>
                <Combobox
                  options={opdList.map((opd) => ({
                    value: opd.kode_unit,
                    label: `${opd.nama} (${opd.kode_unit})`,
                  }))}
                  value={opdCode}
                  onChange={(val) => setOpdCode(val)}
                  placeholder="Ketik nama atau kode OPD untuk mencari..."
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-white border border-secondary-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Building size={18} className="text-primary-600" />
                  <span className="text-xs font-semibold text-secondary-800">
                    {user?.opdName || "Dinas Komunikasi dan Informatika"}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary-200 text-secondary-700">
                  Kode Unit: {opdCode}
                </span>
              </div>
            )}

            {/* Pemimpin Rapat */}
            <div className="p-4 bg-white rounded-xl border border-secondary-200/60 space-y-3">
              <h3 className="text-xs font-bold text-secondary-900 uppercase tracking-wider">
                Pemimpin Rapat
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  fieldId="canvas-dipimpin-nama"
                  label="Nama Pemimpin Rapat"
                  placeholder="Nama lengkap & gelar"
                  value={dipimpinNama}
                  onChange={(e) => setDipimpinNama(e.target.value)}
                  errorMessage={errors.dipimpinNama}
                  required
                />
                <Input
                  fieldId="canvas-dipimpin-jabatan"
                  label="Jabatan Pemimpin"
                  placeholder="misal: Bupati / Kepala Dinas"
                  value={dipimpinJabatan}
                  onChange={(e) => setDipimpinJabatan(e.target.value)}
                />
                <Input
                  fieldId="canvas-dipimpin-nip"
                  label="NIP Pemimpin (opsional)"
                  placeholder="18 digit NIP"
                  value={dipimpinNip}
                  onChange={(e) => setDipimpinNip(e.target.value)}
                />
              </div>
            </div>

            {/* Pimpinan (Penanda Tangan) */}
            <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200/60 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-secondary-900 uppercase tracking-wider">
                  Pimpinan (Penanda Tangan)
                </h3>
                <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-semibold">
                  Blok TTD Kiri
                </span>
              </div>
              <p className="text-[11px] text-slate-500 -mt-1">
                Nama pejabat yang menandatangani notulen. Jika sama dengan Pemimpin Rapat, dapat dikosongkan.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  fieldId="canvas-pimpinan-nama"
                  label="Nama Pimpinan"
                  placeholder={dipimpinNama || "Nama lengkap & gelar"}
                  value={pimpinanNama}
                  onChange={(e) => setPimpinanNama(e.target.value)}
                />
                <Input
                  fieldId="canvas-pimpinan-jabatan"
                  label="Jabatan Pimpinan"
                  placeholder={dipimpinJabatan || "misal: Kepala Dinas"}
                  value={pimpinanJabatan}
                  onChange={(e) => setPimpinanJabatan(e.target.value)}
                />
                <Input
                  fieldId="canvas-pimpinan-nip"
                  label="NIP Pimpinan (opsional)"
                  placeholder={dipimpinNip || "18 digit NIP"}
                  value={pimpinanNip}
                  onChange={(e) => setPimpinanNip(e.target.value)}
                />
              </div>
            </div>

            {/* Notulis Rapat */}
            <div className="p-4 bg-white rounded-xl border border-secondary-200/60 space-y-3">
              <h3 className="text-xs font-bold text-secondary-900 uppercase tracking-wider">
                Notulis Rapat
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  fieldId="canvas-notulis-nama"
                  label="Nama Notulis"
                  placeholder="Nama pembuat notulen"
                  value={notulisNama}
                  onChange={(e) => setNotulisNama(e.target.value)}
                  errorMessage={errors.notulisNama}
                  required
                />
                <Input
                  fieldId="canvas-notulis-jabatan"
                  label="Jabatan Notulis"
                  placeholder="misal: Analis Kebijakan"
                  value={notulisJabatan}
                  onChange={(e) => setNotulisJabatan(e.target.value)}
                />
                <Input
                  fieldId="canvas-notulis-nip"
                  label="NIP Notulis (opsional)"
                  placeholder="18 digit NIP"
                  value={notulisNip}
                  onChange={(e) => setNotulisNip(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            I. DAFTAR HADIR PESERTA RAPAT — Table
           ══════════════════════════════════════════════════════ */}
        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-1">
            Daftar Hadir Peserta Rapat
          </h3>
          <AttendeeTable
            attendees={attendees}
            onAdd={handleAddAttendee}
            onUpdate={handleUpdateAttendee}
            onDelete={handleDeleteAttendee}
            onReorder={handleReorderAttendees}
            opdList={opdList}
            notulenId={initialData?.id}
          />
        </div>

        {/* ══════════════════════════════════════════════════════
            Risalah Notulen — Tiptap Editor / Upload
           ══════════════════════════════════════════════════════ */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-1">
              {inputType === "upload" ? "Dokumen Risalah / Notulen" : "Isi Risalah Notulen"}
            </h3>

            {/* Input Type Toggle */}
            <div className="flex items-center gap-1 p-1 bg-secondary-100 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setInputType("editor")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  inputType === "editor"
                    ? "bg-white text-primary-700 font-bold shadow-xs"
                    : "text-secondary-600 hover:text-secondary-900"
                }`}
              >
                <Edit3 size={14} />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setInputType("upload")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  inputType === "upload"
                    ? "bg-white text-primary-700 font-bold shadow-xs"
                    : "text-secondary-600 hover:text-secondary-900"
                }`}
              >
                <UploadCloud size={14} />
                <span>Upload</span>
              </button>
            </div>
          </div>

          {inputType === "editor" ? (
            <TiptapEditor
              content={content}
              onChange={setContent}
              autoSaveStatus={autoSaveStatus}
              lastSavedAt={lastSavedAt}
              onManualSave={() => {
                if (notulenId) saveNow(content);
                toast.success("Draft disimpan");
              }}
            />
          ) : (
            <div className="border-2 border-dashed border-secondary-300 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-secondary-50">
              <input
                type="file"
                ref={docInputRef}
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleDocFileSelect}
              />
              <UploadCloud size={40} className="text-secondary-400 mb-2" />
              <p className="text-sm font-bold text-secondary-800">
                Unggah Dokumen Notulen (PDF / Word)
              </p>
              <p className="text-xs text-secondary-500 mt-1 max-w-sm">
                Pilih metode ini jika notulen telah dibuat dalam format PDF atau Word terpisah.
              </p>
              {docFileName ? (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center gap-4 w-full max-w-lg">
                  <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                      <FileText size={24} className="text-emerald-700" />
                    </div>
                    <span className="text-sm font-bold text-emerald-900 truncate" title={docFileName}>{docFileName}</span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => docInputRef.current?.click()}
                    className="shrink-0"
                  >
                    <Edit3 size={14} className="mr-1.5" />
                    Ubah File
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="mt-6"
                  onClick={() => docInputRef.current?.click()}
                >
                  <UploadCloud size={16} className="mr-2" />
                  Pilih File Dokumen
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            III. DOKUMENTASI FOTO RAPAT
           ══════════════════════════════════════════════════════ */}
        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-1">
            III. Dokumentasi Foto Rapat
          </h3>
          <AttachmentManager
            attachments={attachments}
            onUpload={handleUploadAttachment}
            onDelete={handleDeleteAttachment}
          />
        </div>

        {/* ══════════════════════════════════════════════════════
            IV. TEMPLATE TANDA TANGAN
           ══════════════════════════════════════════════════════ */}
        <SignatureSection
          dipimpinNama={dipimpinNama}
          dipimpinJabatan={dipimpinJabatan}
          dipimpinNip={dipimpinNip}
          pimpinanNama={pimpinanNama}
          pimpinanJabatan={pimpinanJabatan}
          pimpinanNip={pimpinanNip}
          notulisNama={notulisNama}
          notulisJabatan={notulisJabatan}
          notulisNip={notulisNip}
          tanggal={tanggal}
        />
      </div>
    </div>
  );
}
