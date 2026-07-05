"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function VendorProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Form Fields State
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [company, setCompany] = useState("");
  const [facility, setFacility] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast Trigger Helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setCurrentUser(profile);
      setFullName(profile.full_name || "");
      setDepartment(profile.department || "Electrical & HVAC Operations");
      setCompany(profile.company || "Apex Services Ltd.");
      setFacility(profile.facility || "Factory Complex - All Wings");
      setEmail(user.email || "");
      setPhone(profile.phone || "");
      setProfilePhoto(profile.avatar_url || "");

    } catch (e: any) {
      console.error(e);
      triggerToast("Failed to load profile: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save General Info Handler
  const handleSaveGeneralInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      triggerToast("Full name is required.", "error");
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          department,
          company,
          facility,
          phone,
          avatar_url: profilePhoto
        })
        .eq("id", user.id);

      if (error && (error.message.includes("column") || error.message.includes("does not exist") || error.code === "42703")) {
        console.warn("Falling back to update profiles table without company and facility fields...", error);
        const fallbackRes = await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            department,
            phone,
            avatar_url: profilePhoto
          })
          .eq("id", user.id);
        error = fallbackRes.error;
      }

      if (error) throw error;
      if (typeof window !== "undefined") {
        localStorage.setItem("userName", fullName);
        window.dispatchEvent(new Event("profileUpdated"));
      }
      triggerToast("Profile updated successfully.", "success");
      loadProfile();
    } catch (e: any) {
      console.error(e);
      triggerToast("Failed to update profile: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Profile Photo Change Helper
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        triggerToast("Uploading photo...", "info");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, { cacheControl: "3600", upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

        // Update database right away
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl })
          .eq("id", user.id);

        if (updateError) throw updateError;

        setProfilePhoto(publicUrl);
        if (typeof window !== "undefined") {
          localStorage.setItem("userAvatar", publicUrl);
          window.dispatchEvent(new Event("profileUpdated"));
        }
        triggerToast("Profile picture uploaded successfully.", "success");
        loadProfile();
      } catch (e: any) {
        console.error(e);
        triggerToast("Failed to upload photo: " + e.message, "error");
      }
    }
  };

  // Run Logout simulation
  const handleLogout = async () => {
    triggerToast("CLOSING VENDOR TERMINAL...", "info");
    await supabase.auth.signOut();
    setTimeout(() => {
      router.push("/");
    }, 1200);
  };

  const avatarSrc = profilePhoto ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "V")}&background=D32F2F&color=fff&size=200`;

  if (loading && !currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Loading Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white text-[#1A1A1A] font-body-md overflow-hidden relative">
      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #FFFFFF;
        }
        ::-webkit-scrollbar-thumb {
          background: #1A1A1A;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #D32F2F;
        }
        * {
          box-shadow: none !important;
        }
      `}</style>

      {/* SideNavBar (matching vendor pages layout style) */}
      <aside className="fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white border-r-2 border-[#1A1A1A]">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN.AI</h1>
          <p className="text-[10px] text-white opacity-60 uppercase font-bold tracking-widest">
            Industrial Precision
          </p>
        </div>

        <nav className="flex-1 space-y-2 px-2">
          <button
            onClick={() => router.push("/vendor")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => router.push("/vendor/tasks")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">assignment</span>
            <span>Tasks</span>
          </button>

          <button
            onClick={() => router.push("/vendor/pm")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">settings_applications</span>
            <span>PM</span>
          </button>

          <button
            onClick={() => router.push("/vendor/reports")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none bg-transparent"
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

          <button
            onClick={() => {}}
            className="flex items-center gap-3 text-left w-full bg-white/10 p-2 rounded-lg transition-colors cursor-pointer border-none"
          >
            <div className="w-10 h-10 rounded-full border-2 border-[#D32F2F] overflow-hidden shrink-0">
              <img
                alt="Vendor Headshot"
                className="w-full h-full object-cover"
                src={avatarSrc}
              />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-white uppercase leading-none mb-1">{fullName || "Apex Services"}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Vendor ID: #{currentUser?.id?.substring(0, 4).toUpperCase() || "N/A"}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 w-[calc(100%-220px)] border-b-2 border-[#1A1A1A] bg-white flex justify-between items-center h-20 px-10 z-40">
        <div>
          <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">Vendor Profile</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Manage vendor credentials & profile details</p>
        </div>
        <button
          onClick={() => router.push("/vendor")}
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
                <h3 className="font-headline-lg text-2xl font-extrabold text-black uppercase">{fullName}</h3>
                <span className="bg-[#D32F2F] text-white px-3 py-1 rounded-full text-[9px] font-extrabold tracking-widest uppercase">
                  Vendor Partner
                </span>
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                Department: {department} | Vendor ID: #{currentUser?.id?.substring(0, 4).toUpperCase() || "N/A"}
              </p>
              <p className="text-xs text-gray-400 font-medium">
                Username: <span className="font-bold text-gray-600">{currentUser?.username || "N/A"}</span>
              </p>
              <button
                onClick={handlePhotoClick}
                className="mt-2 text-xs font-bold text-[#D32F2F] hover:underline bg-transparent border-none cursor-pointer p-0"
              >
                Change Profile Portrait
              </button>
            </div>
          </section>

          {/* Form Content Grid */}
          <div className="max-w-2xl">
            
            {/* General Info Card */}
            <section className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 space-y-6">
              <div className="pb-4 border-b border-gray-100">
                <h4 className="font-headline-md text-lg text-black font-extrabold uppercase tracking-tight">Account Details</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Update system info fields</p>
              </div>

              <form onSubmit={handleSaveGeneralInfo} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Full Name
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
                      Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-white border border-[#1A1A1A] rounded-lg p-2.5 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Company
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-white border border-[#1A1A1A] rounded-lg p-2.5 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Facility Location
                    </label>
                    <input
                      type="text"
                      value={facility}
                      onChange={(e) => setFacility(e.target.value)}
                      className="w-full bg-white border border-[#1A1A1A] rounded-lg p-2.5 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Email Address (Read Only)
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-[#1A1A1A] rounded-lg p-2.5 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                      Role (Read Only)
                    </label>
                    <input
                      type="text"
                      value={currentUser?.role || "vendor"}
                      disabled
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                      Username (Read Only)
                    </label>
                    <input
                      type="text"
                      value={currentUser?.username || "N/A"}
                      disabled
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#D32F2F] text-white border-2 border-[#1A1A1A] rounded-full py-3 font-bold text-xs uppercase tracking-wider hover:bg-black transition-colors cursor-pointer mt-4 active:scale-95 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save General Info"}
                </button>
              </form>
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
