"use client";

import React from "react";

// Shared chart colors. Status colors only where the color means good / warning / bad.
export const COLORS = {
  ink: "#1A1A1A",
  muted: "#c9c8c2",
  neutral: "#a3a29d",
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
};

export function ChartCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold uppercase tracking-tight text-[#1A1A1A]">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Stats({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      {items.map((s) => (
        <div key={s.label}>
          <div className="text-2xl font-extrabold text-[#1A1A1A] leading-none">{s.value}</div>
          <div className="text-xs text-gray-500 mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-gray-600">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-40 flex items-center justify-center rounded-xl bg-gray-50 text-xs text-gray-500">
      {text}
    </div>
  );
}

const inputClass =
  "border border-gray-300 rounded-lg px-2 py-1 text-xs font-semibold text-[#1A1A1A] bg-white cursor-pointer focus:outline-none focus:border-[#1A1A1A]";

export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string | number;
  onChange: (value: string) => void;
  options: { value: string | number; label: string }[];
  label: string;
}) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// Native month picker; month is 0-11 like Date.getMonth().
export function MonthInput({
  month,
  year,
  onChange,
}: {
  month: number;
  year: number;
  onChange?: (month: number, year: number) => void;
}) {
  return (
    <input
      type="month"
      aria-label="Select month"
      value={`${year}-${String(month + 1).padStart(2, "0")}`}
      onChange={(e) => {
        const [y, m] = e.target.value.split("-").map(Number);
        if (y && m) onChange?.(m - 1, y);
      }}
      className={inputClass}
    />
  );
}

export interface ColumnGroup {
  label: string;
  sublabel?: string;
  values: number[]; // one value per series, same order as `series`
  muted?: boolean;
}

// Vertical columns, grouped side by side or stacked. Hover a column for its numbers.
export function ColumnChart({
  groups,
  series,
  stacked = false,
  height = 160,
}: {
  groups: ColumnGroup[];
  series: { label: string; color: string }[];
  stacked?: boolean;
  height?: number;
}) {
  const max = Math.max(
    1,
    ...groups.map((g) => (stacked ? g.values.reduce((a, b) => a + b, 0) : Math.max(...g.values)))
  );
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const ticks = [top, step * 2, 0];
  const px = (v: number) => (v / top) * height;

  return (
    <div className="flex gap-2">
      {/* Y axis */}
      <div className="relative w-6 shrink-0 text-[10px] text-gray-400 tabular-nums" style={{ height }}>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: height - px(t) }}>
            {t}
          </span>
        ))}
      </div>

      <div className="flex-1 min-w-0">
        <div className="relative border-b border-gray-300" style={{ height }}>
          {ticks.slice(0, -1).map((t) => (
            <div key={t} className="absolute inset-x-0 h-px bg-gray-100" style={{ top: height - px(t) }} />
          ))}
          <div className="absolute inset-0 flex">
            {groups.map((g) => {
              const topIndex = g.values.findLastIndex((v) => v > 0);
              return (
                <div
                  key={g.label}
                  title={`${g.label}${g.sublabel ? ` (${g.sublabel})` : ""}\n${series.map((s, i) => `${s.label}: ${g.values[i]}`).join("\n")}`}
                  className={`flex-1 flex gap-[2px] hover:bg-gray-50 ${stacked ? "flex-col-reverse items-center" : "items-end justify-center"} ${g.muted ? "opacity-40" : ""}`}
                >
                  {g.values.map((v, i) =>
                    v > 0 ? (
                      <div
                        key={series[i].label}
                        className={`${stacked ? "w-full max-w-[24px]" : "w-3 sm:w-4"} ${!stacked || i === topIndex ? "rounded-t" : ""}`}
                        style={{ height: px(v), background: series[i].color }}
                      />
                    ) : null
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex pt-1.5">
          {groups.map((g) => (
            <div key={g.label} className="flex-1 text-center leading-tight">
              <div className="text-[10px] font-semibold text-gray-600">{g.label}</div>
              {g.sublabel && <div className="text-[9px] text-gray-400 whitespace-nowrap">{g.sublabel}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
