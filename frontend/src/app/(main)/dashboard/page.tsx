"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  TrendingUp,
  FileClock,
  CheckCircle2,
  Building2,
  ArrowRight,
  Eye,
  Edit,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge, RoleBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard, Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table";
import { StatCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { MonthlyTrendChart } from "@/components/dashboard/MonthlyTrendChart";
import { OpdRankChart } from "@/components/dashboard/OpdRankChart";
import { getDashboardStats } from "@/lib/actions/notulen";
import { formatDateIndonesian } from "@/lib/utils";
import type { DashboardStats } from "@/types/notulen";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error("Gagal memuat statistik dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const greeting =
    user?.role === "officer"
      ? `Selamat datang, ${user.displayName.split(",")[0]}`
      : user?.role === "operator"
      ? `Selamat datang, ${user.displayName}`
      : "Selamat datang, Super Admin";

  return (
    <div className="w-full p-4 sm:p-6 space-y-8 animate-page-in pb-16">
      {/* Page Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.2),transparent_60%)] pointer-events-none" />

        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Dashboard e-Notulen
            </h1>
            {user && <RoleBadge role={user.role} />}
            {user?.opdName && (
              <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-emerald-200 border border-white/10 font-medium backdrop-blur-sm">
                {user.opdName}
              </span>
            )}
          </div>
          <p className="text-sm text-emerald-100/90 font-medium">{greeting}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap z-10">
          <Link href="/reports">
            <Button
              variant="secondary"
              size="md"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              <BarChart3 size={16} />
              Rekap Laporan
            </Button>
          </Link>
          <Link href="/notulen/create">
            <Button
              variant="primary"
              size="md"
              className="bg-emerald-500 hover:bg-emerald-400 text-white border-none shadow-md shadow-emerald-950/40"
            >
              <Plus size={16} />
              Buat Notulen Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <section
          aria-label="Ringkasan statistik notulen"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            icon={<FileText size={22} className="text-emerald-700" />}
            label="Total Notulen Rapat"
            value={stats?.total_notulen ?? "0"}
            trend={{ value: 12, direction: "up" }}
          />
          <StatCard
            icon={<TrendingUp size={22} className="text-teal-700" />}
            label="Notulen Bulan Ini"
            value={stats?.bulan_ini ?? "0"}
          />
          <StatCard
            icon={<FileClock size={22} className="text-amber-700" />}
            label="Draft Belum Final"
            value={stats?.draft_count ?? "0"}
          />
          <StatCard
            icon={<CheckCircle2 size={22} className="text-emerald-700" />}
            label="Notulen Final (Arsip)"
            value={stats?.final_count ?? "0"}
          />
        </section>
      )}

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Chart */}
        <Card className={user?.role === "admin" ? "lg:col-span-2" : "lg:col-span-3"}>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-700" />
                <h2 className="text-base font-bold text-secondary-900">
                  Tren Pembuatan Notulen (2026)
                </h2>
              </div>
              <span className="text-xs text-secondary-400 font-medium">
                Draft vs Final Per Bulan
              </span>
            </div>
          </CardHeader>
          <CardBody>
            {stats?.chart_monthly ? (
              <MonthlyTrendChart data={stats.chart_monthly} />
            ) : (
              <div className="h-72 flex items-center justify-center text-secondary-400">
                Memuat grafik...
              </div>
            )}
          </CardBody>
        </Card>

        {/* OPD Ranking Chart (Admin Only) */}
        {user?.role === "admin" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-emerald-700" />
                <h2 className="text-base font-bold text-secondary-900">
                  Peringkat OPD Teraktif
                </h2>
              </div>
            </CardHeader>
            <CardBody>
              {stats?.chart_per_opd ? (
                <OpdRankChart data={stats.chart_per_opd} />
              ) : (
                <div className="h-72 flex items-center justify-center text-secondary-400">
                  Memuat grafik...
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Notulen Terbaru Table */}
      <Card noPadding>
        <CardHeader className="p-5 border-b border-secondary-200">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-emerald-700" />
              <h2 className="text-base font-bold text-secondary-900">
                Notulen Terbaru
              </h2>
            </div>
            <Link
              href="/notulen"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
            >
              <span>Lihat Semua</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : !stats?.recent_notulen || stats.recent_notulen.length === 0 ? (
            <p className="p-6 text-center text-xs text-secondary-400">
              Belum ada notulen terbaru.
            </p>
          ) : (
            <Table responsive>
              <THead>
                <Tr hoverable={false}>
                  <Th>Judul Rapat</Th>
                  <Th>Tanggal</Th>
                  <Th>OPD</Th>
                  <Th className="text-center">Status</Th>
                  <Th className="text-right">Aksi</Th>
                </Tr>
              </THead>
              <TBody>
                {stats.recent_notulen.map((item) => (
                  <Tr key={item.id}>
                    <Td className="font-bold text-secondary-900 max-w-[280px]">
                      <Link
                        href={`/notulen/${item.id}`}
                        className="hover:text-emerald-700 transition-colors line-clamp-1 text-sm"
                      >
                        {item.judul}
                      </Link>
                      <span className="text-[11px] font-normal text-secondary-500 block">
                        Notulis: {item.notulis_nama}
                      </span>
                    </Td>
                    <Td className="text-xs text-secondary-600 font-medium">
                      {formatDateIndonesian(item.tanggal)}
                    </Td>
                    <Td>
                      <Badge variant="default" className="font-normal text-[11px]">
                        {item.opd_name}
                      </Badge>
                    </Td>
                    <Td className="text-center">
                      <StatusBadge status={item.status} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/notulen/${item.id}`}
                          className="p-1.5 rounded text-secondary-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors inline-flex items-center justify-center"
                          title="Lihat Detail"
                        >
                          <Eye size={15} />
                        </Link>
                        <Link
                          href={`/notulen/${item.id}/edit`}
                          className="p-1.5 rounded text-secondary-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors inline-flex items-center justify-center"
                          title="Edit"
                        >
                          <Edit size={15} />
                        </Link>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
