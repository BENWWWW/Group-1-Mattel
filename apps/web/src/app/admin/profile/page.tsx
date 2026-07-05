"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ToastType { id: string; message: string; type: "success"|"error"|"info"; }

export default function AdminProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile fields
  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const triggerToast = useCallback((message: string, type: "success"|"error"|"info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { router.push("/"); return; }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profile, error: profileErr } = await supabase
        .from("profiles").select("full_name,employee_id,phone,department,avatar_url").eq("id", user.id).single();

      if (profileErr && profileErr.code !== "PGRST116") throw profileErr;

      if (profile) {
        setFullName(profile.full_name || "");
        setEmployeeId(profile.employee_id || "");
        setPhone(profile.phone || "");
        setDepartment(profile.department || "");
        setProfilePhoto(profile.avatar_url || "");
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to load profile.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router, triggerToast]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSaveGeneralInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { triggerToast("Full Name is required.", "error"); return; }
    setIsSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        department: department.trim() || null,
      }).eq("id", userId);
      if (error) throw error;
      if (typeof window !== "undefined") {
        localStorage.setItem("userName", fullName.trim());
        window.dispatchEvent(new Event("profileUpdated"));
      }
      triggerToast("Profile updated successfully.", "success");
    } catch (err: any) {
      triggerToast(err.message || "Update failed.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) { triggerToast("Fill both password fields.", "error"); return; }
    if (newPassword !== confirmPassword) { triggerToast("Passwords do not match.", "error"); return; }
    if (newPassword.length < 8) { triggerToast("Password must be at least 8 characters.", "error"); return; }
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      triggerToast("Password updated successfully.", "success");
      setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      triggerToast(err.message || "Password update failed.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${userId}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
      setProfilePhoto(publicUrl);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("profileUpdated"));
      }
      triggerToast("Profile picture updated.", "success");
    } catch (err: any) {
      triggerToast(err.message || "Photo upload failed.", "error");
    }
  };

  const checkPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "NONE", color: "bg-gray-200" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const labels = ["NONE","WEAK","WEAK","MEDIUM","STRONG","OPTIMAL"];
    const colors = ["bg-gray-200","bg-red-500","bg-red-500","bg-yellow-500","bg-green-600","bg-emerald-600"];
    return { score, label: labels[score], color: colors[score] };
  };

  const strength = checkPasswordStrength(newPassword);

  return (
    <div className="flex h-screen w-full bg-white text-[#1A1A1A] font-body-md overflow-hidden relative">
      <header className="fixed top-0 right-0 w-[calc(100%-220px)] bg-white border-b-2 border-[#1A1A1A] h-20 px-10 flex justify-between items-center z-40">
        <div>
          <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">Admin Profile</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Manage system account & security</p>
        </div>
        <button onClick={()=>router.push("/admin/dashboard")} className="flex items-center gap-2 border-2 border-[#1A1A1A] rounded-full px-4 py-2 font-bold text-xs uppercase hover:bg-gray-100 transition-all cursor-pointer bg-transparent">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span><span>Dashboard</span>
        </button>
      </header>

      <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)]">
        <div className="p-10 max-w-[1200px] mx-auto space-y-10">

          {/* Profile Header */}
          <section className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 flex flex-col md:flex-row items-center gap-8">
            {isLoading ? (
              <div className="w-32 h-32 rounded-full bg-gray-100 animate-pulse shrink-0"/>
            ) : (
              <div className="relative group cursor-pointer shrink-0" onClick={()=>fileInputRef.current?.click()}>
                <div className="w-32 h-32 rounded-full border-4 border-[#D32F2F] overflow-hidden bg-gray-100 flex items-center justify-center">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt={fullName} className="w-full h-full object-cover"/>
                  ) : (
                    <span className="material-symbols-outlined text-5xl text-gray-300">account_circle</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-2xl">photo_camera</span>
                </div>
                <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden"/>
              </div>
            )}
            <div className="flex-1 text-center md:text-left space-y-2">
              {isLoading ? (
                <div className="space-y-2"><div className="h-8 w-48 bg-gray-100 rounded animate-pulse"/><div className="h-4 w-64 bg-gray-100 rounded animate-pulse"/></div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <h3 className="font-headline-lg text-2xl font-extrabold text-black uppercase">{fullName || "Admin User"}</h3>
                    <span className="bg-[#D32F2F] text-white px-3 py-1 rounded-full text-[9px] font-extrabold tracking-widest uppercase">Super Admin</span>
                  </div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                    {department && `Department: ${department} | `}Employee ID: {employeeId || "N/A"}
                  </p>
                  <p className="text-xs text-gray-400">{email}</p>
                  <button onClick={()=>fileInputRef.current?.click()} className="mt-2 text-xs font-bold text-[#D32F2F] hover:underline bg-transparent border-none cursor-pointer p-0">
                    Change Profile Portrait
                  </button>
                </>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* General Info */}
            <section className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 space-y-6">
              <div className="pb-4 border-b border-gray-100">
                <h4 className="font-headline-md text-lg text-black font-extrabold uppercase tracking-tight">Account Details</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Update system info fields</p>
              </div>

              <form onSubmit={handleSaveGeneralInfo} className="space-y-4">
                {[
                  { label:"Full Name", value:fullName, set:setFullName, type:"text", required:true },
                  { label:"Department", value:department, set:setDepartment, type:"text" },
                  { label:"Phone Number", value:phone, set:setPhone, type:"text" },
                ].map(({label,value,set,type,required})=>(
                  <div key={label}>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">{label}{required&&" *"}</label>
                    <input type={type} value={value} onChange={e=>set(e.target.value)} required={required}
                      className="w-full bg-white border border-[#1A1A1A] rounded-lg p-2.5 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"/>
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Employee ID (Read Only)</label>
                    <input type="text" value={employeeId} disabled className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-400 cursor-not-allowed"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Email (Read Only)</label>
                    <input type="text" value={email} disabled className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-400 cursor-not-allowed"/>
                  </div>
                </div>

                <button type="submit" disabled={isSaving||isLoading} className="w-full bg-[#D32F2F] text-white border-2 border-[#1A1A1A] rounded-full py-3 font-bold text-xs uppercase tracking-wider hover:bg-black transition-colors cursor-pointer mt-4 disabled:opacity-60 flex items-center justify-center gap-2">
                  {isSaving?<><span className="material-symbols-outlined animate-spin text-base">progress_activity</span>SAVING...</>:"Save General Info"}
                </button>
              </form>
            </section>

            {/* Password Settings */}
            <section className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 space-y-6">
              <div className="pb-4 border-b border-gray-100">
                <h4 className="font-headline-md text-lg text-black font-extrabold uppercase tracking-tight">Security & Authentication</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Update your Supabase account password</p>
              </div>

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">New Password</label>
                  <div className="relative">
                    <input type={showNew?"text":"password"} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="••••••••"
                      className="w-full bg-white border border-[#1A1A1A] rounded-lg p-2.5 pr-10 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"/>
                    <button type="button" onClick={()=>setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer">
                      <span className="material-symbols-outlined text-[18px]">{showNew?"visibility_off":"visibility"}</span>
                    </button>
                  </div>
                  {newPassword && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex justify-between text-[9px] font-bold uppercase">
                        <span className="text-gray-500">Strength:</span>
                        <span className={strength.score>=3?"text-green-600":"text-red-500"}>{strength.label}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full ${strength.color} transition-all duration-300`} style={{width:`${(strength.score/5)*100}%`}}/>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input type={showConfirm?"text":"password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="••••••••"
                      className="w-full bg-white border border-[#1A1A1A] rounded-lg p-2.5 pr-10 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"/>
                    <button type="button" onClick={()=>setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer">
                      <span className="material-symbols-outlined text-[18px]">{showConfirm?"visibility_off":"visibility"}</span>
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[9px] text-red-500 font-bold mt-1">Passwords do not match.</p>
                  )}
                </div>
                <button type="submit" disabled={isSaving} className="w-full bg-black text-white border-2 border-[#1A1A1A] rounded-full py-3 font-bold text-xs uppercase tracking-wider hover:bg-[#D32F2F] transition-colors cursor-pointer mt-4 disabled:opacity-60 flex items-center justify-center gap-2">
                  {isSaving?<><span className="material-symbols-outlined animate-spin text-base">progress_activity</span>UPDATING...</>:"Change Password"}
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t=>(
          <div key={t.id} className="pointer-events-auto flex items-center gap-4 bg-[#1A1A1A] text-white px-8 py-4 rounded-lg border-2 border-[#D32F2F] shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300">
            <span className="material-symbols-outlined text-[#D32F2F]">{t.type==="success"?"check_circle":t.type==="error"?"error":"info"}</span>
            <span className="font-black uppercase tracking-widest text-xs">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
