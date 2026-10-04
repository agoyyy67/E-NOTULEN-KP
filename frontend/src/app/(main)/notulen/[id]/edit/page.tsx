"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { NotulenForm } from "@/components/notulen/NotulenForm";
import { getNotulenById, updateNotulen } from "@/lib/actions/notulen";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/hooks/useToast";
import type { Notulen } from "@/types/notulen";

export default function EditNotulenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const notulenId = resolvedParams.id;

  const router = useRouter();
  const toast = useToast();

  const [notulen, setNotulen] = useState<Notulen | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const data = await getNotulenById(notulenId);
        if (!data) {
          toast.error("Notulen Tidak Ditemukan");
          router.push("/notulen");
          return;
        }
        setNotulen(data);
      } catch {
        toast.error("Gagal Memuat Notulen");
        router.push("/notulen");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [notulenId, router, toast]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!notulen) return null;

  return (
    <NotulenForm
      initialData={notulen}
      isEdit={true}
      onSave={async (formData) => {
        await updateNotulen(notulenId, {
          judul: formData.judul,
          tanggal: formData.tanggal,
          waktu_mulai: formData.waktu_mulai,
          waktu_selesai: formData.waktu_selesai,
          tempat: formData.tempat,
          dipimpin_nama: formData.dipimpin_nama,
          dipimpin_jabatan: formData.dipimpin_jabatan,
          dipimpin_nip: formData.dipimpin_nip,
          pimpinan_nama: formData.pimpinan_nama,
          pimpinan_jabatan: formData.pimpinan_jabatan,
          pimpinan_nip: formData.pimpinan_nip,
          notulis_nama: formData.notulis_nama,
          notulis_jabatan: formData.notulis_jabatan,
          notulis_nip: formData.notulis_nip,
          opd_code: formData.opd_code,
          opd_name: formData.opd_name,
          input_type: formData.input_type,
          status: formData.status,
          content: formData.content,
          file_name: formData.file_name,
          file_url: formData.file_url,
          attendees: formData.attendees,
          attachments: formData.attachments,
        });
      }}
    />
  );
}
