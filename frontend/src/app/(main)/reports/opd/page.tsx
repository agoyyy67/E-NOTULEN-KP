"use client";

import React, { useState, useEffect } from "react";
import { Building2, Award } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { OpdRankChart } from "@/components/dashboard/OpdRankChart";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { getDashboardStats } from "@/lib/actions/notulen";

export default function OpdReportPage() {
  const [data, setData] = useState<{ opd_name: string; total: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const stats = await getDashboardStats();
        setData(stats.chart_per_opd || []);
      } catch (err) {
        console.error("Gagal memuat rekapitulasi OPD:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="w-full p-4 sm:p-6 space-y-6 animate-page-in pb-16">
      {/* Page Header */}
      <div className="border-b border-[var(--color-divider)] pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-secondary-900 tracking-tight">
          Laporan Rekapitulasi Per OPD
        </h1>
        <p className="text-sm text-secondary-500 mt-0.5">
          Peringkat keaktifan dan jumlah notulen rapat terbitan masing-masing Perangkat Daerah
        </p>
      </div>

      {/* OPD Ranking Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary-700 font-bold">
            <Award size={18} />
            <h2>Peringkat OPD Teraktif</h2>
          </div>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="h-72 flex items-center justify-center text-secondary-400">
              Memuat grafik...
            </div>
          ) : data.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-secondary-400 text-sm">
              Belum ada data notulen dari OPD.
            </div>
          ) : (
            <OpdRankChart data={data} />
          )}
        </CardBody>
      </Card>

      {/* OPD Table Breakdown */}
      <Card noPadding>
        <CardHeader className="p-5 border-b border-secondary-200">
          <div className="flex items-center gap-2 text-secondary-800 font-bold">
            <Building2 size={18} />
            <h2>Rincian Jumlah Risalah Per Instansi</h2>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : data.length === 0 ? (
            <p className="p-6 text-center text-xs text-secondary-400">
              Belum ada data risalah rapat per instansi.
            </p>
          ) : (
            <Table responsive>
              <THead>
                <Tr hoverable={false}>
                  <Th className="w-16 text-center">Peringkat</Th>
                  <Th>Nama Organisasi Perangkat Daerah (OPD)</Th>
                  <Th className="text-center">Total Risalah Rapat</Th>
                </Tr>
              </THead>
              <TBody>
                {data.map((item, index) => (
                  <Tr key={item.opd_name}>
                    <Td className="text-center font-bold text-secondary-600">
                      #{index + 1}
                    </Td>
                    <Td className="font-semibold text-secondary-900">
                      {item.opd_name}
                    </Td>
                    <Td className="text-center font-bold text-emerald-700">
                      {item.total} Notulen
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

