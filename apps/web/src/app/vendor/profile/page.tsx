"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToasts } from "@/lib/useToasts";
import { getMySignatures, saveSignature, setDefaultSignature, deleteSignature } from "@/lib/signatures";

export default function VendorProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


  // Form Fields State
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [company, setCompany] = useState("");
  const [facility, setFacility] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Digital Signature State & Refs
  const [signaturesList, setSignaturesList] = useState<any[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);

  // Toast Trigger Helper
  const { toasts, triggerToast } = useToasts(3500, "success");

  const loadSignatures = async () => {
    try {
      const sigs = await getMySignatures();
      setSignaturesList(sigs);
    } catch (e: any) {
      console.error("Failed to load signatures:", e);
    }
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
      setCompany(profile.company || "");
      setFacility(profile.facility || "Factory Complex - All Wings");
      setEmail(user.email || "");
      setPhone(profile.phone || "");
      setProfilePhoto(profile.avatar_url || "");

      await loadSignatures();
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

  // Signature drawing/handling methods
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#1A1A1A";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveDrawnSignature = async () => {
    if (!canvasRef.current) return;

    // Check if canvas is empty before saving
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
    const isEmpty = !buffer.some(color => color !== 0);
    if (isEmpty) {
      triggerToast("Canvas is empty. Draw signature first.", "error");
      return;
    }

    const base64Data = canvas.toDataURL("image/png");
    try {
      triggerToast("Replacing existing signature...", "info");
      await saveSignature({
        label: `Active Signature (${new Date().toLocaleDateString()})`,
        signatureData: base64Data,
        isDefault: true
      });
      triggerToast("Signature updated successfully.", "success");
      clearCanvas();
      await loadSignatures();
    } catch (err: any) {
      triggerToast("Failed to update signature: " + err.message, "error");
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        try {
          triggerToast("Replacing existing signature...", "info");
          await saveSignature({
            label: `Active Signature (${new Date().toLocaleDateString()})`,
            signatureData: base64Data,
            isDefault: true
          });
          triggerToast("Signature updated successfully.", "success");
          await loadSignatures();
        } catch (err: any) {
          triggerToast("Failed to update signature: " + err.message, "error");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSetDefaultSignature = async (id: string) => {
    try {
      await setDefaultSignature(id);
      triggerToast("Default signature updated.", "success");
      await loadSignatures();
    } catch (err: any) {
      triggerToast("Failed to set default signature: " + err.message, "error");
    }
  };

  const handleDeleteSignature = async (id: string) => {
    try {
      await deleteSignature(id);
      triggerToast("Signature deleted successfully.", "success");
      await loadSignatures();
    } catch (err: any) {
      triggerToast("Failed to delete signature: " + err.message, "error");
    }
  };

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
    triggerToast("Logging out...", "info");
    await supabase.auth.signOut();
    setTimeout(() => {
      router.push("/");
    }, 1200);
  };

  const avatarSrc = profilePhoto ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "V")}&background=D32F2F&color=fff&size=200`;

  if (loading && !currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-page">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Loading Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-page text-[#1A1A1A] font-body-md overflow-hidden relative">
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
      <aside className="hidden lg:flex fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white border-r border-gray-200">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-semibold text-white leading-tight">MAINTAIN</h1>
          <p className="text-[10px] text-[#D32F2F] font-medium uppercase tracking-[0.2em] mt-1">PM Verification</p>
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
            className="w-full bg-white text-[#D32F2F] hover:bg-white/90 transition-colors py-2 px-4 flex items-center justify-center gap-2 rounded-full font-medium text-xs cursor-pointer border-none mb-4"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Logout</span>
          </button>

          <button
            onClick={() => { }}
            className="flex items-center gap-3 text-left w-full bg-white/10 p-2 rounded-lg transition-colors cursor-pointer border-none"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
              <img
                alt="Vendor Headshot"
                className="w-full h-full object-cover"
                src={avatarSrc}
              />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium truncate text-white uppercase leading-none mb-1">{fullName || "Vendor"}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-medium">Vendor ID: #{currentUser?.id?.substring(0, 4).toUpperCase() || "N/A"}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 left-0 lg:left-[220px] w-full lg:w-[calc(100%-220px)] border-b border-gray-200 bg-white flex justify-between items-center h-20 px-6 lg:px-10 z-40">
        <div>
          <h2 className="font-headline-md text-xl text-[#1A1A1A] font-semibold uppercase tracking-tight">Vendor Profile</h2>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Manage vendor credentials & profile details</p>
        </div>
        <button
          onClick={() => router.push("/vendor")}
          className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 font-medium text-xs uppercase hover:bg-gray-100 transition-all cursor-pointer bg-transparent"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Dashboard</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="lg:ml-[220px] pt-20 h-screen overflow-y-auto bg-page w-full lg:w-[calc(100%-220px)] scroll-container pb-20 lg:pb-0">
        <div className="p-4 lg:p-10 max-w-[1200px] mx-auto space-y-6 lg:space-y-10">

          {/* Profile Header Card */}
          <section className="bg-white rounded-[20px] p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden shadow-sm">
            <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
              <div className="w-32 h-32 rounded-full overflow-hidden shrink-0 bg-gray-100">
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
                <h3 className="font-headline-lg text-2xl font-semibold text-black uppercase">{fullName}</h3>
                <span className="bg-[#D32F2F] text-white px-3 py-1 rounded-full text-[9px] font-semibold tracking-widest uppercase">
                  Vendor Partner
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Department: {department} | Vendor ID: #{currentUser?.id?.substring(0, 4).toUpperCase() || "N/A"}
              </p>
              <p className="text-xs text-gray-400 font-medium">
                Username: <span className="font-medium text-gray-600">{currentUser?.username || "N/A"}</span>
              </p>
              <button
                onClick={handlePhotoClick}
                className="mt-2 text-xs font-medium text-[#D32F2F] hover:underline bg-transparent border-none cursor-pointer p-0"
              >
                Change Profile Portrait
              </button>
            </div>
          </section>

          {/* Form Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

            {/* General Info Card */}
            <section className="bg-white rounded-[20px] p-8 space-y-6 shadow-sm">
              <div className="pb-4 border-b border-gray-100">
                <h4 className="font-headline-md text-lg text-black font-semibold uppercase tracking-tight">Account Details</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Update system info fields</p>
              </div>

              <form onSubmit={handleSaveGeneralInfo} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Company
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Facility Location
                    </label>
                    <input
                      type="text"
                      value={facility}
                      onChange={(e) => setFacility(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
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
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
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
                    <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
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
                  className="w-full bg-[#D32F2F] text-white border border-gray-200 rounded-full py-3 font-medium text-xs uppercase tracking-wider hover:bg-black transition-colors cursor-pointer mt-4 active:scale-95 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save General Info"}
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="lg:hidden w-full bg-white text-[#D32F2F] border border-[#D32F2F] rounded-full py-3 font-medium text-xs uppercase tracking-wider hover:bg-[#D32F2F] hover:text-white transition-colors cursor-pointer mt-2 active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  <span>Logout Session</span>
                </button>
              </form>
            </section>

            {/* Digital Signature Card */}
            <section className="bg-white rounded-[20px] p-8 space-y-6 shadow-sm">
              <div className="pb-4 border-b border-gray-100">
                <h4 className="font-headline-md text-lg text-black font-semibold uppercase tracking-tight">Digital Signature</h4>
                <p className="text-[10px] text-[#D32F2F] uppercase tracking-wider font-semibold">Only 1 active signature is saved for security. Adding a new one replaces the old.</p>
              </div>

              {/* Stored Signature Preview */}
              {signaturesList.length > 0 ? (
                <div className="space-y-4">
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide">Saved Signatures</label>
                  <div className="grid grid-cols-1 gap-3">
                    {signaturesList.map((sig) => (
                      <div key={sig.id} className={`flex items-center justify-between p-4 border rounded-xl transition-all ${sig.is_default ? 'border-[#D32F2F] bg-red-50/10' : 'border-[#1A1A1A]/10'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-10 bg-white border border-[#1A1A1A]/10 rounded flex items-center justify-center overflow-hidden shrink-0">
                            <img src={sig.signature_data} alt={sig.label} className="max-h-full max-w-full object-contain" />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-black">{sig.label}</p>
                            {sig.is_default && (
                              <span className="inline-block bg-[#D32F2F] text-white px-2 py-0.5 rounded text-[8px] font-semibold uppercase mt-0.5">DEFAULT</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!sig.is_default && (
                            <button
                              onClick={() => handleSetDefaultSignature(sig.id)}
                              className="px-2 py-1 text-[9px] font-semibold uppercase border border-gray-200 rounded hover:bg-gray-100 bg-white cursor-pointer"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteSignature(sig.id)}
                            className="p-1 text-[#D32F2F] hover:bg-red-50 rounded flex items-center justify-center border-none bg-transparent cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border-dashed border-[#1A1A1A]/20 p-4 rounded-xl text-center text-xs text-gray-400 font-medium uppercase">
                  No saved signatures. Draw or upload below to set up.
                </div>
              )}

              {/* Draw Signature Area */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide">Draw Signature</label>
                <div className="relative border border-dashed border-[#1A1A1A]/40 rounded-xl overflow-hidden bg-white aspect-video max-w-full">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    width={400}
                    height={200}
                    className="absolute inset-0 w-full h-full cursor-crosshair touch-none bg-white"
                  />
                </div>
                <div className="flex justify-between gap-3">
                  <button
                    onClick={clearCanvas}
                    className="flex-1 py-2 bg-white text-[#1A1A1A] border border-gray-200 rounded-full font-medium text-xs uppercase hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Clear Canvas
                  </button>
                  <button
                    onClick={handleSaveDrawnSignature}
                    className="flex-1 py-2 bg-[#D32F2F] text-white border border-gray-200 rounded-full font-medium text-xs uppercase hover:bg-black transition-colors cursor-pointer"
                  >
                    Save Drawn
                  </button>
                </div>
              </div>

              {/* Import Signature Area */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide">Upload Signature Image</label>
                <input
                  type="file"
                  ref={sigFileInputRef}
                  onChange={handleSignatureUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => sigFileInputRef.current?.click()}
                  className="w-full py-3 bg-white text-[#1A1A1A] border border-dashed border-gray-200 rounded-xl font-medium text-xs uppercase hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  Choose Signature Image File
                </button>
                <p className="text-[9px] text-gray-400 font-semibold mt-1">Recommended: Transparent background PNG</p>
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
            className="pointer-events-auto flex items-center gap-4 bg-[#1A1A1A] text-white px-8 py-4 rounded-lg border border-[#D32F2F] shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300"
          >
            <span className="material-symbols-outlined text-gray-400">
              {t.type === "success" ? "check_circle" : t.type === "error" ? "error" : "info"}
            </span>
            <span className="font-semibold uppercase tracking-widest text-xs">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
