"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface ToastType { id: string; message: string; type: "success" | "error" | "info"; }
interface TaskRow { id: string; task_code: string; status: string; priority: string; due_date: string; asset_name: string; vendor_name: string; supervisor_name: string; }

export default function CreatePMAssignmentPage() {
  const supabase = createClient();
  const [assets, setAssets] = useState<{ id: string; name: string; asset_code: string; status: string; category?: string }[]>([]);
  const [vendors, setVendors] = useState<{ id: string; full_name: string }[]>([]);
  const [supervisors, setSupervisors] = useState<{ id: string; full_name: string }[]>([]);
  const [templates, setTemplates] = useState<{ id: string; title: string; category?: string }[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [priority, setPriority] = useState<"low"|"medium"|"high"|"critical">("medium");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const triggerToast = useCallback((message: string, type: "success"|"error"|"info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [aRes, vRes, sRes, tRes, taskRes] = await Promise.all([
        supabase.from("assets").select("id,name,asset_code,status,is_deleted,category").or("status.eq.under maintenance,status.eq.decommissioned").order("name"),
        supabase.from("profiles").select("id,full_name").eq("role","vendor").eq("is_active",true).order("full_name"),
        supabase.from("profiles").select("id,full_name").eq("role","supervisor").eq("is_active",true).order("full_name"),
        supabase.from("pm_templates").select("id,title,category").eq("is_active",true).order("title"),
        supabase.from("pm_tasks").select(`id,task_code,status,priority,due_date,assets(name),vendor:profiles!pm_tasks_assigned_vendor_id_fkey(full_name),supervisor:profiles!pm_tasks_assigned_supervisor_id_fkey(full_name)`).order("created_at",{ascending:false}).limit(10),
      ]);
      const activeAssets = (aRes.data||[]).filter((a: any) => !a.is_deleted);
      setAssets(activeAssets);
      setVendors(vRes.data||[]);
      setSupervisors(sRes.data||[]);
      setTemplates(tRes.data||[]);
      setTasks((taskRes.data||[]).map((t:any)=>({id:t.id,task_code:t.task_code,status:t.status,priority:t.priority,due_date:t.due_date,asset_name:t.assets?.name??"—",vendor_name:t.vendor?.full_name??"—",supervisor_name:t.supervisor?.full_name??"—"})));
      if(activeAssets.length) {
        setSelectedAsset(activeAssets[0].id);
      } else {
        setSelectedAsset("");
      }
      if(vRes.data?.length) setSelectedVendor(vRes.data[0].id);
      if(sRes.data?.length) setSelectedSupervisor(sRes.data[0].id);
    } catch { triggerToast("Failed to load data.","error"); }
    finally { setIsLoading(false); }
  }, [supabase, triggerToast]);

  useEffect(()=>{fetchData();},[fetchData]);

  // Get active asset and its category
  const activeAsset = assets.find((a) => a.id === selectedAsset);
  const activeAssetCategory = activeAsset?.category;

  // Filter templates based on selected asset's category
  const filteredTemplates = templates.filter((t) => {
    if (!activeAssetCategory) return true;
    if (!t.category) return true; // Show templates without category as fallback
    return t.category.toLowerCase() === activeAssetCategory.toLowerCase();
  });

  // Reset template selection if the selected template's category mismatches with active asset
  useEffect(() => {
    if (selectedTemplate && activeAssetCategory) {
      const currentTemplate = templates.find((t) => t.id === selectedTemplate);
      if (
        currentTemplate &&
        currentTemplate.category &&
        currentTemplate.category.toLowerCase() !== activeAssetCategory.toLowerCase()
      ) {
        setSelectedTemplate("");
      }
    }
  }, [selectedAsset, activeAssetCategory, selectedTemplate, templates]);

  const handleAssignPM = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!selectedAsset||!selectedVendor||!selectedSupervisor||!dueDate){triggerToast("Fill all required fields.","error");return;}
    setIsSubmitting(true);
    try {
      const {data:{user}} = await supabase.auth.getUser();
      if(!user){triggerToast("Not authenticated.","error");return;}
      const code = `TASK-${new Date().getFullYear()}-${Math.floor(1000+Math.random()*9000)}`;
      const {error} = await supabase.from("pm_tasks").insert({task_code:code,asset_id:selectedAsset,assigned_vendor_id:selectedVendor,assigned_supervisor_id:selectedSupervisor,template_id:selectedTemplate||null,created_by:user.id,priority,due_date:dueDate,scheduled_date:scheduleDate||null,notes:notes||null,status:"pending"});
      if(error) throw error;
      triggerToast(`PM TASK ${code} ASSIGNED SUCCESSFULLY.`,"success");
      setNotes("");setDueDate("");setScheduleDate("");
      fetchData();
    } catch(err:any){triggerToast(err.message||"Failed.","error");}
    finally{setIsSubmitting(false);}
  };

  const handleDeleteTask = async (taskId: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("pm_tasks")
        .delete()
        .eq("id", taskId);
      if (error) throw error;
      triggerToast("Task deleted successfully.", "success");
      setSelectedTask(null);
      setShowConfirmDelete(false);
      fetchData();
    } catch (err: any) {
      triggerToast(err.message || "Failed to delete task.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDetails = () => {
    setSelectedTask(null);
    setShowConfirmDelete(false);
  };

  const statusStyle = (s:string) => ({approved:"text-green-700 bg-green-50 border-green-300",submitted:"text-blue-700 bg-blue-50 border-blue-300",in_progress:"text-yellow-700 bg-yellow-50 border-yellow-300",rejected:"text-red-700 bg-red-50 border-red-300"}[s]||"text-gray-600 bg-gray-50 border-gray-300");

  return (
    <div className="flex h-screen w-full bg-page text-[#1A1A1A] font-body-md overflow-hidden relative">
      <header className="fixed top-0 right-0 left-0 lg:left-[220px] border-b border-gray-200 bg-white flex justify-between items-center h-20 px-4 lg:px-10 z-10 gap-4">
        <h2 className="font-headline-md text-sm sm:text-base md:text-xl text-[#1A1A1A] tracking-tight font-semibold uppercase">CREATE PM ASSIGNMENT</h2>      </header>

      <main className="lg:ml-[220px] pt-20 h-screen overflow-y-auto bg-page w-full lg:w-[calc(100%-220px)] pb-24 lg:pb-8">
        <div className="max-w-[1400px] mx-auto p-4 lg:p-10">
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* Form */}
            <div className="col-span-12 lg:col-span-7">
              <div className="bg-white rounded-[20px] p-8 shadow-sm">
                <h3 className="font-headline-md text-2xl font-semibold uppercase mb-8">Assignment Details</h3>
                {isLoading ? (
                  <div className="space-y-4">{[1,2,3,4].map(i=><div key={i} className="h-14 bg-gray-100 rounded-[20px] animate-pulse"/>)}</div>
                ) : (
                  <form onSubmit={handleAssignPM} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase block">Asset *</label>
                        <select value={selectedAsset} onChange={e=>setSelectedAsset(e.target.value)} className="w-full h-14 pl-4 bg-white border border-gray-200 rounded-[20px] focus:outline-none focus:border-[#D32F2F] font-medium text-sm cursor-pointer">
                          {assets.length===0?(
                            <option value="">No eligible assets (under maintenance/decommissioned)</option>
                          ):(
                            assets.map(a=>(
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.asset_code}) — {a.status.toUpperCase()}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase block">Template</label>
                        <select value={selectedTemplate} onChange={e=>setSelectedTemplate(e.target.value)} className="w-full h-14 pl-4 bg-white border border-gray-200 rounded-[20px] focus:outline-none focus:border-[#D32F2F] font-medium text-sm cursor-pointer">
                          <option value="">— None —</option>
                          {filteredTemplates.map(t=><option key={t.id} value={t.id}>{t.title} {t.category ? `(${t.category})` : ""}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase block">Vendor *</label>
                        <select value={selectedVendor} onChange={e=>setSelectedVendor(e.target.value)} className="w-full h-14 pl-4 bg-white border border-gray-200 rounded-[20px] focus:outline-none focus:border-[#D32F2F] font-medium text-sm cursor-pointer">
                          {vendors.length===0?<option value="">No vendors</option>:vendors.map(v=><option key={v.id} value={v.id}>{v.full_name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase block">Supervisor *</label>
                        <select value={selectedSupervisor} onChange={e=>setSelectedSupervisor(e.target.value)} className="w-full h-14 pl-4 bg-white border border-gray-200 rounded-[20px] focus:outline-none focus:border-[#D32F2F] font-medium text-sm cursor-pointer">
                          {supervisors.length===0?<option value="">No supervisors</option>:supervisors.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase block">Scheduled Date</label>
                        <input type="date" value={scheduleDate} onChange={e=>setScheduleDate(e.target.value)} className="w-full h-14 px-4 bg-white border border-gray-200 rounded-[20px] focus:outline-none font-medium text-sm"/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase block">Due Date *</label>
                        <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="w-full h-14 px-4 bg-white border border-gray-200 rounded-[20px] focus:outline-none font-medium text-sm"/>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase block">Priority</label>
                      <div className="flex gap-3">
                        {(["low","medium","high","critical"] as const).map(p=>(
                          <button key={p} type="button" onClick={()=>setPriority(p)} className={`flex-1 py-3 rounded-[20px] border border-gray-200 font-medium text-xs uppercase transition-all cursor-pointer ${priority===p?"bg-[#D32F2F] text-white":"bg-white hover:bg-gray-50"}`}>{p}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase block">Notes</label>
                      <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Additional instructions..." className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[20px] focus:outline-none font-medium text-sm resize-none"/>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-[#D32F2F] text-white rounded-[20px] font-semibold text-lg border border-gray-200 hover:bg-[#1A1A1A] transition-all uppercase cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
                      {isSubmitting?<><span className="material-symbols-outlined animate-spin">progress_activity</span>ASSIGNING...</>:"ASSIGN PM"}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Task List */}
            <div className="col-span-12 lg:col-span-5 space-y-4">
              <h3 className="font-headline-md text-xl font-semibold uppercase px-2">Recent Assignments</h3>
              {isLoading?(
                <div className="space-y-4">{[1,2,3].map(i=><div key={i} className="h-24 bg-gray-100 rounded-[20px] animate-pulse"/>)}</div>
              ):tasks.length===0?(
                <div className="bg-white rounded-[20px] p-10 text-center text-gray-400 font-medium uppercase text-sm shadow-sm">
                  <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">assignment</span>No tasks yet.
                </div>
              ):(
                <div className="space-y-4">
                  {tasks.map(task=>(
                    <div key={task.id} onClick={()=>setSelectedTask(task)} className="bg-white rounded-[20px] p-6 hover:bg-gray-50 transition-all group relative overflow-hidden cursor-pointer shadow-sm">
                      <div className={`absolute right-0 top-0 w-3 h-full ${task.status==="pending"?"bg-gray-300":"bg-[#D32F2F]"}`}/>
                      <div className="flex justify-between items-start mb-3 pr-4">
                        <div>
                          <h4 className="font-medium text-sm uppercase">{task.asset_name}</h4>
                          <p className="text-[10px] text-[#D32F2F] font-medium uppercase mt-0.5">{task.task_code}</p>
                          <p className="text-[10px] text-gray-500 font-medium uppercase mt-0.5">Due: {new Date(task.due_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-semibold border uppercase ${statusStyle(task.status)}`}>{task.status.replace("_"," ")}</span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-xs font-medium flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">person</span>{task.supervisor_name}</span>
                        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform hover:text-[#D32F2F]">chevron_right</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {selectedTask&&(
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 cursor-pointer" onClick={closeDetails}/>
          <div className="relative bg-white p-8 rounded-[20px] max-w-lg w-full z-10 animate-in fade-in zoom-in duration-200 shadow-sm">
            <div className="flex justify-between items-start mb-6 border-b border-gray-200 pb-4">
              <div>
                <span className="text-[10px] bg-[#D32F2F] text-white px-3 py-1 rounded-full font-medium">{selectedTask.task_code}</span>
                <h3 className="text-2xl font-semibold uppercase mt-2">{selectedTask.asset_name}</h3>
              </div>
              <button className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-full hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer" onClick={closeDetails}>
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <div className="space-y-3 text-xs font-medium uppercase">
              {[{l:"Vendor",v:selectedTask.vendor_name},{l:"Supervisor",v:selectedTask.supervisor_name},{l:"Due Date",v:new Date(selectedTask.due_date).toLocaleDateString()},{l:"Priority",v:selectedTask.priority},{l:"Status",v:selectedTask.status.replace("_"," ")}].map(({l,v})=>(
                <div key={l} className="flex justify-between py-2 border-b border-gray-100"><span className="opacity-50">{l}</span><span>{v}</span></div>
              ))}
            </div>

            {showConfirmDelete ? (
              <div className="mt-6 p-4 border-[#D32F2F] rounded-[20px] bg-red-50 text-center animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-xs font-semibold text-[#D32F2F] uppercase mb-3">Are you sure you want to delete this task?</p>
                <div className="flex gap-2">
                  <button 
                    disabled={isDeleting}
                    className="flex-1 py-2 bg-[#D32F2F] text-white font-semibold uppercase rounded-[10px] border border-gray-200 hover:bg-[#1A1A1A] transition-all cursor-pointer text-xs disabled:opacity-60"
                    onClick={() => handleDeleteTask(selectedTask.id)}
                  >
                    {isDeleting ? "Deleting..." : "Yes, Delete"}
                  </button>
                  <button 
                    disabled={isDeleting}
                    className="flex-1 py-2 bg-white text-[#1A1A1A] font-semibold uppercase rounded-[10px] border border-gray-200 hover:bg-gray-100 transition-all cursor-pointer text-xs disabled:opacity-60"
                    onClick={() => setShowConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex gap-2">
                <button 
                  className="flex-1 py-3 bg-white text-[#1A1A1A] font-semibold uppercase border border-gray-200 rounded-[12px] hover:bg-gray-100 cursor-pointer text-xs transition-all text-center"
                  onClick={closeDetails}
                >
                  Close
                </button>
                <button 
                  className="flex-1 py-3 bg-[#D32F2F] text-white font-semibold uppercase border border-gray-200 rounded-[12px] hover:bg-black cursor-pointer text-xs transition-all text-center"
                  onClick={() => setShowConfirmDelete(true)}
                >
                  Delete Task
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t=>(
          <div key={t.id} className="pointer-events-auto bg-[#1a1c1c] text-white text-center rounded-[20px] px-8 py-4 font-medium uppercase tracking-wider border border-[#D32F2F] shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300 text-xs">{t.message}</div>
        ))}
      </div>
    </div>
  );
}
