"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string; // e.g. V-88291, S-44102
  name: string;
  role: "vendor" | "supervisor";
  status: "ACTIVE" | "INACTIVE";
  avatar: string;
  company?: string;
  dept?: string;
  email?: string;
  phone?: string;
  deactivationNote?: string;
}

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const INITIAL_USERS: User[] = [
  {
    id: "V-88291",
    name: "Alex Thompson",
    role: "vendor",
    status: "ACTIVE",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256&h=256",
    company: "Acme Industrial",
    email: "alex@acme.com",
    phone: "+1 (555) 019-2831",
  },
  {
    id: "V-12930",
    name: "Elena Rodriguez",
    role: "vendor",
    status: "ACTIVE",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=256&h=256",
    company: "TechFlow Solutions",
    email: "elena@techflow.com",
    phone: "+1 (555) 014-9921",
  },
  {
    id: "S-44102",
    name: "Marcus Chen",
    role: "supervisor",
    status: "INACTIVE",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256&h=256",
    dept: "Maintenance",
    email: "marcus@maintain.ai",
    phone: "+1 (555) 018-8820",
    deactivationNote: "Suspended due to safety policy non-compliance during annual inspection.",
  },
];

export default function UserManagementPage() {
  const router = useRouter();

  // Users state
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

  // Filters and search states
  const [activeTab, setActiveTab] = useState<"vendor" | "supervisor">("vendor");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form states
  const [formRole, setFormRole] = useState<"vendor" | "supervisor">("vendor");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formDept, setFormDept] = useState("");
  const [formId, setFormId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formAvatar, setFormAvatar] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");

  // Modals & toasts
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);
  const [deactivateTargetUser, setDeactivateTargetUser] = useState<User | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Toast helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };


  // Open Deactivate Modal
  const handleOpenDeactivateModal = (user: User) => {
    setDeactivateTargetUser(user);
    setDeactivationReason("");
  };

  // Confirm Deactivation
  const handleConfirmDeactivate = () => {
    if (!deactivateTargetUser) return;
    if (!deactivationReason.trim()) {
      triggerToast("Please enter a reason for deactivation.", "error");
      return;
    }

    setUsers(
      users.map((u) =>
        u.id === deactivateTargetUser.id
          ? {
              ...u,
              status: "INACTIVE",
              deactivationNote: deactivationReason.trim(),
            }
          : u
      )
    );
    triggerToast(`User "${deactivateTargetUser.name}" deactivated.`, "info");
    setDeactivateTargetUser(null);
  };

  // Reactivate User
  const handleReactivateUser = (user: User) => {
    setUsers(
      users.map((u) =>
        u.id === user.id
          ? {
              ...u,
              status: "ACTIVE",
              deactivationNote: undefined,
            }
          : u
      )
    );
    triggerToast(`User "${user.name}" reactivated successfully.`, "success");
  };

  // Avatar selector handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormAvatar(reader.result as string);
        triggerToast("Profile picture selected successfully.", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  // Open Drawer for Add
  const handleOpenAddDrawer = () => {
    setDrawerMode("add");
    setEditingUserId(null);
    setFormRole(activeTab);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormCompany("");
    setFormDept("");
    setFormId("");
    setFormAvatar("");
    setFormPassword("");
    setFormConfirmPassword("");
    setIsDrawerOpen(true);
  };

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const shouldOpen = sessionStorage.getItem("autoOpenAddUser");
      if (shouldOpen === "true") {
        sessionStorage.removeItem("autoOpenAddUser");
        const timer = setTimeout(() => {
          handleOpenAddDrawer();
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Open Drawer for Edit
  const handleOpenEditDrawer = (user: User) => {
    setDrawerMode("edit");
    setEditingUserId(user.id);
    setFormRole(user.role);
    setFormName(user.name);
    setFormEmail(user.email || "");
    setFormPhone(user.phone || "");
    setFormCompany(user.company || "");
    setFormDept(user.dept || "");
    setFormId(user.id);
    setFormAvatar(user.avatar || "");
    setFormPassword("");
    setFormConfirmPassword("");
    setIsDrawerOpen(true);
  };

  // Drawer Submit Handler
  const handleDrawerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formId.trim()) {
      triggerToast("Please fill in the required fields.", "error");
      return;
    }
    if (!formAvatar) {
      triggerToast("Profile picture is mandatory. Please upload an image.", "error");
      return;
    }
    if (drawerMode === "add" && !formPassword) {
      triggerToast("Password is required for new users.", "error");
      return;
    }
    if (formPassword !== formConfirmPassword) {
      triggerToast("Passwords do not match.", "error");
      return;
    }

    const updatedId = formId.trim().toUpperCase();

    if (drawerMode === "add") {
      if (users.some((u) => u.id === updatedId)) {
        triggerToast(`User ID "${updatedId}" already exists.`, "error");
        return;
      }

      const newUser: User = {
        id: updatedId,
        name: formName.trim(),
        role: formRole,
        status: "ACTIVE",
        avatar: formAvatar,
        company: formRole === "vendor" ? formCompany.trim() : undefined,
        dept: formRole === "supervisor" ? formDept.trim() : undefined,
        email: formEmail.trim(),
        phone: formPhone.trim(),
      };

      setUsers([newUser, ...users]);
      triggerToast(`User "${formName}" created successfully.`, "success");
    } else {
      // Edit User
      setUsers(
        users.map((u) =>
          u.id === editingUserId
            ? {
                ...u,
                id: updatedId,
                name: formName.trim(),
                role: formRole,
                avatar: formAvatar,
                company: formRole === "vendor" ? formCompany.trim() : undefined,
                dept: formRole === "supervisor" ? formDept.trim() : undefined,
                email: formEmail.trim(),
                phone: formPhone.trim(),
              }
            : u
        )
      );
      triggerToast(`User details updated.`, "success");
    }

    setIsDrawerOpen(false);
    setActiveTab(formRole);
  };

  // Toggle User Status (Active/Inactive)
  const handleToggleStatus = (user: User) => {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setUsers(
      users.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
    );
    triggerToast(
      `User ${user.name} is now ${nextStatus.toLowerCase()}.`,
      nextStatus === "ACTIVE" ? "success" : "info"
    );
  };

  // Delete Confirm
  const triggerDeleteConfirm = (user: User) => {
    setDeleteTargetUser(user);
  };

  const handleConfirmDelete = () => {
    if (deleteTargetUser) {
      setUsers(users.filter((u) => u.id !== deleteTargetUser.id));
      triggerToast(`User "${deleteTargetUser.name}" deleted.`, "success");
      setDeleteTargetUser(null);
    }
  };

  // Filter & Search Logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.company && u.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.dept && u.dept.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = u.role === activeTab;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex h-screen w-full bg-[#FFFFFF] text-[#1A1A1A] font-body-md overflow-hidden">

      {/* Main Content Area */}
      <main className="ml-[220px] w-[calc(100%-220px)] h-screen flex flex-col overflow-hidden bg-white flex-grow relative">
        {/* TopNavBar */}
        <header className="h-20 border-b-2 border-outline bg-white flex justify-between items-center px-10 shrink-0 z-40">
          <div>
            <h2 className="font-headline-md text-2xl text-on-surface font-extrabold uppercase tracking-tight">
              User Management
            </h2>
            <p className="font-body-md text-xs text-on-surface-variant font-bold uppercase tracking-wide">
              Manage permissions and accounts for your personnel.
            </p>
          </div>
        </header>

        {/* Scrollable Canvas */}
        <div className="flex-1 overflow-y-auto bg-white p-10 scroll-container pb-28">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Search Bar */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-on-surface opacity-40">search</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID, or role..."
                className="w-full pl-16 pr-6 py-5 bg-white border-2 border-outline rounded-[12px] font-body-md text-sm font-bold uppercase focus:ring-0 focus:border-primary transition-all outline-none"
              />
            </div>

            {/* Toggle Tabs */}
            <div className="flex items-center gap-1 p-1 bg-white rounded-full w-fit border-2 border-outline">
              <button
                onClick={() => setActiveTab("vendor")}
                className={`px-10 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "vendor"
                    ? "bg-primary text-white"
                    : "text-on-surface hover:bg-surface-variant"
                }`}
              >
                Vendors
              </button>
              <button
                onClick={() => setActiveTab("supervisor")}
                className={`px-10 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "supervisor"
                    ? "bg-primary text-white"
                    : "text-on-surface hover:bg-surface-variant"
                }`}
              >
                Supervisors
              </button>
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredUsers.length === 0 ? (
                <div className="lg:col-span-2 text-center py-20 text-on-surface/40 font-bold uppercase">
                  No accounts found matching current query.
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isActive = user.status === "ACTIVE";
                  return (
                    <div
                      key={user.id}
                      className={`heritage-card flex flex-col gap-4 hover:border-primary transition-all bg-white text-[#1A1A1A] p-6 border-2 border-outline rounded-[12px] ${
                        !isActive ? "opacity-90 border-[#D32F2F]/40 bg-[#fffcfc]" : ""
                      }`}
                    >
                      {/* Top Row: Avatar, Info, and Actions */}
                      <div className="flex items-center gap-6 w-full">
                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-full border-2 border-outline overflow-hidden flex-shrink-0 relative bg-gray-100">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Info Display */}
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-headline-md text-lg font-extrabold text-on-surface truncate uppercase">
                              {user.name}
                            </h3>
                            <span
                              className={`px-3 py-1 border-2 text-[10px] font-extrabold rounded-full uppercase tracking-wider ${
                                isActive
                                  ? "border-success text-success"
                                  : "border-[#D32F2F] text-[#D32F2F] bg-[#D32F2F]/10"
                              }`}
                            >
                              {user.status}
                            </span>
                          </div>
                          <p className="font-label-md text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                            ID: {user.id}
                          </p>
                          {user.company && (
                            <p className="text-xs font-bold text-on-surface-variant uppercase mt-0.5">
                              Company: {user.company}
                            </p>
                          )}
                          {user.dept && (
                            <p className="text-xs font-bold text-on-surface-variant uppercase mt-0.5">
                              Dept: {user.dept}
                            </p>
                          )}
                        </div>

                        {/* Controls Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleOpenEditDrawer(user)}
                            className="w-10 h-10 flex items-center justify-center border-2 border-outline rounded-full text-on-surface hover:bg-[#1A1A1A] hover:text-white transition-all cursor-pointer"
                            title="Edit User"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          
                          {isActive ? (
                            <button
                              onClick={() => handleOpenDeactivateModal(user)}
                              className="w-10 h-10 flex items-center justify-center border-2 border-[#D32F2F] rounded-full text-[#D32F2F] hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer"
                              title="Deactivate Account"
                            >
                              <span className="material-symbols-outlined text-[18px]">block</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivateUser(user)}
                              className="w-10 h-10 flex items-center justify-center border-2 border-[#2E7D32] rounded-full text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white transition-all cursor-pointer"
                              title="Activate Account"
                            >
                              <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            </button>
                          )}

                          <button
                            onClick={() => triggerDeleteConfirm(user)}
                            className="w-10 h-10 flex items-center justify-center border-2 border-outline rounded-full text-on-surface hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer"
                            title="Delete User permanently"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Deactivation Note */}
                      {!isActive && user.deactivationNote && (
                        <div className="w-full mt-2 p-3 bg-[#fff0ef] border-2 border-[#D32F2F]/20 rounded-lg text-xs">
                          <span className="font-extrabold uppercase text-[#D32F2F] tracking-wide block mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">warning</span>
                            Deactivation Note:
                          </span>
                          <p className="font-bold text-on-surface/80 leading-relaxed uppercase">
                            {user.deactivationNote}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Floating Add User Button */}
        <button
          onClick={handleOpenAddDrawer}
          className="fixed bottom-10 right-10 h-20 bg-primary text-white rounded-full border-4 border-secondary flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all z-50 w-fit px-6 cursor-pointer"
        >
          <div className="flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-[28px] font-black">person_add</span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest mt-0.5">Add User</span>
          </div>
        </button>

        {/* Slide-over Drawer Panel */}
        {isDrawerOpen && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex justify-end">
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => setIsDrawerOpen(false)}
            ></div>
            <div className="relative h-full w-full max-w-lg bg-white border-l-4 border-secondary flex flex-col z-10 animate-in slide-in-from-right duration-300">
              {/* Header */}
              <div className="p-8 border-b-2 border-outline flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-2xl font-extrabold uppercase tracking-tight">
                    {drawerMode === "edit" ? "Edit User" : "Add New User"}
                  </h2>
                  <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mt-1">
                    Configure profile and access level.
                  </p>
                </div>
                <button
                  className="w-12 h-12 flex items-center justify-center border-2 border-outline rounded-full text-on-surface hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer"
                  onClick={() => setIsDrawerOpen(false)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Scrollable Body */}
              <form onSubmit={handleDrawerSubmit} className="flex-grow overflow-y-auto p-8 space-y-6">
                {/* Role selection tab button (only enabled in Add mode) */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase opacity-40">Personnel Role</label>
                  <div className="flex gap-1 p-1 bg-surface-variant rounded-full border-2 border-outline w-full">
                    <button
                      type="button"
                      disabled={drawerMode === "edit"}
                      onClick={() => setFormRole("vendor")}
                      className={`flex-1 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-85 ${
                        formRole === "vendor"
                          ? "bg-primary text-white"
                          : "text-on-surface hover:bg-white/50 cursor-pointer"
                      }`}
                    >
                      Vendor
                    </button>
                    <button
                      type="button"
                      disabled={drawerMode === "edit"}
                      onClick={() => setFormRole("supervisor")}
                      className={`flex-1 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-85 ${
                        formRole === "supervisor"
                          ? "bg-primary text-white"
                          : "text-on-surface hover:bg-white/50 cursor-pointer"
                      }`}
                    >
                      Supervisor
                    </button>
                  </div>
                </div>

                {/* Profile Picture Upload Field */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-on-surface-variant flex items-center justify-between">
                    <span>Profile Picture <span className="text-primary">* Required</span></span>
                  </label>
                  <div className="flex items-center gap-6 p-4 border-2 border-dashed border-outline rounded-lg bg-surface-variant/30">
                    <div className="relative w-20 h-20 rounded-full border-2 border-[#1A1A1A] overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                      {formAvatar ? (
                        <img
                          src={formAvatar}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-gray-400 text-3xl">
                          account_circle
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 flex-grow">
                      <p className="text-xs font-bold text-on-surface uppercase">
                        Upload avatar image file
                      </p>
                      <p className="text-[10px] text-on-surface-variant uppercase opacity-60">
                        Supports PNG, JPG, or GIF (Max 2MB)
                      </p>
                      <label className="inline-block mt-2 px-4 py-2 border-2 border-[#1A1A1A] rounded-full text-[10px] font-extrabold uppercase hover:bg-primary hover:text-white transition-all cursor-pointer">
                        Choose Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Role Specific Fields */}
                {formRole === "vendor" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase text-on-surface-variant">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={formCompany}
                        onChange={(e) => setFormCompany(e.target.value)}
                        placeholder="e.g. Acme Industrial"
                        className="w-full px-4 py-3 bg-white border-2 border-outline rounded-lg font-bold text-sm focus:border-primary outline-none uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase text-on-surface-variant">
                        Vendor ID
                      </label>
                      <input
                        type="text"
                        value={formId}
                        onChange={(e) => setFormId(e.target.value)}
                        disabled={drawerMode === "edit"}
                        placeholder="V-XXXXX"
                        className="w-full px-4 py-3 bg-white border-2 border-outline rounded-lg font-bold text-sm focus:border-primary outline-none disabled:bg-gray-100 uppercase"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase text-on-surface-variant">
                        Department
                      </label>
                      <input
                        type="text"
                        value={formDept}
                        onChange={(e) => setFormDept(e.target.value)}
                        placeholder="Maintenance"
                        className="w-full px-4 py-3 bg-white border-2 border-outline rounded-lg font-bold text-sm focus:border-primary outline-none uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase text-on-surface-variant">
                        Employee ID
                      </label>
                      <input
                        type="text"
                        value={formId}
                        onChange={(e) => setFormId(e.target.value)}
                        disabled={drawerMode === "edit"}
                        placeholder="S-XXXXX"
                        className="w-full px-4 py-3 bg-white border-2 border-outline rounded-lg font-bold text-sm focus:border-primary outline-none disabled:bg-gray-100 uppercase"
                      />
                    </div>
                  </div>
                )}

                <hr className="border-outline opacity-20" />

                {/* Common Fields */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-on-surface-variant">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Enter name..."
                      className="w-full px-4 py-3 bg-white border-2 border-outline rounded-lg font-bold text-sm focus:border-primary outline-none uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase text-on-surface-variant">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full px-4 py-3 bg-white border-2 border-outline rounded-lg font-bold text-sm focus:border-primary outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase text-on-surface-variant">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-4 py-3 bg-white border-2 border-outline rounded-lg font-bold text-sm focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-on-surface-variant">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-white border-2 border-outline rounded-lg font-bold text-sm focus:border-primary outline-none"
                      />
                      <span
                        onClick={() => setShowPassword(!showPassword)}
                        className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant cursor-pointer"
                      >
                        {showPassword ? "visibility" : "visibility_off"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-on-surface-variant">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={formConfirmPassword}
                      onChange={(e) => setFormConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-white border-2 border-outline rounded-lg font-bold text-sm focus:border-primary outline-none"
                    />
                    {formPassword && formConfirmPassword && formPassword !== formConfirmPassword && (
                      <p className="text-[10px] text-[#D32F2F] font-extrabold uppercase tracking-wider mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        Passwords do not match
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit actions */}
                <div className="pt-6 border-t-2 border-outline bg-white flex gap-4 shrink-0">
                  <button
                    type="button"
                    className="flex-1 py-4 border-2 border-outline rounded-full font-bold text-xs uppercase tracking-wider text-on-surface hover:bg-gray-50 transition-all cursor-pointer"
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-primary text-white rounded-full font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  >
                    {drawerMode === "edit" ? "Save Changes" : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTargetUser && (
          <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => setDeleteTargetUser(null)}
            ></div>
            <div className="relative bg-white border-4 border-outline p-8 rounded-lg max-w-sm w-full z-10 text-center space-y-6">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-4xl">delete_forever</span>
              </div>
              <div className="space-y-1">
                <h3 className="font-headline-md text-xl font-extrabold uppercase text-on-surface">
                  Delete User
                </h3>
                <p className="text-sm font-bold text-on-surface-variant uppercase">
                  Are you sure you want to delete user{" "}
                  <span className="text-primary font-black">{deleteTargetUser.name}</span>?
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  className="flex-1 py-4 border-2 border-outline rounded-full font-bold text-xs uppercase tracking-wider text-on-surface hover:bg-gray-50 transition-all cursor-pointer"
                  onClick={() => setDeleteTargetUser(null)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-4 bg-primary text-white rounded-full font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  onClick={handleConfirmDelete}
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deactivate Confirmation Modal */}
        {deactivateTargetUser && (
          <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => setDeactivateTargetUser(null)}
            ></div>
            <div className="relative bg-white border-4 border-outline p-8 rounded-lg max-w-md w-full z-10 space-y-6">
              <div className="w-16 h-16 bg-[#D32F2F]/10 text-[#D32F2F] rounded-full flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-4xl">block</span>
              </div>
              <div className="space-y-2 text-center">
                <h3 className="font-headline-md text-xl font-extrabold uppercase text-[#D32F2F]">
                  Deactivate User
                </h3>
                <p className="text-sm font-bold text-on-surface-variant uppercase">
                  Deactivating account for{" "}
                  <span className="text-[#D32F2F] font-black">{deactivateTargetUser.name}</span>.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-on-surface-variant">
                  Reason for Deactivation <span className="text-primary">* Required</span>
                </label>
                <textarea
                  value={deactivationReason}
                  onChange={(e) => setDeactivationReason(e.target.value)}
                  placeholder="e.g. Temporary leave, Safety policy violation, Resigned..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white border-2 border-outline rounded-lg font-bold text-sm focus:border-primary outline-none uppercase"
                />
              </div>

              <div className="flex gap-4">
                <button
                  className="flex-1 py-4 border-2 border-outline rounded-full font-bold text-xs uppercase tracking-wider text-on-surface hover:bg-gray-50 transition-all cursor-pointer"
                  onClick={() => setDeactivateTargetUser(null)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-4 bg-[#D32F2F] text-white rounded-full font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  onClick={handleConfirmDeactivate}
                >
                  Confirm Deactivate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toasts List Popup */}
        <div className="fixed top-6 right-6 z-[100] flex flex-col items-end gap-2 pointer-events-none">
          {toasts.map((toast) => {
            let bgColor = "bg-[#2E7D32]"; // success
            let iconName = "check_circle";

            if (toast.type === "error") {
              bgColor = "bg-[#D32F2F]";
              iconName = "error";
            } else if (toast.type === "info") {
              bgColor = "bg-[#1976D2]";
              iconName = "info";
            }

            return (
              <div
                key={toast.id}
                className={`pointer-events-auto ${bgColor} text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 border-2 border-black animate-in fade-in slide-in-from-top-5 duration-300`}
              >
                <span className="material-symbols-outlined text-sm">{iconName}</span>
                <span className="font-bold text-xs uppercase tracking-wider">{toast.message}</span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
