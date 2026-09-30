"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [profile, setProfile] = React.useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);

  const fetchProfile = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) {
        setProfile(data);
        if (typeof window !== "undefined") {
          localStorage.setItem("userName", data.full_name);
          if (data.avatar_url) localStorage.setItem("userAvatar", data.avatar_url);
        }
      }
    }
  }, [supabase]);

  React.useEffect(() => {
    fetchProfile();

    const handleProfileUpdate = () => {
      fetchProfile();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, [fetchProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      localStorage.removeItem("userRole");
      localStorage.removeItem("userName");
      localStorage.removeItem("userAvatar");
    }
    router.push("/");
  };

  const navItems = [
    { name: "Dashboard", path: "/admin/dashboard", icon: "dashboard" },
    { name: "Tasks", path: "/admin/tasks", icon: "assignment" },
    { name: "Assets", path: "/admin/assets", icon: "precision_manufacturing" },
    { name: "PM Template", path: "/admin/pm", icon: "settings_applications" },
    { name: "Users", path: "/admin/users", icon: "group" },
    { name: "Reports", path: "/admin/reports", icon: "assessment" },
  ];

  return (
    <>
      {/* Sidebar Component (SideNavBar) - Desktop Only */}
      <aside className="admin-sidebar hidden lg:flex fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white shrink-0 border-r border-gray-200">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-2xl font-semibold text-white tracking-tighter">MAINTAIN</h1>
          <p className="text-[10px] text-[#D32F2F] font-medium uppercase tracking-[0.2em] mt-1">PM Verification</p>
        </div>
        <nav className="flex-1 space-y-2 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full px-4 py-3 flex items-center gap-4 text-left font-label-md text-sm uppercase tracking-wider rounded-lg border-none cursor-pointer transition-all duration-300 ease-in-out ${isActive
                    ? "bg-[#D32F2F] text-white shadow-md font-medium"
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
            className="w-full bg-white text-[#D32F2F] hover:bg-[#D32F2F] hover:text-white transition-all duration-300 py-2 px-4 flex items-center justify-center gap-2 rounded-full font-medium text-xs cursor-pointer border-none mb-4"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Logout</span>
          </button>

          <button
            onClick={() => router.push("/admin/profile")}
            className="flex items-center gap-3 text-left w-full hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-white/10 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  className="w-full h-full object-cover"
                  alt="Admin Portrait"
                  src={profile.avatar_url}
                />
              ) : (
                <span className="material-symbols-outlined text-white text-xl">account_circle</span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="font-label-md text-xs truncate text-white uppercase font-medium tracking-tight leading-none mb-1">
                {profile?.full_name || "Admin User"}
              </p>
              <p className="text-[10px] uppercase font-medium text-white/40">Admin Access</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Bottom Navigation Bar - Mobile & Tablet Only */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-gray-200 z-[55] lg:hidden shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex items-center">
        {/* Each item gets equal width via flex-1 so active state never shifts siblings */}
        {[
          { name: "Dashboard", path: "/admin/dashboard", icon: "dashboard" },
          { name: "Tasks", path: "/admin/tasks", icon: "assignment" },
          { name: "Assets", path: "/admin/assets", icon: "inventory_2" },
        ].map((item) => {
          const isActive = pathname === item.path || (item.path !== "/admin/dashboard" && pathname.startsWith(item.path + "/"));
          return (
            <div key={item.path} className="flex-1 h-full">
              <button
                onClick={() => { setIsMoreOpen(false); router.push(item.path); }}
                className="w-full h-full flex flex-col items-center justify-center border-none bg-transparent cursor-pointer text-[#1A1A1A]"
              >
                <div
                  className={`flex flex-col items-center justify-center gap-0.5 w-16 py-2 rounded-2xl transition-all duration-200 ${isActive
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
                  <span className="text-[8px] font-semibold uppercase tracking-wider leading-none">{item.name}</span>
                </div>
              </button>
            </div>
          );
        })}

        {/* More button */}
        <div className="flex-1 h-full">
          <button
            onClick={() => setIsMoreOpen((prev) => !prev)}
            className="w-full h-full flex flex-col items-center justify-center border-none bg-transparent cursor-pointer text-[#1A1A1A]"
          >
            <div
              className={`flex flex-col items-center justify-center gap-0.5 w-16 py-2 rounded-2xl transition-all duration-200 ${isMoreOpen
                  ? "bg-[#D32F2F] text-white shadow-md"
                  : "opacity-50 hover:opacity-80"
                }`}
            >
              <span
                className="material-symbols-outlined text-[22px] leading-none"
                style={{ fontVariationSettings: isMoreOpen ? "'FILL' 1, 'wght' 700" : "'FILL' 0, 'wght' 400" }}
              >
                apps
              </span>
              <span className="text-[8px] font-semibold uppercase tracking-wider leading-none">More</span>
            </div>
          </button>
        </div>
      </div>

      {/* More Options — backdrop */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMoreOpen(false)}
        />
      )}

      {/* More Options — bottom sheet drawer */}
      <div
        className={`fixed bottom-20 left-0 right-0 bg-[#1A1A1A] border-t border-[#D32F2F] rounded-t-[24px] z-[70] lg:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 ease-out ${isMoreOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        style={{ transform: isMoreOpen ? "translateY(0)" : "translateY(calc(100% + 80px))" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        <div className="px-5 pb-6 pt-2">
          {/* Header */}
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-white text-xs font-semibold uppercase tracking-[0.15em]">Admin Console</h3>
              <p className="text-[9px] text-[#D32F2F] font-medium uppercase tracking-widest mt-0.5">Quick Navigation</p>
            </div>
            <button
              onClick={() => setIsMoreOpen(false)}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors border-none bg-transparent cursor-pointer text-white"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Nav grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Users", path: "/admin/users", icon: "group" },
              { label: "PM Setup", path: "/admin/pm", icon: "settings_suggest" },
              { label: "Reports", path: "/admin/reports", icon: "assessment" },
              { label: "Profile", path: "/admin/profile", icon: "account_circle" },
            ].map(({ label, path, icon }) => {
              const isActive = pathname === path || pathname.startsWith(path + "/");
              return (
                <button
                  key={path}
                  onClick={() => { router.push(path); setIsMoreOpen(false); }}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border font-medium text-[10px] uppercase tracking-wide cursor-pointer transition-all ${isActive
                      ? "bg-[#D32F2F] border-[#D32F2F] text-white"
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    }`}
                >
                  <span className="material-symbols-outlined text-[24px]"
                    style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0", color: isActive ? "white" : "#D32F2F" }}
                  >{icon}</span>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Logout */}
          <button
            onClick={() => { handleLogout(); setIsMoreOpen(false); }}
            className="w-full flex items-center justify-center gap-2 p-3.5 bg-[#D32F2F] hover:bg-red-700 rounded-2xl text-white font-semibold text-xs uppercase tracking-widest border-none cursor-pointer transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        </div>
      </div>

      <div className="admin-container">
        {children}
      </div>
    </>
  );
}
