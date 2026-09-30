"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Asset {
  id: string;
  asset_code: string;
  name: string;
  type: string;
  category: string;
  location: string;
  status: string;
  updated_at: string;
  is_deleted?: boolean;
  description?: string;
  image_url?: string;
}

interface ToastType { id: string; message: string; type: "success" | "error" | "info"; }

function getAssetStatusLabel(status: string): string {
  if (status === "operational")      return "Operational";
  if (status === "under maintenance") return "Under Maintenance";
  if (status === "decommissioned")    return "Decommissioned";
  return status || "Unknown";
}

export default function AssetManagementPage() {
  const supabase = createClient();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [allAssetCodes, setAllAssetCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"RECENT" | "NAME" | "ID">("RECENT");

  // Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCategory, setFormCategory] = useState("MECHANICAL");
  const [formLocation, setFormLocation] = useState("");
  const [formStatus, setFormStatus] = useState("operational");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Modals
  const [deleteTargetAsset, setDeleteTargetAsset] = useState<Asset | null>(null);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const triggerToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      triggerToast("Please select an image file.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      triggerToast("Image must be under 5MB.", "error");
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `assets/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("pm_evidence")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("pm_evidence")
        .getPublicUrl(fileName);

      setFormImageUrl(urlData.publicUrl);
      setImagePreview(urlData.publicUrl);
      triggerToast("Image uploaded successfully.", "success");
    } catch (err: any) {
      triggerToast(err.message || "Image upload failed.", "error");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from("assets").select("*");
      if (sortBy === "NAME") query = query.order("name");
      else if (sortBy === "ID") query = query.order("asset_code");
      else query = query.order("updated_at", { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      
      const activeAssets = (data || []).filter((a: any) => !a.is_deleted);
      setAssets(activeAssets);
      setAllAssetCodes((data || []).map((a: any) => a.asset_code));
    } catch {
      triggerToast("Failed to load assets.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, sortBy, triggerToast]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const should = sessionStorage.getItem("autoOpenAddAsset");
      if (should === "true") {
        sessionStorage.removeItem("autoOpenAddAsset");
        handleOpenAddDrawer();
      }
    }
  }, []);

  const generateNextAssetCode = useCallback((category: string) => {
    const prefix = (() => {
      const clean = category.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (clean === "MECHANICAL") return "MCH";
      if (clean === "ELECTRICAL") return "ELC";
      if (clean === "FACILITIES") return "FAC";
      if (clean === "HYDRAULIC") return "HYD";
      if (!clean) return "AST";
      return clean.slice(0, 3).padEnd(3, "X");
    })();

    const regex = new RegExp(`^${prefix}-(\\d+)$`);
    let maxNum = 0;

    allAssetCodes.forEach((codeStr) => {
      const code = codeStr.toUpperCase();
      const match = code.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    const paddedNum = String(nextNum).padStart(3, "0");
    return `${prefix}-${paddedNum}`;
  }, [allAssetCodes]);

  const handleOpenAddDrawer = () => {
    setDrawerMode("add"); setEditingAssetId(null);
    setFormName(""); setFormType(""); setFormCategory("MECHANICAL");
    setFormLocation(""); setFormStatus("operational");
    setIsCustomCategory(false); setCustomCategoryName("");
    setFormDescription(""); setFormImageUrl(""); setImagePreview(null);
    
    // Auto generate code for default category "MECHANICAL"
    const nextCode = generateNextAssetCode("MECHANICAL");
    setFormCode(nextCode);
    
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (asset: Asset) => {
    setDrawerMode("edit"); setEditingAssetId(asset.id);
    setFormName(asset.name); setFormType(asset.type || ""); setFormCode(asset.asset_code);
    setFormLocation(asset.location); setFormStatus(asset.status);
    setFormDescription(asset.description || "");
    setFormImageUrl(asset.image_url || "");
    setImagePreview(asset.image_url || null);
    const predefined = ["MECHANICAL", "ELECTRICAL", "FACILITIES", "HYDRAULIC"];
    if (predefined.includes(asset.category.toUpperCase())) {
      setFormCategory(asset.category.toUpperCase()); setIsCustomCategory(false); setCustomCategoryName("");
    } else {
      setFormCategory("CUSTOM"); setIsCustomCategory(true); setCustomCategoryName(asset.category);
    }
    setIsDrawerOpen(true);
  };

  const handleDrawerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formType.trim() || !formCode.trim() || !formLocation.trim()) {
      triggerToast("Please fill in all fields.", "error"); return;
    }
    const categoryToSave = isCustomCategory ? customCategoryName.trim().toUpperCase() : formCategory;
    if (!categoryToSave) { triggerToast("Specify a category name.", "error"); return; }

    setIsSubmitting(true);
    try {
      if (drawerMode === "add") {
        const { error } = await supabase.from("assets").insert({
          asset_code: formCode.trim().toUpperCase(),
          name: formName.trim(),
          type: formType.trim(),
          category: categoryToSave,
          location: formLocation.trim(),
          status: formStatus,
          description: formDescription.trim() || null,
          image_url: formImageUrl || null,
        });
        if (error) throw error;
        triggerToast(`Asset "${formName}" created successfully.`, "success");
      } else {
        const { error } = await supabase.from("assets").update({
          name: formName.trim(),
          type: formType.trim(),
          category: categoryToSave,
          location: formLocation.trim(),
          status: formStatus,
          description: formDescription.trim() || null,
          image_url: formImageUrl || null,
        }).eq("id", editingAssetId!);
        if (error) throw error;
        triggerToast("Asset details updated.", "success");
      }
      setIsDrawerOpen(false);
      fetchAssets();
    } catch (err: any) {
      triggerToast(err.message || "Operation failed.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetAsset) return;
    try {
      // Soft delete: mark as deleted instead of hard delete
      // This preserves all historical pm_tasks & pm_reports referencing this asset
      const { error } = await supabase
        .from("assets")
        .update({ is_deleted: true })
        .eq("id", deleteTargetAsset.id);
      if (error) throw error;
      triggerToast(`Asset "${deleteTargetAsset.name}" deleted.`, "success");
      setDeleteTargetAsset(null);
      fetchAssets();
    } catch (err: any) {
      triggerToast(err.message || "Delete failed.", "error");
    }
  };

  const predefinedOrder = ["MECHANICAL", "ELECTRICAL", "FACILITIES", "HYDRAULIC"];
  const categoriesList = Array.from(new Set(assets.map(a => a.category.toUpperCase()))).sort((a, b) => {
    const ia = predefinedOrder.indexOf(a), ib = predefinedOrder.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1; if (ib !== -1) return 1;
    return a.localeCompare(b);
  });

  const filteredAssets = assets.filter(a => {
    const q = searchQuery.toLowerCase();
    return (a.name.toLowerCase().includes(q) || a.asset_code.toLowerCase().includes(q) || a.location.toLowerCase().includes(q)) &&
      (categoryFilter === "ALL" || a.category.toUpperCase() === categoryFilter) &&
      (statusFilter === "ALL" || a.status === statusFilter);
  });

  const statusDot = (s: string) =>
    s === "operational"      ? "bg-green-500" :
    s === "under maintenance" ? "bg-orange-500" :
    s === "decommissioned"    ? "bg-gray-400"   : "bg-gray-300";
  const statusLabel = getAssetStatusLabel;

  return (
    <div className="flex h-screen w-full bg-[#FFFFFF] text-[#1A1A1A] font-body-md overflow-hidden">
      <main className="lg:ml-[220px] h-screen flex flex-col overflow-hidden bg-white w-full lg:w-[calc(100%-220px)] flex-grow relative pb-24 lg:pb-0">
        <header className="min-h-24 bg-white border-b-2 border-[#1A1A1A] flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 lg:px-10 gap-4 shrink-0 z-40">
          <div>
            <h2 className="font-headline-md text-sm sm:text-base md:text-xl text-[#1A1A1A] uppercase font-extrabold tracking-tight">Asset Management</h2>
            <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-wide">Manage facilities and heavy machinery</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-48 md:w-64">
              <input type="text" placeholder="SEARCH ASSETS..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full p-2.5 pr-8 border-2 border-[#1A1A1A] rounded-[12px] bg-white text-xs font-bold focus:outline-none uppercase"/>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            </div>
          </div>
        </header>

        {/* Mobile-only Add Asset FAB — fixed above bottom nav, hidden on desktop */}
        <button
          onClick={handleOpenAddDrawer}
          style={{ display: 'flex' }}
          className="lg:!hidden fixed bottom-24 right-5 z-[50] w-14 h-14 bg-[#D32F2F] text-white border-2 border-[#1A1A1A] rounded-[18px] items-center justify-center shadow-lg cursor-pointer active:scale-95 transition-transform"
          title="Add Asset"
        >
          <span className="material-symbols-outlined text-[30px] font-black">add</span>
        </button>

        <div className="flex-1 overflow-y-auto p-4 lg:p-10 bg-[#f9f9f9] pb-28">
          {/* Filters */}
          <section className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase text-gray-400">Category:</span>
                <div className="relative">
                  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                    className="border-2 border-[#1A1A1A] px-4 py-2 pr-10 rounded-[20px] bg-white text-sm font-bold appearance-none cursor-pointer focus:outline-none uppercase min-w-[180px]">
                    <option value="ALL">ALL CATEGORIES</option>
                    {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-sm">expand_more</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase text-gray-400">Status:</span>
                <div className="relative">
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="border-2 border-[#1A1A1A] px-4 py-2 pr-10 rounded-[20px] bg-white text-sm font-bold appearance-none cursor-pointer focus:outline-none uppercase min-w-[180px]">
                    <option value="ALL">ALL STATUSES</option>
                    <option value="operational">OPERATIONAL</option>
                    <option value="under maintenance">UNDER MAINTENANCE</option>
                    <option value="decommissioned">DECOMMISSIONED</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-sm">expand_more</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase text-gray-400">Sort by:</span>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                className="border-2 border-[#1A1A1A] px-4 py-2 pr-10 rounded-[20px] bg-white text-sm font-bold appearance-none cursor-pointer focus:outline-none uppercase">
                <option value="RECENT">RECENT ACTIVITY</option>
                <option value="NAME">NAME</option>
                <option value="ID">ASSET CODE</option>
              </select>
            </div>
          </section>

          {/* Asset Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            {isLoading ? (
              Array.from({length:4}).map((_,i)=><div key={i} className="h-48 bg-gray-100 rounded-[20px] animate-pulse"/>)
            ) : filteredAssets.length === 0 ? (
              <div className="lg:col-span-2 text-center py-20 text-gray-400 font-bold uppercase">
                <span className="material-symbols-outlined text-5xl block mb-3 opacity-30">precision_manufacturing</span>
                {searchQuery ? "No assets match your search." : "No assets registered yet. Add your first asset!"}
              </div>
            ) : filteredAssets.map(asset => {
              const isUnderMaintenance = asset.status === "under maintenance";
              const isDecommissioned   = asset.status === "decommissioned";
              return (
                <div key={asset.id} className={`heritage-card flex flex-col justify-between cursor-pointer transition-transform hover:scale-[1.01] ${
                  isUnderMaintenance ? "bg-[#D32F2F] text-white border-black" :
                  isDecommissioned   ? "bg-gray-800 text-white border-black" :
                  "bg-white text-[#1A1A1A] border-black"
                }`}>
                  {/* Asset Thumbnail */}
                  {asset.image_url && (
                    <div className="-mx-[30px] -mt-[30px] mb-5 h-40 overflow-hidden rounded-t-[18px] border-b-2 border-[#1A1A1A]">
                      <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-6">
                    <span className={`inline-block text-[10px] font-black px-3 py-1 rounded-[12px] border shrink-0 ${
                      isUnderMaintenance ? "bg-white text-[#D32F2F] border-white" :
                      isDecommissioned   ? "bg-white text-gray-800 border-white" :
                      "bg-[#1A1A1A] text-white border-black"
                    }`}>
                      {asset.asset_code}
                    </span>
                    <div className="flex gap-2 shrink-0">
                      {[{icon:"edit",action:()=>{handleOpenEditDrawer(asset);}},{icon:"delete",action:()=>setDeleteTargetAsset(asset)}].map(({icon,action})=>(
                        <button key={icon} onClick={e=>{e.stopPropagation();action();}} className={`w-10 h-10 flex items-center justify-center border-2 rounded-[12px] transition-all cursor-pointer ${
                          isUnderMaintenance || isDecommissioned
                            ? "border-white text-white hover:bg-white hover:text-[#D32F2F]"
                            : "border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#D32F2F] hover:text-white"
                        }`}>
                          <span className="material-symbols-outlined text-[18px]">{icon}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-8">
                    <h3 className={`text-2xl font-extrabold mb-2 uppercase tracking-tight ${(isUnderMaintenance||isDecommissioned)?"text-white":"text-[#1A1A1A]"}`}>{asset.name}</h3>
                    <p className={`text-sm font-bold flex items-center gap-2 ${(isUnderMaintenance||isDecommissioned)?"text-white/80":"text-gray-500"}`}>
                      <span className="material-symbols-outlined text-lg">location_on</span>{asset.location}
                    </p>
                    <p className={`text-sm font-bold flex items-center gap-2 mt-1 ${(isUnderMaintenance||isDecommissioned)?"text-white/80":"text-gray-500"}`}>
                      <span className="material-symbols-outlined text-lg">category</span>{asset.category} <span className="opacity-40">|</span> {asset.type}
                    </p>
                    {asset.description && (
                      <p className={`text-xs mt-3 leading-relaxed line-clamp-2 ${(isUnderMaintenance||isDecommissioned)?"text-white/70":"text-gray-400"}`}>{asset.description}</p>
                    )}
                  </div>
                  <div className={`flex items-center justify-between mt-auto pt-6 border-t-2 ${(isUnderMaintenance||isDecommissioned)?"border-white/40":"border-[#1A1A1A]"}`}>
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${(isUnderMaintenance||isDecommissioned)?"text-white/60":"text-gray-400"}`}>Last Update</p>
                      <p className="text-sm font-extrabold">{new Date(asset.updated_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</p>
                    </div>
                    <div className="heritage-badge bg-white text-[#1A1A1A]">
                      <span className="flex items-center gap-2 text-[#1A1A1A]">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDot(asset.status)}`}/>
                        <span className="font-black text-[10px] uppercase tracking-wider">{statusLabel(asset.status)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Health Analysis card */}
            {!isLoading && (
              <div className="heritage-card lg:col-span-2 bg-[#1A1A1A] text-white border-black flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-[#D32F2F] rounded-[12px]"><span className="material-symbols-outlined text-3xl">analytics</span></div>
                    <h3 className="text-3xl font-extrabold uppercase tracking-tighter">Asset Status</h3>
                  </div>
                  <p className="text-lg font-bold opacity-70 max-w-2xl leading-relaxed">
                    {assets.length} assets registered. {assets.filter(a=>a.status==="operational").length} operational, {assets.filter(a=>a.status==="under maintenance").length} under maintenance, {assets.filter(a=>a.status==="decommissioned").length} decommissioned.
                  </p>
                </div>
                <div className="w-full md:w-72 aspect-square bg-white text-[#1A1A1A] rounded-[20px] border-4 border-[#D32F2F] flex flex-col items-center justify-center shrink-0">
                  <div className="text-[80px] font-black leading-none tracking-tighter">
                    {assets.length === 0 ? "0" : Math.round((assets.filter(a=>a.status==="operational").length/assets.length)*100)}<span className="text-3xl">%</span>
                  </div>
                  <div className="text-xs font-black uppercase tracking-widest opacity-40">Operational</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FAB */}
        <button onClick={handleOpenAddDrawer} className="fab-button cursor-pointer hover:brightness-110 active:scale-95 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[36px] font-black">add</span>
        </button>

        {/* Drawer */}
        {isDrawerOpen && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex justify-end">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setIsDrawerOpen(false)}/>
            <div className="relative h-full w-full md:w-[450px] bg-white border-l-4 border-[#1A1A1A] flex flex-col z-10 animate-in slide-in-from-right duration-300">
              <div className="p-8 border-b-2 border-gray-200 flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-extrabold uppercase tracking-tight">{drawerMode==="edit"?"Edit Asset":"Add New Asset"}</h2>
                <button className="p-2 hover:bg-gray-100 rounded-full cursor-pointer" onClick={() => setIsDrawerOpen(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleDrawerSubmit} className="flex-grow overflow-y-auto p-8 space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase opacity-40">Asset Name</label>
                  <input type="text" value={formName} onChange={e=>setFormName(e.target.value)} placeholder="e.g. Industrial HVAC Chiller"
                    className="w-full border-2 border-gray-200 p-3 rounded-[12px] font-bold focus:border-[#D32F2F] bg-white text-[#1A1A1A] outline-none"/>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase opacity-40">Asset Type</label>
                  <input type="text" value={formType} onChange={e=>setFormType(e.target.value)} placeholder="e.g. HVAC Chiller, CNC Milling Machine"
                    className="w-full border-2 border-gray-200 p-3 rounded-[12px] font-bold focus:border-[#D32F2F] bg-white text-[#1A1A1A] outline-none"/>
                </div>
                 <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-black uppercase opacity-40">Asset Code</label>
                    {drawerMode === "add" && (
                      <span className="text-[10px] text-green-600 font-extrabold uppercase bg-green-50 px-2 py-0.5 rounded border border-green-200">AUTO-GENERATED</span>
                    )}
                  </div>
                  <input type="text" value={formCode} readOnly disabled
                    className="w-full border-2 border-gray-200 p-3 rounded-[12px] font-bold bg-gray-50 text-gray-500 cursor-not-allowed outline-none select-all uppercase"/>
                  {drawerMode === "add" && (
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Consistency code: {formCode || "WAITING..."}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase opacity-40">Category</label>
                  <select value={isCustomCategory?"CUSTOM":formCategory} 
                    onChange={e=>{
                      const val = e.target.value;
                      if(val==="CUSTOM"){
                        setIsCustomCategory(true);
                        setCustomCategoryName("");
                        if (drawerMode === "add") {
                          setFormCode(generateNextAssetCode("CUSTOM"));
                        }
                      }else{
                        setIsCustomCategory(false);
                        setFormCategory(val);
                        if (drawerMode === "add") {
                          setFormCode(generateNextAssetCode(val));
                        }
                      }
                    }}
                    className="w-full border-2 border-gray-200 p-3 rounded-[12px] font-bold focus:border-[#D32F2F] bg-white text-[#1A1A1A] outline-none">
                    <option value="MECHANICAL">Mechanical</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="FACILITIES">Facilities</option>
                    <option value="HYDRAULIC">Hydraulic</option>
                    <option value="CUSTOM">Custom Category...</option>
                  </select>
                </div>
                {isCustomCategory && (
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase opacity-40">Custom Category Name</label>
                    <input type="text" value={customCategoryName} 
                      onChange={e=>{
                        const val = e.target.value;
                        setCustomCategoryName(val);
                        if (drawerMode === "add") {
                          setFormCode(generateNextAssetCode(val || "CUSTOM"));
                        }
                      }} 
                      placeholder="e.g. CHEMICAL"
                      className="w-full border-2 border-gray-200 p-3 rounded-[12px] font-bold focus:border-[#D32F2F] bg-white text-[#1A1A1A] outline-none uppercase"/>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase opacity-40">Location</label>
                  <input type="text" value={formLocation} onChange={e=>setFormLocation(e.target.value)} placeholder="e.g. North Wing Plant, Level 2"
                    className="w-full border-2 border-gray-200 p-3 rounded-[12px] font-bold focus:border-[#D32F2F] bg-white text-[#1A1A1A] outline-none"/>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase opacity-40">Status</label>
                  <select value={formStatus} onChange={e=>setFormStatus(e.target.value)}
                    className="w-full border-2 border-gray-200 p-3 rounded-[12px] font-bold focus:border-[#D32F2F] bg-white text-[#1A1A1A] outline-none">
                    <option value="operational">Operational</option>
                    <option value="under maintenance">Under Maintenance</option>
                    <option value="decommissioned">Decommissioned</option>
                  </select>
                </div>

                {/* Asset Image Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase opacity-40">Asset Image</label>
                  {imagePreview ? (
                    <div className="relative">
                      <div className="w-full h-40 rounded-[12px] border-2 border-gray-200 overflow-hidden bg-gray-50">
                        <img src={imagePreview} alt="Asset preview" className="w-full h-full object-cover" />
                      </div>
                      <button
                        type="button"
                        onClick={() => { setImagePreview(null); setFormImageUrl(""); }}
                        className="absolute top-2 right-2 w-8 h-8 bg-[#D32F2F] text-white rounded-full flex items-center justify-center border-2 border-white cursor-pointer hover:bg-black transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-[12px] cursor-pointer hover:border-[#D32F2F] transition-colors bg-gray-50">
                      {isUploadingImage ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-2xl text-gray-400">progress_activity</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase mt-2">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-3xl text-gray-300">add_photo_alternate</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase mt-2">Click to upload image</span>
                          <span className="text-[9px] text-gray-300 mt-0.5">PNG, JPG up to 5MB</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingImage}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Asset Description */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase opacity-40">Description</label>
                  <textarea
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Describe this asset, its purpose, specifications, maintenance notes..."
                    rows={4}
                    className="w-full border-2 border-gray-200 p-3 rounded-[12px] font-bold focus:border-[#D32F2F] bg-white text-[#1A1A1A] outline-none resize-none text-sm"
                  />
                </div>

                <div className="pt-4">
                  <button type="submit" disabled={isSubmitting || isUploadingImage} className="w-full py-4 bg-[#D32F2F] text-white font-black uppercase tracking-widest rounded-[20px] border-2 border-[#1A1A1A] hover:bg-black transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
                    {isSubmitting?<><span className="material-symbols-outlined animate-spin text-base">progress_activity</span>SAVING...</>:(drawerMode==="edit"?"Save Changes":"Create Asset")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {deleteTargetAsset && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setDeleteTargetAsset(null)}/>
            <div className="relative bg-white border-4 border-[#1A1A1A] p-8 rounded-[20px] max-w-md w-full z-10">
              <h3 className="text-xl font-extrabold uppercase mb-4">Confirm Deletion</h3>
              <p className="font-bold opacity-70 mb-8">Permanently delete asset <span className="text-[#D32F2F]">{deleteTargetAsset.name}</span>?</p>
              <div className="flex gap-4">
                <button className="flex-1 py-3 border-2 border-gray-200 font-black uppercase rounded-[12px] hover:bg-gray-50 cursor-pointer" onClick={() => setDeleteTargetAsset(null)}>Cancel</button>
                <button className="flex-1 py-3 bg-[#D32F2F] text-white border-2 border-[#1A1A1A] font-black uppercase rounded-[12px] hover:bg-black cursor-pointer" onClick={handleConfirmDelete}>Delete Asset</button>
              </div>
            </div>
          </div>
        )}

        {/* Toasts */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
          {toasts.map(toast=>(
            <div key={toast.id} className="pointer-events-auto bg-[#1a1c1c] text-white text-center rounded-[20px] px-8 py-4 font-bold uppercase tracking-wider border-2 border-[#D32F2F] shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300 text-xs">
              {toast.message}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
