"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function SupervisorProfilePage() {
  const router = useRouter();

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Form Fields State
  const [fullName, setFullName] = useState("E. Schmidt");
  const [department, setDepartment] = useState("Quality Assurance");
  const [company, setCompany] = useState("Mattel Inc.");
  const [facility, setFacility] = useState("Main Factory Floor - Wing A");
  const [email, setEmail] = useState("e.schmidt@maintain.ai");
  const [phone, setPhone] = useState("+1 555-9012");
  const [profilePhoto, setProfilePhoto] = useState(
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAGr1GabPuRddQJ5DDQodY0mm-FpKyAbdxG-40JLrOgFIVBSFGynpIMBLwDZl3ySnWeIMNrOrjiXIbIFGz1xdBjkdSM6TJTzOnweEAerX2BuY5Gnc6S9r3E2opIoMcrvKjmgqz7_ZLen6z0ZE1ISc2pPHvuhNXbQdU6YU6UMVFrBmJ07-KuIkgdRCGnD_yjTNxuBwkEPqcILVegDcQXrdgo0akHbD4ZgQEP9zZZY9UXUwsoBkz5TKicnENq_E-K90u1320ZOULkSmaY"
  );

  // Account password (read-only, view-only toggle)
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const ACCOUNT_PASSWORD = "Schmidt@MTN#9012";

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast Trigger Helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Save General Info Handler
  const handleSaveGeneralInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      triggerToast("Full Name and Email are required fields.", "error");
      return;
    }
    triggerToast("Supervisor Profile Details updated successfully.", "success");
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

  // Run Logout simulation
  const handleLogout = () => {
    triggerToast("CLOSING SUPERVISOR TERMINAL...", "info");
    if (typeof window !== "undefined") {
      localStorage.removeItem("userRole");
    }
    setTimeout(() => {
      router.push("/");
    }, 1200);
  };

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

      {/* SideNavBar (matching supervisor pages layout style) */}
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
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => router.push("/supervisor/tasks")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">assignment</span>
            <span>Tasks</span>
          </button>

          <button
            onClick={() => router.push("/supervisor/reports")}
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
                alt="Supervisor Headshot"
                className="w-full h-full object-cover"
                src={profilePhoto}
              />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-white uppercase leading-none mb-1">E. Schmidt</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold font-bold">Lead Auditor</p>
            </div>
          </button>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 w-[calc(100%-220px)] border-b-2 border-[#1A1A1A] bg-white flex justify-between items-center h-20 px-10 z-40">
        <div>
          <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">Supervisor Profile</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Manage auditor credentials & profile details</p>
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
                <img src={profilePhoto} alt={fullName} className="w-full h-full object-cover" />
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
                  Lead Auditor
                </span>
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                Department: {department} | Employee ID: MTN-9012-S
              </p>
              <p className="text-xs text-gray-400 font-medium">
                Username: <span className="font-bold text-gray-600">eschmidt_supervisor</span>
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
                      value="MTN-9012-S"
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
                      value="eschmidt_supervisor"
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
