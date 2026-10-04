"use client";

import { useRouter } from "next/navigation";
import { NotulenForm } from "@/components/notulen/NotulenForm";
import { createNotulen } from "@/lib/actions/notulen";
import { useToast } from "@/hooks/useToast";

export default function CreateNotulenPage() {
  const router = useRouter();
  const toast = useToast();

  return (
    <NotulenForm
      isEdit={false}
      onSave={async (formData) => {
        const created = await createNotulen({
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
          content: formData.content,
          file_name: formData.file_name,
          file_url: formData.file_url,
          attendees: formData.attendees,
          attachments: formData.attachments,
        });

        // Direct redirect to editor after creation (Implementation Plan #1)
        if (created?.id) {
          toast.success("Notulen Berhasil Dibuat", "Mengarahkan ke halaman editor...");
          router.push(`/notulen/${created.id}/edit`);
        }
      }}
    />
  );
}
