"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";

export default function BottomNavBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname) return null;

  const isVendor = pathname.startsWith("/vendor");
  const isSupervisor = pathname.startsWith("/supervisor");

  // Bottom navigation is only for Vendor and Supervisor roles
  if (!isVendor && !isSupervisor) return null;

  const navItems = isVendor
    ? [
        { name: "Dashboard", path: "/vendor", icon: "dashboard" },
        { name: "Tasks", path: "/vendor/tasks", icon: "assignment" },
        { name: "PM", path: "/vendor/pm", icon: "settings_applications" },
        { name: "Reports", path: "/vendor/reports", icon: "assessment" },
        { name: "Profile", path: "/vendor/profile", icon: "person" }
      ]
    : [
        { name: "Dashboard", path: "/supervisor/dashboard", icon: "dashboard" },
        { name: "Tasks", path: "/supervisor/tasks", icon: "assignment" },
        { name: "Reports", path: "/supervisor/reports", icon: "assessment" },
        { name: "Profile", path: "/supervisor/profile", icon: "person" }
      ];

  const checkActive = (itemPath: string) => {
    if (itemPath === "/vendor" || itemPath === "/supervisor/dashboard") {
      return pathname === itemPath;
    }
    return pathname.startsWith(itemPath);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t-2 border-[#1A1A1A] flex items-center justify-around z-[100] lg:hidden shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = checkActive(item.path);
        return (
          <div key={item.path} className="flex-1 h-full">
            <button
              onClick={() => router.push(item.path)}
              className="w-full h-full flex flex-col items-center justify-center border-none bg-transparent cursor-pointer text-[#1A1A1A]"
            >
              <div
                className={`flex flex-col items-center justify-center gap-0.5 w-16 py-2 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? "bg-[#D32F2F] text-white shadow-md"
                    : "opacity-50 hover:opacity-80"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[22px] leading-none"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1, 'wght' 700" : "'FILL' 0, 'wght' 400" }}
                >
                  {item.icon}
                </span>
                <span className="text-[8px] font-black uppercase tracking-wider leading-none">
                  {item.name}
                </span>
              </div>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
