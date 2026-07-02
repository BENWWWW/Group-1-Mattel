"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("userRole");
    }
    router.push("/");
  };

  const navItems = [
    { name: "Dashboard", path: "/admin/dashboard", icon: "dashboard" },
    { name: "Tasks", path: "/admin/tasks", icon: "assignment" },
    { name: "Assets", path: "/admin/assets", icon: "precision_manufacturing" },
    { name: "PM Tools", path: "/admin/pm", icon: "settings_applications" },
    { name: "Users", path: "/admin/users", icon: "group" },
    { name: "Reports", path: "/admin/reports", icon: "assessment" },
  ];

  return (
    <>
      {/* Sidebar Component (SideNavBar) */}
      <aside className="fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white shrink-0 border-r-2 border-[#1A1A1A]">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-2xl font-extrabold text-white tracking-tighter">MAINTAIN.AI</h1>
          <p className="text-[10px] text-[#D32F2F] font-bold uppercase tracking-[0.2em] mt-1">Industrial Precision</p>
        </div>
        <nav className="flex-1 space-y-2 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full px-4 py-3 flex items-center gap-4 text-left font-label-md text-sm uppercase tracking-wider rounded-lg border-none cursor-pointer transition-all duration-300 ease-in-out ${
                  isActive
                    ? "bg-[#D32F2F] text-white shadow-md font-bold"
                    : "text-white/70 hover:bg-white/10 bg-transparent hover:text-white"
                }`}
              >
                <span
                  className="material-symbols-outlined transition-all duration-300"
                  style={{
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Profile Footer */}
        <div className="px-4 mt-auto border-t border-white/10 pt-4 pb-2">
          <button
            onClick={handleLogout}
            className="w-full bg-white text-[#D32F2F] hover:bg-[#D32F2F] hover:text-white transition-all duration-300 py-2 px-4 flex items-center justify-center gap-2 rounded-full font-bold text-xs cursor-pointer border-none mb-4"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Logout</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#D32F2F] overflow-hidden shrink-0">
              <img
                className="w-full h-full object-cover"
                alt="Chief Engineer"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJ0lqCvCFTMHV-5d-jF9CXdtIjRE7PPpB_7tcW7NSFlI9XbK0XtawNKofq-koZRd4wRJOwdiJ2F4FsRK9MVgoNsBm3_KjfK11UmFw0oPj0DbuNKNciWyC9ghqfI-345wjcVVovYfYGj2v9XL7C_VmeFsANijVLphj_aL4A_WfsAmmYkuVqZuddWEL6f_ywBh6ECi8kydXVGurG3bflx6h96Awt_xjTt1ePSbrR0MfifQOOZH1wXWVQSBvOe62LU_uus2cfVBWtjxd2"
              />
            </div>
            <div className="overflow-hidden">
              <p className="font-label-md text-xs truncate text-white uppercase font-bold tracking-tight leading-none mb-1">
                Chief Engineer
              </p>
              <p className="text-[10px] uppercase font-bold text-white/40">Admin Access</p>
            </div>
          </div>
        </div>
      </aside>
      {children}
    </>
  );
}
