"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { MapPin, Clock, CalendarDays, CheckCircle2 } from "lucide-react";
import { formatDateIndonesian } from "@/lib/utils";
import { Combobox } from "@/components/ui/Combobox";

type PublicNotulenInfo = {
  id: string;
  title: string;
  meeting_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  opd_name: string;
};

export default function PublicAbsensiPage() {
  const params = useParams();
  const id = params.id as string;

  const [info, setInfo] = useState<PublicNotulenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [opdList, setOpdList] = useState<{value: string, label: string}[]>([]);

  // Form states
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [position, setPosition] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchInfo() {
      try {
        const [res, opdRes] = await Promise.all([
          fetch(`/api/v1/public/absensi/${id}`),
          fetch("/api/v1/public/opd")
        ]);
        
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.message || "Gagal memuat data rapat.");
          return;
        }
        setInfo(json.data);

        if (opdRes.ok) {
          const opdJson = await opdRes.json();
          if (opdJson.success && Array.isArray(opdJson.data)) {
            setOpdList(opdJson.data.map((o: any) => ({
              value: o.label,
              label: o.label
            })));
          }
        }
      } catch (err: any) {
        setError("Gagal terhubung ke server.");
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      fetchInfo();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Nama lengkap wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/public/absensi/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, institution, position }),
      });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        alert(json.message || "Gagal menyimpan absensi");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">!</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
          <p className="text-gray-600">{error || "Data rapat tidak ditemukan."}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 animate-page-in">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[var(--color-divider)] max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Absensi Berhasil!</h2>
          <p className="text-gray-600 mb-6">
            Terima kasih <span className="font-semibold text-gray-800">{name}</span>, kehadiran Anda pada rapat ini telah tercatat di sistem.
          </p>
          <button 
            onClick={() => window.close()} // Might not work in all browsers, but good to have
            className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium transition-colors"
          >
            Tutup Halaman
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-divider)] sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-4 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-3">
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 opacity-80" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">E-Notulen Purbalingga</h1>
          <p className="text-sm text-gray-500 font-medium">{info.opd_name}</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col gap-6 animate-page-in">
        
        {/* Meeting Info Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--color-divider)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary-500"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">{info.title}</h2>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CalendarDays className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">{formatDateIndonesian(info.meeting_date)}</p>
                <p className="text-xs text-gray-500">Tanggal Rapat</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {info.start_time?.slice(0,5) || '-'} {info.end_time ? `- ${info.end_time.slice(0,5)}` : ''} WIB
                </p>
                <p className="text-xs text-gray-500">Waktu</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">{info.location || '-'}</p>
                <p className="text-xs text-gray-500">Tempat</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--color-divider)]">
          <div className="mb-5 text-center">
            <h3 className="text-lg font-bold text-gray-900">Form Kehadiran</h3>
            <p className="text-sm text-gray-500">Silakan isi data diri Anda di bawah ini</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Budi Santoso, S.Kom."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Instansi / OPD
              </label>
              <Combobox
                options={opdList}
                value={institution}
                onChange={setInstitution}
                placeholder="Pilih Instansi / OPD..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Jabatan
              </label>
              <input 
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Contoh: Kepala Bidang"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-base transition-all shadow-md shadow-primary-600/20 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? "Menyimpan..." : "Hadir"}
            </button>
          </form>
        </div>
        
      </main>
    </div>
  );
}
