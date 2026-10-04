"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
} from "@/lib/actions/notulen";
import { getOpdList } from "@/lib/actions/settings";
import { formatDateIndonesian } from "@/lib/utils";
import type { NotulenListItem, NotulenStatus } from "@/types/notulen";
import type { OpdData } from "@/types/api";

export default function NotulenListPage() {
  const { user } = useAuth();
  const toast = useToast();

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

  const handleRestore = async (id: string) => {
    try {
      await restoreNotulen(id);
      toast.success(
        "Notulen Dipulihkan",
        "Notulen berhasil dikembalikan dari sampah ke status Draft.",
      );
      fetchList();
    } catch {
      toast.error("Gagal Memulihkan Notulen");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      setIsDeleting(true);
      await deleteNotulen(deleteTargetId);
      toast.success("Notulen Dipindahkan ke Sampah");
      setDeleteTargetId(null);
      fetchList();
    } catch {
      toast.error("Gagal Menghapus Notulen");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full p-4 sm:p-6 space-y-6 animate-page-in pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-divider)] pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-secondary-900 tracking-tight">
            Daftar Notulen Rapat
          </h1>
          <p className="text-sm text-secondary-500 mt-0.5">
            Kelola seluruh arsip dan draft risalah rapat Kedinasan Pemkab Purbalingga
          </p>
        </div>

        <Link href="/notulen/create">
          <Button variant="primary" size="md">
            <Plus size={16} />
            Buat Notulen Baru
          </Button>
        </Link>
      </div>

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

          {/* Status filter */}
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
            icon={statusFilter === "deleted" ? <Trash2 size={36} className="text-amber-500" /> : <FileText size={36} />}
            title={
              statusFilter === "deleted"
                ? "Tempat Sampah Kosong"
                : search
                ? "Tidak Ada Notulen Ditemukan"
                : "Tidak Ada Notulen Aktif"
            }
            description={
              statusFilter === "deleted"
                ? "Tidak ada notulen rapat yang berada di tempat sampah saat ini."
                : search
                ? "Tidak ada notulen yang sesuai dengan kata kunci pencarian Anda."
                : "Belum ada notulen rapat yang aktif. Anda dapat membuat notulen baru atau memeriksa folder Sampah."
            }
            action={
              statusFilter === "deleted" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusFilter("all")}
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
                    onClick={() => setStatusFilter("deleted")}
                  >
                    <Trash2 size={15} />
                    Lihat Trash / Sampah
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
              <Tr hoverable={false}>
                <Th className="min-w-[260px]">Judul Rapat & Pelaksana</Th>
                <Th className="min-w-[180px]">Waktu & Tempat</Th>
                <Th className="min-w-[160px]">OPD Pengampu</Th>
                <Th className="min-w-[100px] text-center">Status</Th>
                <Th className="min-w-[130px] text-right">Aksi</Th>
              </Tr>
            </THead>
            <TBody>
              {items.map((item) => (
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

                      {item.status !== "deleted" ? (
                        <>
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
                            title="Hapus ke Sampah"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRestore(item.id)}
                          className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1"
                          title="Pulihkan Notulen dari Sampah"
                        >
                          <RotateCcw size={14} />
                          <span>Pulihkan</span>
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
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

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
        title="Hapus Notulen ke Sampah?"
        message="Notulen ini akan dipindahkan ke tempat sampah dan dapat dipulihkan kapan saja oleh Admin."
        confirmLabel="Hapus Notulen"
        danger
      />
    </div>
  );
}
