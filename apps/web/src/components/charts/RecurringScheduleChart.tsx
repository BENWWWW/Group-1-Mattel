"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChartCard, COLORS, EmptyChart, Legend } from "./ChartCard";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WINDOW = 12;

interface Row {
  id: string;
  code: string;
  asset: string;
  vendor: string;
  label: string;
  // month offset from this month -> kind of mark in that month
  marks: Map<number, "overdue" | "current" | "projected">;
}

// Upcoming recurring PM tasks over the next 12 months. The open task of each chain is shown
// solid; later occurrences are projected from its due date + interval.
// RLS scopes the rows: admin sees every task, a vendor only their own.
export default function RecurringScheduleChart({ showVendor = false }: { showVendor?: boolean }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const now = new Date();
  const start = now.getFullYear() * 12 + now.getMonth();
  const today = now.toLocaleDateString("en-CA"); // local YYYY-MM-DD

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("pm_tasks")
      .select("id,task_code,due_date,recurrence,recurrence_interval,assets(name),vendor:profiles!pm_tasks_assigned_vendor_id_fkey(full_name)")
      .neq("recurrence", "none")
      .neq("status", "approved")
      .order("due_date")
      .then(({ data }) => {
        setRows(
          (data || []).map((t: any) => {
            const [y, m] = t.due_date.split("-").map(Number);
            const step = t.recurrence === "monthly" ? t.recurrence_interval : t.recurrence_interval * 12;
            const marks: Row["marks"] = new Map();
            const first = y * 12 + (m - 1) - start;
            if (t.due_date < today) marks.set(Math.max(first, 0), "overdue");
            else if (first < WINDOW) marks.set(first, "current");
            for (let i = first + step; i < WINDOW; i += step) if (i >= 0 && !marks.has(i)) marks.set(i, "projected");
            const n = t.recurrence_interval;
            return {
              id: t.id,
              code: t.task_code,
              asset: t.assets?.name ?? "—",
              vendor: t.vendor?.full_name ?? "—",
              label: `Every ${n > 1 ? `${n} ` : ""}${t.recurrence === "monthly" ? "month" : "year"}${n > 1 ? "s" : ""}`,
              marks,
            };
          })
        );
      });
  }, [start, today]);

  const months = Array.from({ length: WINDOW }, (_, i) => {
    const abs = start + i;
    return { name: MONTHS[abs % 12], year: Math.floor(abs / 12) };
  });
  const totals = months.map((_, i) => rows?.filter((r) => r.marks.has(i)).length ?? 0);
  const color = { overdue: COLORS.critical, current: COLORS.ink, projected: COLORS.neutral };
  const kindLabel = { overdue: "Overdue", current: "Due", projected: "Projected" };

  return (
    <ChartCard
      title="Recurring PM Schedule"
      subtitle={`Next 12 months · ${rows?.length ?? 0} recurring tasks`}
      action={<Legend items={[{ label: "Due", color: COLORS.ink }, { label: "Projected", color: COLORS.neutral }, { label: "Overdue", color: COLORS.critical }]} />}
    >
      {rows === null ? (
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      ) : rows.length === 0 ? (
        <EmptyChart text="No recurring tasks scheduled." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs border-collapse">
            <thead>
              <tr className="text-[10px] text-gray-500">
                <th className="text-left font-semibold pb-2 pr-3">Task</th>
                {months.map((mo, i) => (
                  <th key={i} className="font-semibold pb-2 w-10 text-center leading-tight">
                    {mo.name}
                    {(i === 0 || mo.name === "Jan") && <div className="text-[9px] text-gray-400 font-normal">{mo.year}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-3 max-w-[200px]">
                    <div className="font-semibold text-[#1A1A1A] truncate">{r.asset}</div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {r.code} · {r.label}{showVendor && ` · ${r.vendor}`}
                    </div>
                  </td>
                  {months.map((mo, i) => {
                    const kind = r.marks.get(i);
                    return (
                      <td key={i} className="text-center" title={kind ? `${r.asset} (${r.code})\n${mo.name} ${mo.year}: ${kindLabel[kind]}` : undefined}>
                        {kind && (
                          <span
                            className="inline-flex w-4 h-4 rounded items-center justify-center text-white text-[10px] font-bold"
                            style={{ background: color[kind] }}
                            aria-label={kindLabel[kind]}
                          >
                            {kind === "overdue" ? "!" : ""}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-gray-300 text-[10px] text-gray-600 font-semibold">
                <td className="py-2 pr-3 uppercase">Tasks per month</td>
                {totals.map((n, i) => (
                  <td key={i} className="text-center tabular-nums">{n || ""}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}
