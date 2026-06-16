"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, Check, Loader2 } from "lucide-react";
import { useBulkCreateTasks } from "@/hooks/useTasks";
import { MODAL_VARIANTS } from "@/lib/animations";
import type { CreateTaskInput } from "@/lib/schemas";

const AUTO_DETECTED_HEADERS: Record<string, keyof CreateTaskInput> = {
  title: "title",
  name: "title",
  task: "title",
  description: "description",
  desc: "description",
  status: "status",
  priority: "priority",
  due_date: "due_date",
  duedate: "due_date",
  due: "due_date",
};

const CSV_TEMPLATE = `title,description,status,priority,due_date
"Review PR #42","Review and approve the pull request",todo,high,
"Write documentation","Add docs for the new feature",todo,medium,2026-07-01
"Fix login bug","Users can't login with SSO",in_progress,urgent,2026-06-20`;

export function CSVImportModal({ onClose }: { onClose: () => void }) {
  const bulkCreate = useBulkCreateTasks();
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n").filter((l) => l.trim());
    if (lines.length < 2) return;

    const firstLine = lines[0];
    if (!firstLine) return;
    const headers = parseCSVLine(firstLine);
    const detected: Record<string, string> = {};
    headers.forEach((h) => {
      const normalized = h.toLowerCase().replace(/[^a-z0-9]/g, "");
      for (const [pattern, field] of Object.entries(AUTO_DETECTED_HEADERS)) {
        if (normalized.includes(pattern)) {
          detected[h] = field;
          break;
        }
      }
    });
    setColumnMap(detected);

    const rows = lines.slice(1).map((line) => {
      const values = parseCSVLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ?? "";
      });
      return row;
    });
    setParsedRows(rows);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleImport = () => {
    const tasks: CreateTaskInput[] = [];
    for (const row of parsedRows) {
      const titleCol = Object.entries(columnMap).find(([, f]) => f === "title")?.[0];
      const title = titleCol ? row[titleCol] : "";
      if (!title) continue;

      const descCol = Object.entries(columnMap).find(([, f]) => f === "description")?.[0];
      const statusCol = Object.entries(columnMap).find(([, f]) => f === "status")?.[0];
      const priorityCol = Object.entries(columnMap).find(([, f]) => f === "priority")?.[0];
      const dueCol = Object.entries(columnMap).find(([, f]) => f === "due_date")?.[0];

      const statusVal = statusCol ? row[statusCol] : undefined;
      const priorityVal = priorityCol ? row[priorityCol] : undefined;
      const dueVal = dueCol ? row[dueCol] : undefined;

      tasks.push({
        title,
        description: descCol ? row[descCol] || undefined : undefined,
        status: (statusVal && ["todo", "in_progress", "in_review", "done", "cancelled"].includes(statusVal))
          ? (statusVal as CreateTaskInput["status"])
          : "todo",
        priority: (priorityVal && ["low", "medium", "high", "urgent"].includes(priorityVal))
          ? (priorityVal as CreateTaskInput["priority"])
          : "medium",
        due_date: dueVal ? new Date(dueVal).toISOString() : undefined,
        label_ids: [],
      });
    }

    if (tasks.length === 0) return;

    bulkCreate.mutate(tasks, {
      onSuccess: () => {
        setResult({ imported: tasks.length, skipped: parsedRows.length - tasks.length });
        setStep("done");
      },
      onError: () => {
        setResult({ imported: 0, skipped: parsedRows.length });
        setStep("done");
      },
    });
  };

  const handleTextPaste = () => {
    if (csvText.trim()) {
      parseCSV(csvText);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          variants={MODAL_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full max-w-lg rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Import Tasks from CSV</h3>
            <button onClick={onClose} className="p-1 rounded-md" style={{ color: "var(--text-muted)" }}>
              <X size={16} />
            </button>
          </div>

          <div className="p-5">
            <AnimatePresence mode="wait">
              {step === "upload" && (
                <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center py-8 rounded-xl cursor-pointer transition-colors"
                    style={{ border: "2px dashed var(--border-default)", background: "var(--bg-elevated)" }}
                  >
                    <Upload size={24} style={{ color: "var(--text-muted)" }} />
                    <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Click to upload a CSV file</p>
                    <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                  </div>

                  <div className="text-center text-[10px]" style={{ color: "var(--text-muted)" }}>or paste CSV text</div>

                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="title,description,status,priority&#10;My Task,Some description,todo,high"
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none font-mono"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  />

                  <button
                    onClick={handleTextPaste}
                    disabled={!csvText.trim()}
                    className="w-full px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                    style={{ background: "var(--accent)" }}
                  >
                    Parse CSV
                  </button>

                  <a
                    href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`}
                    download="taskflow-import-template.csv"
                    className="flex items-center justify-center gap-1.5 text-[11px] transition-colors"
                    style={{ color: "var(--accent-bright)" }}
                  >
                    <FileText size={10} />
                    Download CSV template
                  </a>
                </motion.div>
              )}

              {step === "preview" && (
                <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Found {parsedRows.length} rows. Map columns to task fields:
                  </p>

                  <div className="max-h-40 overflow-y-auto rounded-lg" style={{ border: "1px solid var(--border-subtle)" }}>
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr style={{ background: "var(--bg-elevated)" }}>
                          {parsedRows[0] && Object.keys(parsedRows[0]).map((header) => (
                            <th key={header} className="px-2 py-1.5 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                              <div className="flex items-center gap-1">
                                {header}
                                <select
                                  value={columnMap[header] ?? ""}
                                  onChange={(e) => setColumnMap((prev) => ({ ...prev, [header]: e.target.value }))}
                                  className="bg-transparent text-[10px] outline-none"
                                  style={{ color: "var(--accent-bright)" }}
                                >
                                  <option value="">Skip</option>
                                  <option value="title">Title</option>
                                  <option value="description">Description</option>
                                  <option value="status">Status</option>
                                  <option value="priority">Priority</option>
                                  <option value="due_date">Due Date</option>
                                </select>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 5).map((row, i) => (
                          <tr key={i} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-2 py-1" style={{ color: "var(--text-secondary)" }}>
                                {val || "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {parsedRows.length > 5 && (
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      ...and {parsedRows.length - 5} more rows
                    </p>
                  )}

                  <button
                    onClick={handleImport}
                    disabled={bulkCreate.isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                    style={{ background: "var(--accent)" }}
                  >
                    {bulkCreate.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                    Import {parsedRows.length} tasks
                  </button>
                </motion.div>
              )}

              {step === "done" && result && (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 space-y-3">
                  <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(16, 185, 129, 0.15)" }}>
                    <Check size={20} style={{ color: "#10b981" }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Imported {result.imported} tasks
                    {result.skipped > 0 && `. ${result.skipped} skipped.`}
                  </p>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-xs font-medium"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                  >
                    Done
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </>
  );
}
