"use client";

import React, { useEffect, useState, useCallback } from "react";
import { CalendarDays, BarChart3, CheckCircle2, Clock, Calendar, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardBody, StatCard } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MonthlyTrendChart } from "@/components/dashboard/MonthlyTrendChart";
import { getDashboardStats } from "@/lib/actions/notulen";
import type { DashboardStats } from "@/types/notulen";

export default function MonthlyReportPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getDashboardStats({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setStats(data);
    } catch (err) {
      console.error("Gagal memuat statistik bulanan:", err);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="w-full p-4 sm:p-6 space-y-6 animate-page-in pb-16">
      {/* Page Header */}
      <div className="border-b border-[var(--color-divider)] pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-secondary-900 tracking-tight">
          Ringkasan Notulen Bulanan
        </h1>
        <p className="text-sm text-secondary-500 mt-0.5">
          Analisis statistik dan tren pembuatan risalah rapat per bulan tahun anggaran berjalan
        </p>
      </div>

      {/* Date Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[var(--color-border)] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-44">
            <Input
              label="Dari Tanggal"
              fieldId="monthly-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              leftIcon={<Calendar size={14} />}
            />
          </div>
          <div className="w-44">
            <Input
              label="Sampai Tanggal"
              fieldId="monthly-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              leftIcon={<Calendar size={14} />}
            />
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={loadStats}
          title="Refresh Data"
          className="h-10 self-end"
        >
          <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<CalendarDays size={22} className="text-emerald-700" />}
          label="Total Notulen Periode Ini"
          value={stats?.total_notulen ?? 0}
        />
        <StatCard
          icon={<CheckCircle2 size={22} className="text-emerald-700" />}
          label="Selesai (Final)"
          value={stats?.final_count ?? 0}
        />
        <StatCard
          icon={<Clock size={22} className="text-amber-700" />}
          label="Dalam Proses (Draft)"
          value={stats?.draft_count ?? 0}
        />
      </div>

      {/* Recharts Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary-700 font-bold">
            <BarChart3 size={18} />
            <h2>Grafik Produktivitas Notulen Per Bulan</h2>
          </div>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              Memuat grafik data...
            </div>
          ) : (
            <MonthlyTrendChart data={stats?.chart_monthly || []} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
