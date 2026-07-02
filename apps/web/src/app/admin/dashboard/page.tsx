"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Toast Helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("userRole");
    }
    router.push("/");
  };

  return (
    <div className="flex h-screen w-full bg-white text-[#1A1A1A] font-body-md overflow-hidden">

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 w-[calc(100%-220px)] bg-white border-b-2 border-[#1A1A1A] h-20 px-10 flex justify-between items-center z-40">
        <div>
          <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">Admin Dashboard</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">System overview & management</p>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => triggerToast("System compliance status: nominal.", "info")}
            className="relative p-2 hover:bg-[#D32F2F]/10 rounded-full transition-all cursor-pointer border-none bg-transparent flex items-center justify-center outline-none"
          >
            <span className="material-symbols-outlined text-[#1A1A1A]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D32F2F] rounded-full border border-white"></span>
          </button>
          <div className="w-10 h-10 rounded-full border-2 border-[#D32F2F] overflow-hidden shrink-0">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJ0lqCvCFTMHV-5d-jF9CXdtIjRE7PPpB_7tcW7NSFlI9XbK0XtawNKofq-koZRd4wRJOwdiJ2F4FsRK9MVgoNsBm3_KjfK11UmFw0oPj0DbuNKNciWyC9ghqfI-345wjcVVovYfYGj2v9XL7C_VmeFsANijVLphj_aL4A_WfsAmmYkuVqZuddWEL6f_ywBh6ECi8kydXVGurG3bflx6h96Awt_xjTt1ePSbrR0MfifQOOZH1wXWVQSBvOe62LU_uus2cfVBWtjxd2"
              alt="Chief Engineer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)]">
        <div className="p-10 max-w-[1400px] mx-auto space-y-10">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: "Total Assets", value: "284", icon: "precision_manufacturing", delta: "+3 this month" },
              { label: "Active PMs", value: "47", icon: "settings_applications", delta: "12 due this week" },
              { label: "Total Reports", value: "1,284", icon: "assessment", delta: "+12% vs last month" },
              { label: "Active Users", value: "38", icon: "group", delta: "5 supervisors online" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</span>
                  <span className="material-symbols-outlined text-[#D32F2F]">{stat.icon}</span>
                </div>
                <div className="mt-4">
                  <p className="text-5xl font-extrabold text-[#D32F2F] tracking-tighter">{stat.value}</p>
                  <p className="text-xs text-gray-500 font-bold mt-1">{stat.delta}</p>
                </div>
              </div>
            ))}
          </div>


          {/* Quick Actions Panel */}
          <div className="space-y-4">
            <div>
              <h3 className="font-headline-md text-lg text-[#1A1A1A] font-extrabold uppercase tracking-tight">Quick Actions</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Trigger direct operational tasks</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { 
                  label: "Assign New Task", 
                  desc: "Dispatch a PM task to vendor & supervisor", 
                  icon: "assignment_add", 
                  color: "bg-[#D32F2F] text-white border-[#D32F2F]",
                  hover: "hover:bg-white hover:text-[#D32F2F]",
                  action: () => {
                    router.push("/admin/tasks");
                    triggerToast("Redirecting to task assignment dispatch...", "info");
                  }
                },
                { 
                  label: "Add Asset Unit", 
                  desc: "Onboard new heavy machinery or equipment", 
                  icon: "add_to_photos", 
                  color: "bg-[#1A1A1A] text-white border-[#1A1A1A]",
                  hover: "hover:bg-white hover:text-[#1A1A1A]",
                  action: () => {
                    if (typeof window !== "undefined") {
                      sessionStorage.setItem("autoOpenAddAsset", "true");
                    }
                    router.push("/admin/assets");
                    triggerToast("Opening Asset Onboarding page...", "info");
                  }
                },
                { 
                  label: "Onboard Personnel", 
                  desc: "Register a new vendor or supervisor account", 
                  icon: "person_add", 
                  color: "bg-white text-[#1A1A1A] border-[#1A1A1A]",
                  hover: "hover:bg-[#1A1A1A] hover:text-white",
                  action: () => {
                    if (typeof window !== "undefined") {
                      sessionStorage.setItem("autoOpenAddUser", "true");
                    }
                    router.push("/admin/users");
                    triggerToast("Opening User Registration form...", "info");
                  }
                },
                { 
                  label: "Create PM Template", 
                  desc: "Draft a new checklist protocol template", 
                  icon: "post_add", 
                  color: "bg-[#2E7D32] text-white border-[#2E7D32]",
                  hover: "hover:bg-white hover:text-[#2E7D32]",
                  action: () => {
                    if (typeof window !== "undefined") {
                      sessionStorage.setItem("autoOpenAddTemplate", "true");
                    }
                    router.push("/admin/pm");
                    triggerToast("Opening PM Template creator...", "info");
                  }
                },
              ].map((act) => (
                <button
                  key={act.label}
                  onClick={act.action}
                  className={`border-2 rounded-[20px] p-6 flex flex-col justify-between gap-6 transition-all text-left cursor-pointer group shadow-none min-h-[160px] ${act.color} ${act.hover}`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="material-symbols-outlined text-3xl">{act.icon}</span>
                    <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity">arrow_outward</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm uppercase tracking-tight">{act.label}</h4>
                    <p className="text-[10px] opacity-80 mt-1 font-medium">{act.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Toast Popups */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col items-end gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-[#1a1c1c] text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 border-2 border-[#D32F2F] animate-in fade-in slide-in-from-top-5 duration-300"
          >
            <span className="material-symbols-outlined text-sm text-[#D32F2F]">check_circle</span>
            <span className="font-bold text-xs uppercase tracking-wider">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
