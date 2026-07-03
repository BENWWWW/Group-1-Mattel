"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function AdminProfilePage() {
  const router = useRouter();

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Form Fields State
  const [fullName, setFullName] = useState("Alex Rivera");
  const [department, setDepartment] = useState("Facility Operations");
  const [company, setCompany] = useState("Apex Services");
  const [facility, setFacility] = useState("Main Factory Floor - Wing B");
  const [email, setEmail] = useState("alex.rivera@apex-ops.com");
  const [phone, setPhone] = useState("+1 555-0123");
  const [profilePhoto, setProfilePhoto] = useState(
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBJ0lqCvCFTMHV-5d-jF9CXdtIjRE7PPpB_7tcW7NSFlI9XbK0XtawNKofq-koZRd4wRJOwdiJ2F4FsRK9MVgoNsBm3_KjfK11UmFw0oPj0DbuNKNciWyC9ghqfI-345wjcVVovYfYGj2v9XL7C_VmeFsANijVLphj_aL4A_WfsAmmYkuVqZuddWEL6f_ywBh6ECi8kydXVGurG3bflx6h96Awt_xjTt1ePSbrR0MfifQOOZH1wXWVQSBvOe62LU_uus2cfVBWtjxd2"
  );

  // Password Fields State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password Toggles State
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Account password (read-only, view-only toggle)
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const ACCOUNT_PASSWORD = "Alex@Apex#8821";

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast Trigger Helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Password Strength Calculation
  const checkPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "NONE", color: "bg-gray-200" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    let label = "WEAK";
    let color = "bg-red-500";
    if (score === 3) {
      label = "MEDIUM";
      color = "bg-yellow-500";
    } else if (score === 4) {
      label = "STRONG";
      color = "bg-green-600";
    } else if (score === 5) {
      label = "OPTIMAL";
      color = "bg-emerald-600";
    }

    return { score, label, color };
  };

  const strength = checkPasswordStrength(newPassword);

  // Save General Info Handler
  const handleSaveGeneralInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      triggerToast("Full Name and Email are required fields.", "error");
      return;
    }
    triggerToast("General Profile Details updated successfully.", "success");
  };

  // Save Password Handler
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      triggerToast("Please fill in both new password fields.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerToast("New password confirmation does not match.", "error");
      return;
    }
    if (strength.score < 3) {
      triggerToast("New password must be at least of Medium strength.", "error");
      return;
    }

    triggerToast("Security credentials updated successfully.", "success");
    setNewPassword("");
    setConfirmPassword("");
  };

  // Profile Photo Change Helper
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
        triggerToast("Profile picture uploaded successfully.", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white text-[#1A1A1A] font-body-md overflow-hidden relative">
      {/* TopNavBar */}
      <header className="fixed top-0 right-0 w-[calc(100%-220px)] bg-white border-b-2 border-[#1A1A1A] h-20 px-10 flex justify-between items-center z-40">
        <div>
          <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">Admin Profile</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Manage system account & security</p>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="flex items-center gap-2 border-2 border-[#1A1A1A] rounded-full px-4 py-2 font-bold text-xs uppercase hover:bg-gray-100 transition-all cursor-pointer bg-transparent"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Dashboard</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)] scroll-container">
        <div className="p-10 max-w-[1200px] mx-auto space-y-10">
          
          {/* Profile Header Card */}
          <section className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
            <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
              <div className="w-32 h-32 rounded-full border-4 border-[#D32F2F] overflow-hidden shrink-0 bg-gray-100">
                <img src={profilePhoto} alt="Alex Rivera" className="w-full h-full object-cover" />
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
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                Department: {department} | Employee ID: MTN-8821-X
              </p>
              <p className="text-xs text-gray-400 font-medium">
                Username: <span className="font-bold text-gray-600">arivera_admin</span>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
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
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-[#1A1A1A] rounded-lg p-2.5 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"
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
                      Employee ID (Read Only)
                    </label>
                    <input
                      type="text"
                      value="MTN-8821-X"
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
                      value="arivera_admin"
                      disabled
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Account Password (View Only) */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Account Password
                  </label>
                  <div className="relative">
                    <input
                      type={showAccountPassword ? "text" : "password"}
                      value={ACCOUNT_PASSWORD}
                      readOnly
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 pr-10 text-xs font-semibold text-gray-600 cursor-default select-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccountPassword(!showAccountPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#D32F2F] bg-transparent border-none cursor-pointer flex items-center justify-center p-0 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showAccountPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400 font-semibold mt-1">Click the eye icon to reveal your account password.</p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#D32F2F] text-white border-2 border-[#1A1A1A] rounded-full py-3 font-bold text-xs uppercase tracking-wider hover:bg-black transition-colors cursor-pointer mt-4"
                >
                  Save General Info
                </button>
              </form>
            </section>

            {/* Security Settings Card */}
            <section className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 space-y-6">
              <div className="pb-4 border-b border-gray-100">
                <h4 className="font-headline-md text-lg text-black font-extrabold uppercase tracking-tight">Security & Authentication</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Update system account password</p>
              </div>

              <form onSubmit={handleSavePassword} className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-[#1A1A1A] rounded-lg p-2.5 pr-10 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer flex items-center justify-center p-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showNew ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {newPassword && (
                    <div className="mt-2 space-y-1.5 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
                        <span className="text-gray-500">Strength Indicator:</span>
                        <span className={`font-black ${strength.score >= 3 ? "text-green-600" : "text-red-500"}`}>
                          {strength.label}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden border border-gray-200">
                        <div
                          className={`h-full ${strength.color} transition-all duration-300`}
                          style={{ width: `${(strength.score / 5) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-[9px] text-gray-400 font-semibold leading-tight">
                        Must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special symbol.
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-[#1A1A1A] rounded-lg p-2.5 pr-10 text-xs font-semibold text-black focus:border-[#D32F2F] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer flex items-center justify-center p-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showConfirm ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-black text-white border-2 border-[#1A1A1A] rounded-full py-3 font-bold text-xs uppercase tracking-wider hover:bg-[#D32F2F] transition-colors cursor-pointer mt-4"
                >
                  Change Password
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
