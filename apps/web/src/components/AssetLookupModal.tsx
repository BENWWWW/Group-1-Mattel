"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Asset {
  id: string;
  asset_code: string;
  name: string;
  category: string;
  location: string;
  status: string;
  description?: string;
  image_url?: string;
}

interface AssetLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AssetLookupModal({ isOpen, onClose }: AssetLookupModalProps) {
  const supabase = createClient();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("name");
      if (error) throw error;
      const activeAssets = (data || []).filter((a: any) => !a.is_deleted);
      setAssets(activeAssets);
    } catch {
      console.error("Failed to load assets for lookup.");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
      setSearchQuery("");
      setCategoryFilter("ALL");
      setSelectedAsset(null);
    }
  }, [isOpen, fetchAssets]);

  if (!isOpen) return null;

  const predefinedOrder = ["MECHANICAL", "ELECTRICAL", "FACILITIES", "HYDRAULIC"];
  const categoriesList = Array.from(new Set(assets.map(a => a.category.toUpperCase()))).sort((a, b) => {
    const ia = predefinedOrder.indexOf(a), ib = predefinedOrder.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1; if (ib !== -1) return 1;
    return a.localeCompare(b);
  });

  const filteredAssets = assets.filter(a => {
    const q = searchQuery.toLowerCase();
    return (a.name.toLowerCase().includes(q) || a.asset_code.toLowerCase().includes(q) || a.location.toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q)) &&
      (categoryFilter === "ALL" || a.category.toUpperCase() === categoryFilter);
  });

  const statusDot = (s: string) =>
    s === "operational" ? "bg-green-500" :
    s === "under maintenance" ? "bg-orange-500" :
    s === "decommissioned" ? "bg-gray-400" : "bg-gray-300";

  const statusLabel = (s: string) => {
    if (s === "operational") return "Operational";
    if (s === "under maintenance") return "Under Maintenance";
    if (s === "decommissioned") return "Decommissioned";
    return s || "Unknown";
  };

  // Detail View
  if (selectedAsset) {
    return (
      <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="relative bg-white border border-gray-200 rounded-[20px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Detail Header */}
          <div className="p-6 border-b border-gray-200 flex justify-between items-center shrink-0 bg-[#1A1A1A] text-white">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedAsset(null)}
                className="w-10 h-10 flex items-center justify-center border border-white/40 rounded-[12px] hover:bg-white/10 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <div>
                <h2 className="text-xl font-semibold uppercase tracking-tight">{selectedAsset.name}</h2>
                <p className="text-xs font-medium text-white/60 uppercase tracking-wider">{selectedAsset.asset_code}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Detail Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Asset Image */}
            {selectedAsset.image_url ? (
              <div className="w-full aspect-video rounded-[16px] overflow-hidden border border-gray-200 bg-gray-100">
                <img
                  src={selectedAsset.image_url}
                  alt={selectedAsset.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full aspect-video rounded-[16px] border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-5xl text-gray-300">image</span>
                <p className="text-xs font-medium text-gray-400 uppercase">No image available</p>
              </div>
            )}

            {/* Description */}
            {selectedAsset.description && (
              <div className="rounded-[16px] p-5">
                <h4 className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Description</h4>
                <p className="text-sm font-medium text-[#1A1A1A] leading-relaxed whitespace-pre-wrap">
                  {selectedAsset.description}
                </p>
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Category", value: selectedAsset.category, icon: "category" },
                { label: "Location", value: selectedAsset.location, icon: "location_on" },
                { label: "Asset Code", value: selectedAsset.asset_code, icon: "qr_code_2" },
                { label: "Status", value: statusLabel(selectedAsset.status), icon: "monitor_heart" },
              ].map(item => (
                <div key={item.label} className="rounded-[16px] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[16px] text-gray-400">{item.icon}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{item.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#1A1A1A] uppercase">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="relative bg-white border border-gray-200 rounded-[20px] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 shrink-0 bg-[#1A1A1A] text-white">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D32F2F] rounded-[12px] flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">precision_manufacturing</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold uppercase tracking-tight">Asset Catalog</h2>
                <p className="text-[10px] font-medium text-white/50 uppercase tracking-wider">{assets.length} assets registered</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="SEARCH BY NAME, CODE, LOCATION..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full p-3 pr-10 bg-white/10 border border-white/20 rounded-[12px] text-white text-xs font-medium focus:outline-none focus:border-[#D32F2F] placeholder:text-white/30 uppercase"
            />
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-[18px]">search</span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-6 py-3 border-b border-gray-200 shrink-0 overflow-x-auto">
          <div className="flex gap-2 flex-nowrap">
            <button
              onClick={() => setCategoryFilter("ALL")}
              className={`shrink-0 px-4 py-2 rounded-[20px] border text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-all ${
                categoryFilter === "ALL"
                  ? "bg-[#1A1A1A] text-white border-gray-200"
                  : "bg-white text-[#1A1A1A] border-gray-200 hover:border-gray-400"
              }`}
            >
              All ({assets.length})
            </button>
            {categoriesList.map(cat => {
              const count = assets.filter(a => a.category.toUpperCase() === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`shrink-0 px-4 py-2 rounded-[20px] border text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-all ${
                    categoryFilter === cat
                      ? "bg-[#D32F2F] text-white border-[#D32F2F]"
                      : "bg-white text-[#1A1A1A] border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Asset List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-[16px] animate-pulse" />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-5xl text-gray-300 block mb-3">search_off</span>
              <p className="font-medium text-gray-400 uppercase text-sm">No assets found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssets.map(asset => (
                <button
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className="w-full text-left flex items-center gap-4 p-4 rounded-[16px] hover:shadow-md transition-all cursor-pointer group bg-white shadow-sm"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-[12px] border border-gray-200 overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center group-hover:border-gray-200 transition-colors">
                    {asset.image_url ? (
                      <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-2xl text-gray-300">precision_manufacturing</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase truncate">{asset.name}</h3>
                      <span className="shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-[8px] bg-gray-100 text-gray-700">{asset.asset_code}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-medium text-gray-500 uppercase">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                        {asset.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">category</span>
                        {asset.category}
                      </span>
                    </div>
                    {asset.description && (
                      <p className="text-[11px] text-gray-400 mt-1 truncate">{asset.description}</p>
                    )}
                  </div>

                  {/* Status + Arrow */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${statusDot(asset.status)}`} />
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 hidden sm:inline">{statusLabel(asset.status)}</span>
                    </span>
                    <span className="material-symbols-outlined text-gray-300 group-hover:text-[#D32F2F] transition-colors text-[18px]">chevron_right</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
