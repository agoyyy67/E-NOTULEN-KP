"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Building2,
  Upload,
  Save,
  MapPin,
  Phone,
  Mail,
  Camera,
  Eye,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { getOpdSettings, updateOpdSettings, getOpdList } from "@/lib/actions/settings";
import { uploadOpdLogo } from "@/lib/actions/upload";
import { validateLogoFile } from "@/lib/utils/upload-validation";
import { getPublicImageUrl } from "@/lib/utils";
import { mockOpdList } from "@/lib/data/settings";
import type { OpdSettings } from "@/types/notulen";

export default function OpdSettingsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [, setOpd] = useState<OpdSettings | null>(null);

  // Dynamic OPD list (fetched from API proxy or fallback to mock)
  const [opdList, setOpdList] = useState<{ kode_unit: string; nama: string }[]>(mockOpdList);

  useEffect(() => {
    getOpdList().then((list) => {
      if (list && list.length > 0) {
        setOpdList(
          list.map((item) => {
            const rec = item as unknown as Record<string, string>;
            return {
              kode_unit: item.kode_unit || rec.id || "",
              nama: item.nama || rec.label || rec.opd_name || "",
            };
          })
        );
      }
    });
  }, []);

  // Allow Super Admin to select any OPD
  const [selectedOpdCode, setSelectedOpdCode] = useState<string>(
    user?.opdCode || "T8",
  );
  const opdCode = selectedOpdCode;

  // Sync selectedOpdCode when user loads
  useEffect(() => {
    if (user?.opdCode) {
      setSelectedOpdCode(user.opdCode);
    }
  }, [user?.opdCode]);

  // Form fields
  const [opdName, setOpdName] = useState("");
  const [alamat, setAlamat] = useState("");
  const [telepon, setTelepon] = useState("");
  const [fax, setFax] = useState("");
  const [email, setEmail] = useState("");
  const [kodePos, setKodePos] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [logoImageError, setLogoImageError] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLogoImageError(false);
        const data = await getOpdSettings(opdCode);
        const matchingOpd = opdList.find((o) => o.kode_unit === opdCode);
        const fallbackName = matchingOpd?.nama || user?.opdName || user?.displayName || "";

        if (data) {
          setOpd(data);
          setOpdName(data.opd_name || fallbackName);
          setAlamat(data.alamat || "");
          setTelepon(data.telepon || "");
          setFax(data.fax || "");
          setEmail(data.email || "");
          setKodePos(data.kode_pos || "");
          setLogoUrl(data.logo_url);
        } else {
          setOpd(null);
          setOpdName(fallbackName);
          setAlamat("");
          setTelepon("");
          setFax("");
          setEmail("");
          setKodePos("");
          setLogoUrl(undefined);
        }
      } catch (err) {
        console.error("Gagal memuat pengaturan OPD:", err);
        const matchingOpd = opdList.find((o) => o.kode_unit === opdCode);
        setOpdName(matchingOpd?.nama || user?.opdName || user?.displayName || "");
      }
    }
    loadData();
  }, [opdCode, opdList, user?.opdName, user?.displayName]);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateLogoFile(file);
    if (!validation.valid) {
      setLogoError(validation.error);
      return;
    }

    try {
      setLogoUploading(true);
      setLogoError(null);
      const formData = new FormData();
      formData.append("logo", file);
      const uploadedUrl = await uploadOpdLogo(opdCode, formData);
      setLogoImageError(false);
      setLogoUrl(`${uploadedUrl}?t=${Date.now()}`);
      toast.success("Logo OPD Berhasil Diunggah");
    } catch {
      setLogoError("Gagal mengunggah logo OPD.");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const finalOpdName = opdName.trim() || user?.opdName || user?.displayName || `OPD ${opdCode}`;
      await updateOpdSettings(opdCode, {
        opd_name: finalOpdName,
        alamat: alamat.trim(),
        telepon: telepon.trim(),
        fax: fax.trim(),
        email: email.trim(),
        kode_pos: kodePos.trim(),
      });
      toast.success("Pengaturan Kop Surat OPD Berhasil Disimpan");
    } catch {
      toast.error("Gagal Menyimpan Pengaturan OPD");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full p-4 sm:p-6 space-y-6 pb-24 animate-page-in">
      {/* Page Header */}
      <div className="border-b border-[var(--color-divider)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-secondary-900 tracking-tight">
            Pengaturan Kop Surat OPD
          </h1>
          <p className="text-sm text-secondary-500 mt-0.5">
            Kelola identitas instansi, alamat, dan logo untuk Kop Surat dokumen notulen resmi
          </p>
        </div>

        {/* Super Admin OPD Switcher */}
        {(!user?.opdCode || user?.role === "admin") && (
          <div className="w-full sm:w-72 space-y-1">
            <label className="block text-xs font-bold text-secondary-700 uppercase tracking-wider">
              Pilih OPD / Instansi
            </label>
            <Combobox
              options={opdList.map((o) => ({
                value: o.kode_unit,
                label: `${o.nama} (${o.kode_unit})`,
              }))}
              value={selectedOpdCode}
              onChange={(val) => setSelectedOpdCode(val)}
              placeholder="Ketik untuk mencari OPD..."
            />
          </div>
        )}
      </div>

      {/* Section 1: Live Kop Surat Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-primary-700 font-bold">
              <Eye size={18} />
              <h2>Pratinjau Kop Surat Resmi</h2>
            </div>
            <span className="text-xs text-secondary-400 font-mono">
              Kode SKPD: {opdCode}
            </span>
          </div>
        </CardHeader>
        <CardBody>
          <div className="bg-white border-2 border-double border-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs space-y-2 text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              {/* Logo Preview */}
              {logoUrl && !logoImageError ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={getPublicImageUrl(logoUrl)}
                  alt="Logo OPD"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded"
                  onError={() => setLogoImageError(true)}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/logo-purbalingga-official.png"
                  alt="Logo Pemkab Purbalingga (Default)"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded"
                />
              )}

              {/* Text Header */}
              <div className="text-center space-y-0.5">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
                  PEMERINTAH KABUPATEN PURBALINGGA
                </h3>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wide">
                  {opdName || user?.opdName || "DINAS / INSTANSI OPD"}
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  {alamat || "Jl. Onje No. 12, Purbalingga, Jawa Tengah"}
                  {kodePos && ` ${kodePos}`}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {telepon && `Telp: ${telepon}`}
                  {fax && ` | Fax: ${fax}`}
                  {email && ` | Email: ${email}`}
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Section 2: Form & Logo Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary-700 font-bold">
              <Building2 size={18} />
              <h2>Informasi Identitas Instansi</h2>
            </div>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                fieldId="opd-nama"
                label="Nama OPD / SKPD"
                value={opdName}
                onChange={(e) => setOpdName(e.target.value)}
                disabled={user?.role !== "admin"}
                helperText={
                  user?.role !== "admin"
                    ? "Hanya Super Admin yang dapat mengubah nama OPD."
                    : undefined
                }
              />

              <Input
                fieldId="opd-alamat"
                label="Alamat Lengkap Kantor"
                placeholder="misal: Jl. Onje No. 12, Purbalingga"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                leftIcon={<MapPin size={16} />}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  fieldId="opd-telepon"
                  label="Nomor Telepon"
                  placeholder="misal: (0281) 891234"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  leftIcon={<Phone size={16} />}
                />

                <Input
                  fieldId="opd-fax"
                  label="Nomor Fax (opsional)"
                  placeholder="misal: (0281) 891235"
                  value={fax}
                  onChange={(e) => setFax(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  fieldId="opd-email"
                  type="email"
                  label="Email Resmi OPD"
                  placeholder="misal: diskominfo@purbalinggakab.go.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail size={16} />}
                  required
                />

                <Input
                  fieldId="opd-kodepos"
                  label="Kode Pos"
                  placeholder="misal: 53311"
                  value={kodePos}
                  onChange={(e) => setKodePos(e.target.value)}
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" variant="primary" size="md" loading={isSubmitting}>
                  <Save size={16} />
                  Simpan Kop Surat
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Logo Upload Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary-700 font-bold">
              <Camera size={18} />
              <h2>Logo OPD</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <input
              ref={logoInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={handleLogoSelect}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-secondary-300 rounded-2xl text-center bg-secondary-50">
              {logoUrl && !logoImageError ? (
                <div className="space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPublicImageUrl(logoUrl)}
                    alt="Logo OPD"
                    className="w-24 h-24 object-contain mx-auto rounded-xl shadow-sm bg-white p-2"
                    onError={() => setLogoImageError(true)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={logoUploading}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload size={14} />
                    Ganti Logo
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo-purbalingga-official.png"
                    alt="Logo Pemkab Purbalingga (Default)"
                    className="w-20 h-20 object-contain mx-auto rounded-xl shadow-xs bg-white p-2 border border-slate-200"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Menggunakan Logo Default Pemkab Purbalingga
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Unggah logo khusus jika OPD Anda memiliki logo sendiri (Maks 2MB, PNG/JPG)
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={logoUploading}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload size={14} />
                    Unggah Logo Custom OPD
                  </Button>
                </div>
              )}
            </div>

            {logoError && (
              <p className="text-xs text-[var(--color-error)] font-medium text-center">
                {logoError}
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
