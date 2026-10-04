"use client";

import React, { useState } from "react";
import { User, Mail, Shield, Building, Save, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { RoleBadge } from "@/components/ui/Badge";
import { getInitials } from "@/lib/utils";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [nip, setNip] = useState(user?.nip || "");
  const [jabatan, setJabatan] = useState(user?.jabatan || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 400));
      toast.success("Profil Berhasil Diperbarui", "Data pengguna telah diperbarui dalam sistem.");
    } catch {
      toast.error("Gagal Memperbarui Profil");
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials = getInitials(displayName || "Pengguna");

  return (
    <div className="w-full p-4 sm:p-6 space-y-6 animate-page-in pb-24">
      {/* Page Header */}
      <div className="border-b border-[var(--color-divider)] pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-secondary-900 tracking-tight">
          Profil Pengguna
        </h1>
        <p className="text-sm text-secondary-500 mt-0.5">
          Kelola informasi identitas akun pegawai dan otentikasi e-Notulen
        </p>
      </div>

      {/* User Header Profile Card */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 shadow-xs flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-emerald-800 text-white font-extrabold text-2xl flex items-center justify-center shadow-md flex-shrink-0">
          {initials}
        </div>
        <div className="space-y-1 text-center sm:text-left flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-secondary-900">
              {displayName}
            </h2>
            {user && <RoleBadge role={user.role} />}
          </div>
          <p className="text-xs text-secondary-500 font-medium">
            {jabatan || "Pegawai Pemkab Purbalingga"} &bull; NIP {nip || "—"}
          </p>
          <div className="flex items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-secondary-600">
            <span className="flex items-center gap-1">
              <Building size={14} className="text-emerald-700" />
              {user?.opdName || "Diskominfo"}
            </span>
            <span className="flex items-center gap-1">
              <Mail size={14} className="text-emerald-700" />
              {email}
            </span>
          </div>
        </div>
      </div>

      {/* Form Settings & Keycloak Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Edit Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary-700 font-bold">
              <User size={18} />
              <h2>Sunting Informasi Profil</h2>
            </div>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                fieldId="profile-display-name"
                label="Nama Lengkap & Gelar"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  fieldId="profile-nip"
                  label="NIP (Nomor Induk Pegawai)"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                />

                <Input
                  fieldId="profile-jabatan"
                  label="Jabatan"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                />
              </div>

              <Input
                fieldId="profile-email"
                type="email"
                label="Alamat Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail size={16} />}
                required
              />

              <div className="pt-4 flex justify-end">
                <Button type="submit" variant="primary" size="md" loading={isSubmitting}>
                  <Save size={16} />
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Keycloak SSO & OPD Identity Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-primary-700 font-bold">
                <Shield size={18} />
                <h2>Autentikasi Keycloak</h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-3 text-xs">
              <div>
                <span className="text-secondary-400 block mb-0.5">Keycloak User ID (SUB):</span>
                <span className="font-mono text-[11px] bg-secondary-100 p-1.5 rounded block text-secondary-700 break-all">
                  {user?.sub || "sub-mock-uuid-keycloak"}
                </span>
              </div>

              <div>
                <span className="text-secondary-400 block mb-0.5">Username SSO:</span>
                <span className="font-semibold text-secondary-800">
                  {user?.preferredUsername || "user.sso"}
                </span>
              </div>

              <div>
                <span className="text-secondary-400 block mb-0.5">Level Akses (Role):</span>
                <span className="font-bold text-emerald-800 uppercase tracking-wide">
                  {user?.role || "super_admin"}
                </span>
              </div>

              <div className="pt-2 border-t border-secondary-200 text-emerald-800 flex items-center gap-1.5 font-semibold">
                <CheckCircle size={15} />
                <span>Terhubung ke Keycloak Pemkab</span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
