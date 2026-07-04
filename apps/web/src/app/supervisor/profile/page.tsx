"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  department: string | null;
  employee_id: string;
  role: string;
  is_active: boolean;
}

export default function SupervisorProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form fields — synced from profile
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Load profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push("/");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        triggerToast("Gagal memuat profil.", "error");
        setLoading(false);
        return;
      }

      setProfile(data);
      setFullName(data.full_name || "");
      setDepartment(data.department || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setProfilePhoto(data.avatar_url || null);
      setLoading(false);
    };

    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveGeneralInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      triggerToast("Full Name dan Email wajib diisi.", "error");
      return;
    }
    if (!profile) return;

    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        department: department,
        phone: phone,
      })
      .eq("id", profile.id);

    setIsSaving(false);
    if (error) {
      triggerToast("Gagal menyimpan perubahan: " + error.message, "error");
    } else {
      triggerToast("Profil Supervisor berhasil diperbarui.", "success");
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Upload to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${profile.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      // Fallback: show local preview only
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
        triggerToast("Preview foto diperbarui (storage tidak tersedia).", "info");
      };
      reader.readAsDataURL(file);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
    setProfilePhoto(publicUrl);
    triggerToast("Foto profil berhasil diperbarui.", "success");
  };

  const handleLogout = async () => {
    triggerToast("MENUTUP SESI SUPERVISOR...", "info");
    await supabase.auth.signOut();
    setTimeout(() => {
      router.push("/");
    }, 1200);
  };

  const avatarSrc = profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "S")}&background=D32F2F&color=fff&size=200`;

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Memuat Profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white text-[#1A1A1A] font-body-md overflow-hidden relative">
      <style jsx global>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #FFFFFF; }
        ::-webkit-scrollbar-thumb { background: #1A1A1A; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #D32F2F; }
        * { box-shadow: none !important; }
      `}</style>

      {/* SideNavBar */}
      <aside className="fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white border-r-2 border-[#1A1A1A]">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN.AI</h1>
          <p className="text-[10px] text-white opacity-60 uppercase font-bold tracking-widest">
            Industrial Precision
          </p>
        </div>

        <nav className="flex-1 space-y-2 px-2">
          <button
            onClick={() => router.push("/supervisor/dashboard")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => router.push("/supervisor/tasks")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">assignment</span>
            <span>Tasks</span>
          </button>

          <button
            onClick={() => router.push("/supervisor/reports")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">assessment</span>
            <span>Reports</span>
          </button>
        </nav>

        {/* Profile Footer Widget */}
        <div className="px-4 mt-auto border-t border-white/10 pt-4 pb-2">
          <button
            onClick={handleLogout}
            className="w-full bg-white text-[#D32F2F] hover:bg-white/90 transition-colors py-2 px-4 flex items-center justify-center gap-2 rounded-full font-bold text-xs cursor-pointer border-none mb-4"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Logout</span>
          </button>

          <div className="flex items-center gap-3 text-left w-full bg-white/10 p-2 rounded-lg">
            <div className="w-10 h-10 rounded-full border-2 border-[#D32F2F] overflow-hidden shrink-0">
              <img alt="Supervisor" className="w-full h-full object-cover" src={avatarSrc} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-white uppercase leading-none mb-1">
                {fullName || "Supervisor"}
              </p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                {profile?.role || "supervisor"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 w-[calc(100%-220px)] border-b-2 border-[#1A1A1A] bg-white flex justify-between items-center h-20 px-10 z-40">
        <div>
          <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">Supervisor Profile</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Kelola kredensial & detail profil auditor</p>
        </div>
        <button
          onClick={() => router.push("/supervisor/dashboard")}
          className="flex items-center gap-2 border-2 border-[#1A1A1A] rounded-full px-4 py-2 font-bold text-xs uppercase hover:bg-gray-100 transition-all cursor-pointer bg-transparent"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Dashboard</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)] scroll-container">
        <div className="p-10 max-w-[1200px] mx-auto space-y-10">

          {/* Profile Header Card */}
          <section className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
            <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
              <div className="w-32 h-32 rounded-full border-4 border-[#D32F2F] overflow-hidden shrink-0 bg-gray-100">
                <img src={avatarSrc} alt={fullName} className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="material-symbols-outlined text-2xl">photo_camera</span>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h3 className="font-headline-lg text-2xl font-extrabold text-black uppercase">{fullName || "—"}</h3>
                <span className="bg-[#D32F2F] text-white px-3 py-1 rounded-full text-[9px] font-extrabold tracking-widest uppercase">
                  Supervisor
                </span>
                {profile?.is_active && (
                  <span className="bg-green-100 text-green-700 border border-green-300 px-3 py-1 rounded-full text-[9px] font-extrabold tracking-widest uppercase">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                Department: {department || "—"} | Employee ID: {profile?.employee_id || "—"}
              </p>
              <p className="text-xs text-gray-400 font-medium">
                Email: <span className="font-bold text-gray-600">{email}</span>
              </p>
              <button
                onClick={handlePhotoClick}
                className="mt-2 text-xs font-bold text-[#D32F2F] hover:underline bg-transparent border-none cursor-pointer p-0"
              >
                Ganti Foto Profil
              </button>
            </div>
          </section>

          {/* Form Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

            {/* General Info Card */}
            <section className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 space-y-6">
              <div className="pb-4 border-b border-gray-100">
                <h4 className="font-headline-md text-lg text-black font-extrabold uppercase tracking-tight">Detail Akun</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Perbarui field informasi sistem</p>
              </div>

              <form onSubmit={handleSaveGeneralInfo} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white border border-[#1A1A1A] rounded-lg p-2.5 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Departemen
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-white border border-[#1A1A1A] rounded-lg p-2.5 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Alamat Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-[9px] text-gray-400 font-semibold mt-1">Email tidak dapat diubah.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Nomor Telepon
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-[#1A1A1A] rounded-lg p-2.5 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"
                    placeholder="+62..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                      Employee ID (Read Only)
                    </label>
                    <input
                      type="text"
                      value={profile?.employee_id || "—"}
                      disabled
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                      Role (Read Only)
                    </label>
                    <input
                      type="text"
                      value={profile?.role || "supervisor"}
                      disabled
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-[#D32F2F] text-white border-2 border-[#1A1A1A] rounded-full py-3 font-bold text-xs uppercase tracking-wider hover:bg-black transition-colors cursor-pointer mt-4 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </button>
              </form>
            </section>

            {/* Account Stats Card */}
            <section className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 space-y-6">
              <div className="pb-4 border-b border-gray-100">
                <h4 className="font-headline-md text-lg text-black font-extrabold uppercase tracking-tight">Info Sistem</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Status akun & keamanan</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Status Akun</p>
                    <p className="font-extrabold text-sm mt-0.5">
                      {profile?.is_active ? (
                        <span className="text-green-600">● Active</span>
                      ) : (
                        <span className="text-red-500">● Inactive</span>
                      )}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-green-600">verified_user</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Role</p>
                    <p className="font-extrabold text-sm mt-0.5 uppercase">{profile?.role || "supervisor"}</p>
                  </div>
                  <span className="material-symbols-outlined text-[#D32F2F]">admin_panel_settings</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Employee ID</p>
                    <p className="font-extrabold text-sm mt-0.5 font-mono">{profile?.employee_id || "—"}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400">badge</span>
                </div>

                <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-500 text-sm mt-0.5">info</span>
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    Untuk mengubah email atau password, hubungi administrator sistem.
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full bg-white text-[#D32F2F] border-2 border-[#D32F2F] rounded-full py-3 font-bold text-xs uppercase tracking-wider hover:bg-[#D32F2F] hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  Keluar dari Sistem
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Toast Notification Container */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-4 bg-[#1A1A1A] text-white px-8 py-4 rounded-lg border-2 border-[#D32F2F] shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300"
          >
            <span className="material-symbols-outlined text-[#D32F2F]">
              {t.type === "success" ? "check_circle" : t.type === "error" ? "error" : "info"}
            </span>
            <span className="font-black uppercase tracking-widest text-xs">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
