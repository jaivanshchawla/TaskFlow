"use client";
import { useState } from "react";
import { Repeat } from "lucide-react";
import type { RecurrenceConfig } from "@/types";

interface RecurringTaskFieldProps {
  value: RecurrenceConfig | null;
  onChange: (config: RecurrenceConfig | null) => void;
}

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function RecurringTaskField({ value, onChange }: RecurringTaskFieldProps) {
  const [recurrenceType, setRecurrenceType] = useState<"never" | "daily" | "weekly" | "monthly" | "custom">(
    value ? value.type : "never"
  );

  const handleTypeChange = (type: string) => {
    setRecurrenceType(type as typeof recurrenceType);
    if (type === "never") {
      onChange(null);
    } else {
      const config: RecurrenceConfig = {
        type: type as RecurrenceConfig["type"],
        interval: 1,
      };
      if (type === "weekly") {
        config.day_of_week = new Date().getDay();
      }
      if (type === "monthly") {
        config.day_month = new Date().getDate();
      }
      onChange(config);
    }
  };

  const updateConfig = (updates: Partial<RecurrenceConfig>) => {
    if (!value) return;
    onChange({ ...value, ...updates });
  };

  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
        <Repeat size={10} />
        Recurrence
      </label>
      <select
        value={recurrenceType}
        onChange={(e) => handleTypeChange(e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none appearance-none cursor-pointer mb-2"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
      >
        <option value="never">Never</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="custom">Custom</option>
      </select>

      {value && recurrenceType !== "never" && (
        <div className="space-y-2">
          {recurrenceType === "weekly" && value && (
            <div className="flex gap-1">
              {DAY_LABELS.map((day, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => updateConfig({ day_of_week: i })}
                  className="w-8 h-8 rounded-lg text-[10px] font-medium transition-all"
                  style={{
                    background: value.day_of_week === i ? "var(--accent)" : "var(--bg-elevated)",
                    color: value.day_of_week === i ? "white" : "var(--text-muted)",
                    border: `1px solid ${value.day_of_week === i ? "var(--accent)" : "var(--border-subtle)"}`,
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          )}

          {recurrenceType === "monthly" && (
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: "var(--text-muted)" }}>Day of month</label>
              <input
                type="number"
                min={1}
                max={31}
                value={value.day_month ?? 1}
                onChange={(e) => updateConfig({ day_month: parseInt(e.target.value) || 1 })}
                className="w-20 px-2.5 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>
          )}

          {recurrenceType === "custom" && (
            <div className="flex items-center gap-2">
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Every</span>
              <input
                type="number"
                min={1}
                value={value.interval}
                onChange={(e) => updateConfig({ interval: parseInt(e.target.value) || 1 })}
                className="w-16 px-2.5 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
              <select
                value={value.type}
                onChange={(e) => updateConfig({ type: e.target.value as RecurrenceConfig["type"] })}
                className="px-2.5 py-1.5 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              >
                <option value="daily">days</option>
                <option value="weekly">weeks</option>
                <option value="monthly">months</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
