"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit,
  Copy,
  Trash2,
  RotateCcw,
  Calendar,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { StatusBadge } from "@/components/ui/Badge";
import { Table, THead, TBody, Tr, Th, Td, Pagination } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState, TableSkeleton } from "@/components/ui/Skeleton";
import {
  getNotulenList,
  deleteNotulen,
  duplicateNotulen,
  restoreNotulen,
  forceDeleteNotulen,
} from "@/lib/actions/notulen";
import { getOpdList } from "@/lib/actions/settings";
import { formatDateIndonesian, cn } from "@/lib/utils";
import type { NotulenListItem, NotulenStatus } from "@/types/notulen";
import type { OpdData } from "@/types/api";

function NotulenListContent() {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<NotulenListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [opdList, setOpdList] = useState<OpdData[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [opdFilter, setOpdFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Confirmation dialogs
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [duplicateTargetId, setDuplicateTargetId] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const [restoreTarget, setRestoreTarget] = useState<NotulenListItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const [destroyTarget, setDestroyTarget] = useState<NotulenListItem | null>(null);
  const [isDestroying, setIsDestroying] = useState(false);

  // Sync status filter with URL search params (e.g. ?status=deleted atau ?trash=true)
  useEffect(() => {
    const statusParam = searchParams?.get("status");
    const isTrash = searchParams?.get("trash") === "true";
    if (isTrash || statusParam === "deleted") {
      setStatusFilter("deleted");
    } else if (statusParam === "draft" || statusParam === "final") {
      setStatusFilter(statusParam);
    }
  }, [searchParams]);

  // Debounce search input (400ms delay) untuk mencegah API flood & spam toast
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch list
  const fetchList = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getNotulenList({
        page,
        per_page: 10,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter !== "all" ? (statusFilter as NotulenStatus) : undefined,
        opd_code: opdFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setItems(res.items);
      setTotalItems(res.meta.total);
      setTotalPages(res.meta.total_pages);
    } catch (err) {
      console.error("[NotulenListPage] Error fetching notulen list:", err);
      setItems([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, opdFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (user?.role === "admin") {
      getOpdList().then(setOpdList);
    }
  }, [user?.role]);

  // Handle Duplikasi
  const handleDuplicateConfirm = async () => {
    if (!duplicateTargetId) return;
    try {
      setIsDuplicating(true);
      const duplicated = await duplicateNotulen(duplicateTargetId);
      toast.success(
        "Notulen Berhasil Disalin",
        `Draft baru "${duplicated.judul}" telah dibuat.`,
      );
      setDuplicateTargetId(null);
      fetchList();
    } catch {
      toast.error("Gagal Menyalin Notulen");
    } finally {
      setIsDuplicating(false);
    }
  };

  // Handle Soft Delete (Hapus ke Sampah)
  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      setIsDeleting(true);
      await deleteNotulen(deleteTargetId);
      toast.success(
        "Dipindahkan ke Sampah",
        "Notulen berhasil dipindahkan ke tempat sampah dan dapat dipulihkan kapan saja.",
      );
      setDeleteTargetId(null);
      fetchList();
    } catch {
      toast.error("Gagal Menghapus Notulen");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Restore (Pulihkan dari Sampah)
  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    try {
      setIsRestoring(true);
      await restoreNotulen(restoreTarget.id);
      toast.success(
        "Dokumen Dipulihkan",
        `Naskah "${restoreTarget.judul}" berhasil dikembalikan ke status Draft aktif.`,
      );
      setRestoreTarget(null);
      fetchList();
    } catch {
      toast.error("Gagal Memulihkan Notulen", "Terjadi kesalahan saat memulihkan naskah.");
    } finally {
      setIsRestoring(false);
    }
  };

  // Handle Force Delete (Musnahkan Permanen)
  const handleDestroyConfirm = async () => {
    if (!destroyTarget) return;
    try {
      setIsDestroying(true);
      await forceDeleteNotulen(destroyTarget.id);
      toast.success(
        "Dokumen Dimusnahkan",
        `Naskah "${destroyTarget.judul}" telah dimusnahkan secara permanen dari sistem.`,
      );
      setDestroyTarget(null);
      fetchList();
    } catch {
      toast.error("Gagal Memusnahkan Dokumen", "Terjadi kesalahan saat menghapus permanen dokumen.");
    } finally {
      setIsDestroying(false);
    }
  };

  // Helper hitung sisa retensi 30 hari
  const getRetentionInfo = (deletedAt?: string, updatedAt?: string) => {
    const rawDate = deletedAt || updatedAt;
    if (!rawDate) return { formatted: "-", remainingDays: 30 };

    const delDate = new Date(rawDate);
    const formatted = delDate.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const now = new Date();
    const diffMs = now.getTime() - delDate.getTime();
    const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, 30 - elapsedDays);

    return { formatted, remainingDays };
  };

  const isTrashView = statusFilter === "deleted";

  return (
    <div className="w-full p-4 sm:p-6 space-y-6 animate-page-in pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-divider)] pb-4">
        <div>
          {isTrashView ? (
            <>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-secondary-900 tracking-tight">
                  Tempat Sampah Notulen (Trash)
                </h1>
                <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Trash2 size={12} className="text-amber-700" />
                  Soft Deleted
                </span>
              </div>
              <p className="text-sm text-secondary-500 mt-0.5">
                Daftar dokumen risalah rapat yang dihapus sementara sebelum dimusnahkan permanen
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-secondary-900 tracking-tight">
                Daftar Notulen Rapat
              </h1>
              <p className="text-sm text-secondary-500 mt-0.5">
                Kelola seluruh arsip dan draft risalah rapat Kedinasan Pemkab Purbalingga
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isTrashView ? (
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setStatusFilter("all");
                setPage(1);
              }}
              className="gap-2 text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300"
            >
              <RotateCcw size={16} className="text-emerald-600" />
              <span>Kembali ke Dokumen Aktif</span>
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setStatusFilter("deleted");
                  setPage(1);
                }}
                className="gap-2 text-slate-700 hover:text-amber-800 hover:bg-amber-50 hover:border-amber-300"
                title="Buka daftar naskah terhapus (Trash)"
              >
                <Trash2 size={16} className="text-amber-600" />
                <span>Tempat Sampah</span>
              </Button>
              <Link href="/notulen/create">
                <Button variant="primary" size="md">
                  <Plus size={16} />
                  Buat Notulen Baru
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Banner Peringatan Retensi 30 Hari (Sesuai GAMBAR 25) */}
      {isTrashView && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <div>
              <span className="font-bold text-amber-950 text-sm">Pemberitahuan Sistem:</span>{" "}
              <span className="text-xs text-amber-850">
                Dokumen dalam tempat sampah akan disimpan selama 30 hari sebelum dimusnahkan secara permanen. Anda dapat memulihkan naskah ke daftar aktif kapan saja.
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setPage(1);
            }}
            className="text-amber-900 border-amber-300 bg-white hover:bg-amber-100 shrink-0 text-xs gap-1.5 self-start sm:self-auto"
          >
            <RotateCcw size={13} />
            Kembali ke Repositori
          </Button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[var(--color-border)] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="w-full md:w-80">
          <Input
            fieldId="search-notulen"
            placeholder="Cari judul atau lokasi rapat..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leftIcon={<Search size={16} />}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
          {/* Filter Range Tanggal Rapat */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium">
            <span className="px-1 shrink-0 font-semibold text-slate-700">Tanggal:</span>
            <div className="w-36">
              <Input
                fieldId="filter-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                leftIcon={<Calendar size={14} />}
                title="Dari Tanggal Rapat"
              />
            </div>
            <span className="text-slate-400 shrink-0 px-0.5">s/d</span>
            <div className="w-36">
              <Input
                fieldId="filter-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                leftIcon={<Calendar size={14} />}
                title="Sampai Tanggal Rapat"
              />
            </div>
          </div>

          {/* Status filter (Termasuk Opsi Trash / Sampah) */}
          <div className="w-44">
            <Select
              fieldId="filter-status"
              options={[
                { value: "all", label: "Semua Status (Aktif)" },
                { value: "draft", label: "Draft (Konsep)" },
                { value: "final", label: "Final (Terbit)" },
                { value: "deleted", label: "Trash / Sampah" },
              ]}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* OPD filter (Admin only) */}
          {user?.role === "admin" && (
            <div className="w-64">
              <Combobox
                options={[
                  { value: "", label: "Semua OPD" },
                  ...opdList.map((opd) => ({
                    value: opd.kode_unit,
                    label: opd.nama,
                  })),
                ]}
                value={opdFilter}
                onChange={(val) => {
                  setOpdFilter(val);
                  setPage(1);
                }}
                placeholder="Pilih OPD..."
              />
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchList}
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* Notulen Table Card */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : items.length === 0 ? (
        <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-xs">
          <EmptyState
            icon={isTrashView ? <Trash2 size={36} className="text-amber-500" /> : <FileText size={36} />}
            title={
              isTrashView
                ? "Tempat Sampah Kosong"
                : search
                ? "Tidak Ada Notulen Ditemukan"
                : "Tidak Ada Notulen Aktif"
            }
            description={
              isTrashView
                ? "Tidak ada dokumen notulen rapat yang berada di tempat sampah saat ini."
                : search
                ? "Tidak ada notulen yang sesuai dengan kata kunci pencarian Anda."
                : "Belum ada notulen rapat yang aktif. Anda dapat membuat notulen baru atau memeriksa folder Sampah."
            }
            action={
              isTrashView ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setPage(1);
                  }}
                >
                  <RotateCcw size={15} />
                  Kembali ke Daftar Notulen Aktif
                </Button>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link href="/notulen/create">
                    <Button variant="primary" size="sm">
                      <Plus size={15} />
                      Buat Notulen Baru
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setStatusFilter("deleted");
                      setPage(1);
                    }}
                  >
                    <Trash2 size={15} />
                    Lihat Tempat Sampah (Trash)
                  </Button>
                </div>
              )
            }
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden">
          <Table responsive>
            <THead>
              {isTrashView ? (
                <Tr hoverable={false}>
                  <Th className="min-w-[280px]">Judul Notulen Terhapus</Th>
                  <Th className="min-w-[160px]">Dihapus Oleh</Th>
                  <Th className="min-w-[180px]">Tanggal Dihapus & Retensi</Th>
                  <Th className="min-w-[160px]">OPD Pengampu</Th>
                  <Th className="min-w-[170px] text-right">Aksi Pemulihan</Th>
                </Tr>
              ) : (
                <Tr hoverable={false}>
                  <Th className="min-w-[260px]">Judul Rapat & Pelaksana</Th>
                  <Th className="min-w-[180px]">Waktu & Tempat</Th>
                  <Th className="min-w-[160px]">OPD Pengampu</Th>
                  <Th className="min-w-[100px] text-center">Status</Th>
                  <Th className="min-w-[130px] text-right">Aksi</Th>
                </Tr>
              )}
            </THead>
            <TBody>
              {items.map((item) => {
                if (isTrashView) {
                  const { formatted, remainingDays } = getRetentionInfo(item.deleted_at, item.updated_at);
                  return (
                    <Tr key={item.id}>
                      {/* Judul Notulen Terhapus */}
                      <Td className="min-w-[280px]">
                        <span className="font-bold text-slate-900 block text-sm leading-snug line-clamp-2">
                          {item.judul}
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-1">
                          Tanggal Acara: {formatDateIndonesian(item.tanggal)} &bull; Lokasi: {item.tempat}
                        </span>
                      </Td>

                      {/* Dihapus Oleh */}
                      <Td className="min-w-[160px]">
                        <span className="text-xs font-semibold text-slate-800 block">
                          {item.deleted_by_name || item.dipimpin_nama || "Administrator"}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Notulis: {item.notulis_nama}
                        </span>
                      </Td>

                      {/* Tanggal Dihapus & Retensi 30 Hari */}
                      <Td className="min-w-[180px]">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium whitespace-nowrap">
                          <Calendar size={13} className="text-slate-400 shrink-0" />
                          <span>{formatted}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock size={12} className={remainingDays <= 5 ? "text-red-500 shrink-0" : "text-amber-500 shrink-0"} />
                          <span
                            className={cn(
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                              remainingDays <= 5
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-800",
                            )}
                          >
                            Sisa {remainingDays} hari
                          </span>
                        </div>
                      </Td>

                      {/* OPD */}
                      <Td className="min-w-[160px]">
                        <span className="text-xs font-semibold text-slate-800 block truncate max-w-[180px]">
                          {item.opd_name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                          {item.opd_code}
                        </span>
                      </Td>

                      {/* Aksi Pemulihan (Pulihkan / Musnahkan) */}
                      <Td className="min-w-[170px] text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRestoreTarget(item)}
                            className="h-8 px-2.5 text-xs gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300"
                            title="Pulihkan notulen kembali ke repositori aktif"
                          >
                            <RotateCcw size={13} />
                            <span>Pulihkan</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDestroyTarget(item)}
                            className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Musnahkan naskah permanen"
                          >
                            <Trash2 size={13} />
                            <span className="hidden sm:inline">Musnahkan</span>
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  );
                }

                // Regular Active Notulen Row
                return (
                  <Tr key={item.id}>
                    {/* Title & Leader */}
                    <Td className="min-w-[260px]">
                      <Link
                        href={`/notulen/${item.id}`}
                        className="font-bold text-slate-900 hover:text-emerald-700 transition-colors block text-sm leading-snug line-clamp-2"
                      >
                        {item.judul}
                      </Link>
                      <span className="text-[11px] text-slate-500 block mt-1">
                        Dipimpin: {item.dipimpin_nama} &bull; Notulis: {item.notulis_nama}
                      </span>
                    </Td>

                    {/* Date, Time & Venue */}
                    <Td className="min-w-[180px]">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium whitespace-nowrap">
                        <Calendar size={13} className="text-slate-400 flex-shrink-0" />
                        <span>{formatDateIndonesian(item.tanggal)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                        <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[180px]">{item.tempat}</span>
                      </div>
                    </Td>

                    {/* OPD */}
                    <Td className="min-w-[160px]">
                      <span className="text-xs font-semibold text-slate-800 block truncate max-w-[180px]">
                        {item.opd_name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        {item.opd_code}
                      </span>
                    </Td>

                    {/* Status Badge */}
                    <Td className="min-w-[100px] text-center whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </Td>

                    {/* Actions */}
                    <Td className="min-w-[130px] text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/notulen/${item.id}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors inline-flex items-center justify-center"
                          title="Lihat Detail Notulen"
                        >
                          <Eye size={16} />
                        </Link>

                        <Link
                          href={`/notulen/${item.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors inline-flex items-center justify-center"
                          title="Edit Notulen"
                        >
                          <Edit size={16} />
                        </Link>

                        <button
                          type="button"
                          onClick={() => setDuplicateTargetId(item.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors inline-flex items-center justify-center"
                          title="Salin / Duplikat Notulen"
                        >
                          <Copy size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(item.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors inline-flex items-center justify-center"
                          title="Hapus ke Tempat Sampah"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>

          {/* Pagination bar */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[var(--color-border)]">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={totalItems}
                perPage={10}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Duplicate Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(duplicateTargetId)}
        onClose={() => setDuplicateTargetId(null)}
        onConfirm={handleDuplicateConfirm}
        loading={isDuplicating}
        title="Duplikat Notulen?"
        message="Notulen ini akan diduplikasi beserta seluruh isinya menjadi draft baru."
        confirmLabel="Ya, Duplikat"
      />

      {/* Delete Confirmation Modal (Soft Delete) */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
        title="Hapus Notulen ke Sampah?"
        message="Notulen ini akan dipindahkan ke tempat pembuangan sementara (Trash) dan dapat dipulihkan kapan saja."
        confirmLabel="Hapus ke Sampah"
        danger
      />

      {/* Restore Confirmation Modal (Sesuai GAMBAR 25) */}
      <ConfirmDialog
        isOpen={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestoreConfirm}
        loading={isRestoring}
        title="Konfirmasi Pemulihan Dokumen"
        message={`Apakah Anda yakin ingin memulihkan naskah "${restoreTarget?.judul ?? ""}" kembali ke repositori aktif?`}
        confirmLabel="Ya, Pulihkan Naskah"
      />

      {/* Permanent Destroy Confirmation Modal (Sesuai GAMBAR 25) */}
      <ConfirmDialog
        isOpen={Boolean(destroyTarget)}
        onClose={() => setDestroyTarget(null)}
        onConfirm={handleDestroyConfirm}
        loading={isDestroying}
        title="Musnahkan Dokumen Secara Permanen?"
        message={`PERINGATAN: Naskah "${destroyTarget?.judul ?? ""}" beserta seluruh rekaman data lampiran akan dihapus secara permanen dari sistem. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Musnahkan Permanen"
        danger
      />
    </div>
  );
}

export default function NotulenListPage() {
  return (
    <React.Suspense fallback={<TableSkeleton rows={8} />}>
      <NotulenListContent />
    </React.Suspense>
  );
}
