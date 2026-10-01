"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToasts } from "@/lib/useToasts";

interface UserProfile {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  role: "vendor" | "supervisor";
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
}

export default function UserManagementPage() {
  const supabase = createClient();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<"all" | "vendor" | "supervisor">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formRole, setFormRole] = useState<"vendor" | "supervisor">("vendor");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDept, setFormDept] = useState("");
  const [generatedEmployeeId, setGeneratedEmployeeId] = useState("");
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [formPassword, setFormPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Deactivation modal
  const [deactivateTarget, setDeactivateTarget] = useState<UserProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserProfile | null>(null);

  const { toasts, triggerToast } = useToasts(4000, "success");

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      // Ensure we have an active auth session before querying (RLS requires authenticated user)
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("No active session. Please log in again.");
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      // PostgrestError has non-enumerable props — capture them explicitly
      if (error) {
        const msg = `[${error.code}] ${error.message}${error.details ? ` — ${error.details}` : ""}${error.hint ? ` (Hint: ${error.hint})` : ""}`;
        console.error("Supabase profiles query error:", msg);
        throw new Error(msg);
      }

      console.log("Fetched profiles from database:", data);
      setUsers(data || []);
    } catch (err: any) {
      const errorMsg = err?.message || String(err) || "Failed to load users.";
      console.error("Error fetching users:", errorMsg);
      setFetchError(errorMsg);
      triggerToast(errorMsg, "error");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, triggerToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const should = sessionStorage.getItem("autoOpenAddUser");
      if (should === "true") { sessionStorage.removeItem("autoOpenAddUser"); handleOpenAddDrawer(); }
    }
  }, []);

  // ── Auto-generate Employee ID ──────────────────────────────────────────
  const generateEmployeeId = useCallback(async (role: "vendor" | "supervisor") => {
    setIsGeneratingId(true);
    try {
      const prefix = role === "vendor" ? "VND" : "SUP";
      // Count all existing users of this role (including inactive)
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", role);

      const nextNum = String((count ?? 0) + 1).padStart(3, "0");
      // Random uppercase letter suffix (A-Z)
      const suffix = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      setGeneratedEmployeeId(`${prefix}-${nextNum}-${suffix}`);
    } catch {
      setGeneratedEmployeeId(`${role === "vendor" ? "VND" : "SUP"}-001-X`);
    } finally {
      setIsGeneratingId(false);
    }
  }, [supabase]);

  // Re-generate when role changes inside the "add" drawer
  useEffect(() => {
    if (isDrawerOpen && drawerMode === "add") {
      generateEmployeeId(formRole);
    }
  }, [formRole, isDrawerOpen, drawerMode, generateEmployeeId]);

  const handleOpenAddDrawer = () => {
    setDrawerMode("add"); setEditingUserId(null);
    setFormName(""); setFormEmail(""); setFormPhone("");
    setFormDept(""); setGeneratedEmployeeId(""); setFormPassword("");
    setFormRole(roleFilter === "all" ? "vendor" : roleFilter);
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (user: UserProfile) => {
    setDrawerMode("edit"); setEditingUserId(user.id);
    setFormName(user.full_name); setFormEmail(user.email);
    setFormPhone(user.phone || ""); setFormDept(user.department || "");
    setGeneratedEmployeeId(user.employee_id); setFormRole(user.role);
    setFormPassword("");
    setIsDrawerOpen(true);
  };

  const handleDrawerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      triggerToast("Name and Email are required.", "error"); return;
    }
    if (drawerMode === "add" && !generatedEmployeeId) {
      triggerToast("Employee ID is still generating. Please wait.", "error"); return;
    }
    if (drawerMode === "add" && !formPassword.trim()) {
      triggerToast("Password is required for new users.", "error"); return;
    }
    if (formPassword.trim() && formPassword.trim().length < 6) {
      triggerToast("Password must be at least 6 characters.", "error"); return;
    }

    setIsSubmitting(true);
    try {
      if (drawerMode === "add") {
        // Create auth user via Supabase admin — note: in production use Edge Function for this
        // For now, insert profile directly (user must be created in Supabase Auth manually or via Edge Function)
        // We'll try signUp approach: user gets created + profile trigger fires
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: formEmail.trim(),
          password: formPassword,
          options: {
            data: { full_name: formName.trim(), role: formRole, employee_id: generatedEmployeeId }
          }
        });
        if (signUpErr) throw signUpErr;
        // If trigger didn't set everything, upsert the profile
        if (signUpData.user) {
          await supabase.from("profiles").upsert({
            id: signUpData.user.id,
            full_name: formName.trim(),
            email: formEmail.trim(),
            role: formRole,
            employee_id: generatedEmployeeId,
            phone: formPhone.trim() || null,
            department: formDept.trim() || null,
            is_active: true,
          });
        }
        triggerToast(`User "${formName}" created successfully.`, "success");
      } else {
        const { error } = await supabase.from("profiles").update({
          full_name: formName.trim(),
          phone: formPhone.trim() || null,
          department: formDept.trim() || null,
        }).eq("id", editingUserId!);
        if (error) throw error;

        // If a password was specified in the edit form, execute the secure password update RPC
        if (formPassword.trim()) {
          const { error: pwdErr } = await supabase.rpc("admin_update_user_password", {
            target_user_id: editingUserId!,
            new_password: formPassword.trim()
          });
          if (pwdErr) throw pwdErr;
        }

        triggerToast("User details updated.", "success");
      }
      setIsDrawerOpen(false);
      fetchUsers();
    } catch (err: any) {
      triggerToast(err.message || "Operation failed.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: UserProfile) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_active: !user.is_active }).eq("id", user.id);
      if (error) throw error;
      triggerToast(`User "${user.full_name}" ${user.is_active ? "deactivated" : "activated"}.`, "success");
      setDeactivateTarget(null);
      fetchUsers();
    } catch (err: any) {
      triggerToast(err.message || "Update failed.", "error");
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", user.id);
      if (error) throw error;
      triggerToast(`User "${user.full_name}" deleted successfully.`, "success");
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      triggerToast(err.message || "Delete failed.", "error");
    }
  };

  const filteredUsers = users.filter(u => {
    const isTargetRole = u.role === "vendor" || u.role === "supervisor";
    if (!isTargetRole) return false;
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    return (
      ((u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())) ||
      ((u.email || "").toLowerCase().includes(searchQuery.toLowerCase())) ||
      ((u.employee_id || "").toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const vendorCount = users.filter(u => u.role === "vendor").length;
  const supervisorCount = users.filter(u => u.role === "supervisor").length;
  const targetUsers = users.filter(u => u.role === "vendor" || u.role === "supervisor");
  const activeCount = targetUsers.filter(u => u.is_active).length;

  const getInitials = (name: string) => name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2);

  return (
    <div className="flex h-screen w-full bg-page text-[#1A1A1A] font-body-md overflow-hidden">
      <main className="lg:ml-[220px] h-screen flex flex-col overflow-hidden bg-page w-full lg:w-[calc(100%-220px)] flex-grow pb-24 lg:pb-0">
        {/* Header */}
        <header className="min-h-24 bg-white border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 lg:px-10 gap-4 shrink-0 z-40">
          <div>
            <h2 className="font-headline-md text-sm sm:text-base md:text-xl text-[#1A1A1A] uppercase font-semibold tracking-tight">User Management</h2>
            <p className="text-[9px] sm:text-[10px] text-gray-500 font-medium uppercase tracking-wide">Vendors & Supervisors</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0 sm:w-48 md:w-64">
              <input type="text" placeholder="SEARCH USERS..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                className="w-full p-2.5 pr-8 border border-gray-200 rounded-[12px] bg-white text-xs font-medium focus:outline-none uppercase"/>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            </div>
            <button onClick={handleOpenAddDrawer} className="flex items-center justify-center gap-2 bg-[#D32F2F] text-white border border-gray-200 rounded-full px-4 py-2.5 font-medium text-xs uppercase hover:bg-black transition-colors cursor-pointer shrink-0">
              <span className="material-symbols-outlined text-[18px]">person_add</span>Add User
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-6 lg:space-y-8 pb-28">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            {[
              { label:"Total Users", value:targetUsers.length, icon:"group", color:"text-[#D32F2F]" },
              { label:"Vendors", value:vendorCount, icon:"handyman", color:"text-blue-600" },
              { label:"Active", value:activeCount, icon:"verified_user", color:"text-green-600" },
            ].map(card=>(
              <div key={card.label} className="bg-white rounded-[20px] p-6 flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500 tracking-wider">{card.label}</p>
                  {isLoading?<div className="h-10 w-16 bg-gray-100 rounded animate-pulse mt-2"/>:<p className={`text-4xl font-semibold tracking-tighter mt-1 ${card.color}`}>{card.value}</p>}
                </div>
                <span className={`material-symbols-outlined text-3xl ${card.color}`}>{card.icon}</span>
              </div>
            ))}
          </div>

          {/* Error Banner */}
          {fetchError && (
            <div className="bg-[#D32F2F]/10 border-[#D32F2F] rounded-[20px] p-6 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <span className="material-symbols-outlined text-gray-400 text-3xl shrink-0 mt-0.5">error</span>
              <div className="flex-1 space-y-2">
                <h4 className="font-semibold text-sm uppercase tracking-tight text-[#D32F2F]">Database Query Error</h4>
                <p className="text-xs font-semibold text-gray-600 leading-relaxed">
                  {fetchError}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => fetchUsers()}
                    className="flex items-center gap-1.5 bg-[#D32F2F] text-white border border-gray-200 rounded-full px-4 py-1.5 font-medium text-[10px] uppercase hover:bg-black transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                    Retry Fetch
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-3 border-b border-gray-200 pb-0 overflow-x-auto shrink-0">
            {[
              { id: "all", label: "All Users", count: targetUsers.length },
              { id: "vendor", label: "Vendors", count: vendorCount },
              { id: "supervisor", label: "Supervisors", count: supervisorCount }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id as any)}
                className={`px-6 py-3 font-semibold text-xs uppercase tracking-wider border-b transition-all cursor-pointer shrink-0 ${
                  roleFilter === tab.id
                    ? "border-[#D32F2F] text-[#D32F2F]"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Users Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i=><div key={i} className="h-48 bg-gray-100 rounded-[20px] animate-pulse"/>)}
            </div>
          ) : fetchError ? (
            <div className="text-center py-20 text-gray-400 font-medium uppercase border border-dashed border-gray-200 rounded-[20px]">
              <span className="material-symbols-outlined text-5xl block mb-3 opacity-30">warning</span>
              Failed to load profiles due to schema or connection issue.
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-medium uppercase">
              <span className="material-symbols-outlined text-5xl block mb-3 opacity-30">group</span>
              {searchQuery ? "No users match your search." : `No users registered for this filter yet.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map(user=>(
                <div key={user.id} className={`bg-white border rounded-[20px] p-6 flex flex-col gap-4 transition-all hover:shadow-md ${user.is_active?"border-gray-200":"border-gray-200 opacity-60"}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#D32F2F] flex items-center justify-center text-white font-semibold text-sm overflow-hidden shrink-0">
                        {user.avatar_url ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover"/> : getInitials(user.full_name)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm uppercase tracking-tight">{user.full_name}</h4>
                        <p className="text-[10px] text-[#D32F2F] font-medium uppercase">{user.employee_id}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[9px] font-semibold uppercase border ${user.is_active?"bg-green-50 text-green-700 border-green-300":"bg-gray-100 text-gray-500 border-gray-200"}`}>
                      {user.is_active?"ACTIVE":"INACTIVE"}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs font-medium text-gray-500">
                    <p className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">mail</span>{user.email}</p>
                    {user.phone && <p className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">call</span>{user.phone}</p>}
                    {user.department && <p className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">business</span>{user.department}</p>}
                    <p className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">calendar_today</span>Joined {new Date(user.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</p>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button onClick={()=>handleOpenEditDrawer(user)} className="flex-1 py-2 text-xs font-medium uppercase border border-gray-200 rounded-full hover:bg-gray-50 transition-all cursor-pointer">
                      Edit
                    </button>
                    <button onClick={()=>setDeactivateTarget(user)} className={`flex-1 py-2 text-xs font-medium uppercase border rounded-full transition-all cursor-pointer ${user.is_active?"border-orange-400 text-orange-600 hover:bg-orange-50":"border-green-400 text-green-600 hover:bg-green-50"}`}>
                      {user.is_active?"Deactivate":"Activate"}
                    </button>
                    <button onClick={()=>setSelectedUserDetail(user)} className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 transition-all cursor-pointer" title="View Details">
                      <span className="material-symbols-outlined text-[16px] text-gray-400">info</span>
                    </button>
                    <button onClick={()=>setDeleteTarget(user)} className="p-2 border border-red-200 hover:border-[#D32F2F] hover:bg-red-50 text-[#D32F2F] rounded-full transition-all cursor-pointer" title="Delete User">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Drawer */}
        {isDrawerOpen && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex justify-end">
            <div className="absolute inset-0 cursor-pointer" onClick={()=>setIsDrawerOpen(false)}/>
            <div className="relative h-full w-full md:w-[480px] bg-white border-l border-gray-200 flex flex-col z-10 animate-in slide-in-from-right duration-300">
              <div className="p-8 border-b border-gray-200 flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-semibold uppercase tracking-tight">{drawerMode==="edit"?"Edit User":"Add New User"}</h2>
                <button className="p-2 hover:bg-gray-100 rounded-full cursor-pointer" onClick={()=>setIsDrawerOpen(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleDrawerSubmit} className="flex-grow overflow-y-auto p-8 space-y-5">
                {drawerMode === "add" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase opacity-40">Role</label>
                    <div className="flex gap-3">
                      {(["vendor","supervisor"] as const).map(r=>(
                        <button key={r} type="button" onClick={()=>setFormRole(r)} className={`flex-1 py-3 rounded-[20px] border font-medium text-xs uppercase transition-all cursor-pointer ${formRole===r?"bg-[#D32F2F] text-white border-[#D32F2F]":"bg-white border-gray-200 hover:bg-gray-50"}`}>{r}</button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Employee ID — auto-generated, read-only */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase opacity-40">Employee ID</label>
                    {drawerMode === "add" && (
                      <button
                        type="button"
                        onClick={() => generateEmployeeId(formRole)}
                        disabled={isGeneratingId}
                        className="text-[10px] font-semibold text-[#D32F2F] uppercase hover:underline cursor-pointer border-none bg-transparent flex items-center gap-1 disabled:opacity-50"
                      >
                        <span className={`material-symbols-outlined text-[12px] ${isGeneratingId ? "animate-spin" : ""}`}>refresh</span>
                        Regenerate
                      </button>
                    )}
                  </div>
                  <div className={`w-full border rounded-[12px] p-3 flex items-center justify-between ${
                    drawerMode === "add" ? "border-[#D32F2F] bg-[#D32F2F]/5" : "border-gray-200 bg-gray-50"
                  }`}>
                    {isGeneratingId ? (
                      <div className="flex items-center gap-2 text-gray-400">
                        <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                        <span className="text-xs font-medium">Generating...</span>
                      </div>
                    ) : (
                      <span className={`font-semibold text-sm tracking-widest ${
                        drawerMode === "add" ? "text-[#D32F2F]" : "text-gray-500"
                      }`}>
                        {generatedEmployeeId || "—"}
                      </span>
                    )}
                    {drawerMode === "add" && (
                      <span className="text-[9px] font-semibold uppercase text-[#D32F2F] bg-[#D32F2F]/10 px-2 py-0.5 rounded-full">AUTO</span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 font-semibold">
                    {drawerMode === "add"
                      ? `Format: ${formRole === "vendor" ? "VND" : "SUP"}-XXX-Y — generated automatically based on role.`
                      : "Employee ID cannot be changed after creation."}
                  </p>
                </div>

                {[
                  { label:"Full Name *", value:formName, set:setFormName, type:"text" },
                  { label:"Email *", value:formEmail, set:setFormEmail, type:"email", disabled:drawerMode==="edit" },
                  { label:"Phone", value:formPhone, set:setFormPhone, type:"text" },
                  { label:"Department", value:formDept, set:setFormDept, type:"text" },
                ].map(({label,value,set,type,disabled}:any)=>(
                  <div key={label} className="space-y-2">
                    <label className="block text-xs font-semibold uppercase opacity-40">{label}</label>
                    <input type={type} value={value} onChange={(e:any)=>set(e.target.value)} disabled={disabled}
                      className="w-full border border-gray-200 p-3 rounded-[12px] font-medium focus:border-[#D32F2F] bg-white text-[#1A1A1A] outline-none disabled:opacity-50 disabled:bg-gray-50"/>
                  </div>
                ))}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase opacity-40">
                    {drawerMode === "edit" ? "Reset User Password (Leave blank to keep unchanged)" : "Initial Password *"}
                  </label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={drawerMode === "edit" ? "Enter new password to reset..." : "Min. 6 characters"}
                    className="w-full border border-gray-200 p-3 rounded-[12px] font-medium focus:border-[#D32F2F] bg-white text-[#1A1A1A] outline-none"
                  />
                </div>
                <div className="pt-4">
                  <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#D32F2F] text-white font-semibold uppercase tracking-widest rounded-[20px] border border-gray-200 hover:bg-black transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
                    {isSubmitting?<><span className="material-symbols-outlined animate-spin text-base">progress_activity</span>SAVING...</>:(drawerMode==="edit"?"Save Changes":"Create User")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Deactivate Confirm */}
        {deactivateTarget && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 cursor-pointer" onClick={()=>setDeactivateTarget(null)}/>
            <div className="relative bg-white p-8 rounded-[20px] max-w-md w-full z-10 shadow-sm">
              <h3 className="text-xl font-semibold uppercase mb-4">{deactivateTarget.is_active?"Deactivate":"Activate"} User</h3>
              <p className="font-medium opacity-70 mb-8">
                {deactivateTarget.is_active?"Deactivate":"Activate"} account for{" "}
                <span className="text-[#D32F2F]">{deactivateTarget.full_name}</span>?
              </p>
              <div className="flex gap-4">
                <button className="flex-1 py-3 border border-gray-200 font-semibold uppercase rounded-[12px] cursor-pointer hover:bg-gray-50" onClick={()=>setDeactivateTarget(null)}>Cancel</button>
                <button className={`flex-1 py-3 text-white font-semibold uppercase rounded-[12px] cursor-pointer border border-gray-200 ${deactivateTarget.is_active?"bg-orange-500 hover:bg-orange-600":"bg-green-600 hover:bg-green-700"}`} onClick={()=>handleToggleActive(deactivateTarget)}>
                  {deactivateTarget.is_active?"Deactivate":"Activate"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 cursor-pointer" onClick={()=>setDeleteTarget(null)}/>
            <div className="relative bg-white p-8 rounded-[20px] max-w-md w-full z-10 animate-in fade-in zoom-in duration-200 shadow-sm">
              <h3 className="text-xl font-semibold uppercase text-[#D32F2F] mb-4">Delete User</h3>
              <p className="font-medium opacity-70 mb-8">
                Are you sure you want to permanently delete user{" "}
                <span className="text-[#D32F2F]">{deleteTarget.full_name}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button className="flex-1 py-3 border border-gray-200 font-semibold uppercase rounded-[12px] cursor-pointer hover:bg-gray-50" onClick={()=>setDeleteTarget(null)}>Cancel</button>
                <button className="flex-1 py-3 bg-[#D32F2F] text-white font-semibold uppercase rounded-[12px] cursor-pointer border border-gray-200 hover:bg-black transition-colors" onClick={()=>handleDeleteUser(deleteTarget)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Detail Modal */}
        {selectedUserDetail && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 cursor-pointer" onClick={()=>setSelectedUserDetail(null)}/>
            <div className="relative bg-white p-8 rounded-[20px] max-w-md w-full z-10 animate-in fade-in zoom-in duration-200 shadow-sm">
              <div className="flex justify-between items-start mb-6 border-b border-gray-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-[#D32F2F] flex items-center justify-center text-white font-semibold overflow-hidden">
                    {selectedUserDetail.avatar_url?<img src={selectedUserDetail.avatar_url} alt="" className="w-full h-full object-cover"/>:getInitials(selectedUserDetail.full_name)}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold uppercase">{selectedUserDetail.full_name}</h3>
                    <span className="text-[10px] bg-[#D32F2F] text-white px-2 py-0.5 rounded-full font-medium uppercase">{selectedUserDetail.role}</span>
                  </div>
                </div>
                <button className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-full hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer" onClick={()=>setSelectedUserDetail(null)}>
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
              <div className="space-y-3 text-xs font-medium uppercase">
                {[
                  {l:"Employee ID",v:selectedUserDetail.employee_id},
                  {l:"Email",v:selectedUserDetail.email},
                  {l:"Phone",v:selectedUserDetail.phone||"—"},
                  {l:"Department",v:selectedUserDetail.department||"—"},
                  {l:"Status",v:selectedUserDetail.is_active?"Active":"Inactive"},
                  {l:"Joined",v:new Date(selectedUserDetail.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})},
                ].map(({l,v})=>(
                  <div key={l} className="flex justify-between py-2 border-b border-gray-100"><span className="opacity-50">{l}</span><span>{v}</span></div>
                ))}
              </div>
              <button className="w-full mt-6 py-3 bg-[#D32F2F] text-white font-semibold uppercase rounded-[12px] hover:bg-black cursor-pointer text-xs" onClick={()=>setSelectedUserDetail(null)}>Close</button>
            </div>
          </div>
        )}

        {/* Toasts */}
        <div className="fixed top-6 right-6 z-[100] flex flex-col items-end gap-2 pointer-events-none">
          {toasts.map(t=>(
            <div key={t.id} className="pointer-events-auto bg-[#1a1c1c] text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 border border-[#D32F2F] animate-in fade-in slide-in-from-top-5 duration-300">
              <span className={`material-symbols-outlined text-sm ${t.type==="success"?"text-green-400":t.type==="error"?"text-[#D32F2F]":"text-blue-400"}`}>
                {t.type==="success"?"check_circle":t.type==="error"?"error":"info"}
              </span>
              <span className="font-medium text-xs uppercase tracking-wider">{t.message}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
