"use client";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useUIStore } from "@/store/uiStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ConnectionStatus } from "@/components/shared/ConnectionStatus";
import { useWebSocket } from "@/hooks/useWebSocket";
import { logger } from "@/lib/logger";
import { apiFetch, buildQueryString } from "@/lib/api";
import { taskKeys, statsKeys, labelKeys } from "@/hooks/useTasks";
import type { PaginatedResponse, StatsResponse, Label, Task } from "@/types";

const CommandPalette = dynamic(() => import("@/components/layout/CommandPalette").then(m => ({ default: m.CommandPalette })), { ssr: false });

const DEFAULT_FILTERS = { status: [], priority: [], label_ids: [], search: "", sort_by: "updated_at", sort_dir: "desc", due_today: false, overdue: false, assigned_to_me: false };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { setCommandPaletteOpen, setViewMode, setActiveTaskId } = useUIStore();

  useWebSocket();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        logger.error("Dashboard", "SW registration failed", { error: String(err) });
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35_000);
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(() => logger.info("Dashboard", "Backend warmup ping succeeded"))
      .catch(() => logger.debug("Dashboard", "Backend warmup ping failed (expected during cold start)"))
      .finally(() => clearTimeout(timeoutId));
    return () => { controller.abort(); clearTimeout(timeoutId); };
  }, []);

  useEffect(() => {
    const prefetchData = async () => {
      const token = await getToken();
      if (!token) return;

      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: statsKeys.all,
          queryFn: async () => {
            const res = await apiFetch<{ success: boolean; data: StatsResponse }>("/api/v1/stats", { token, timeoutMs: 30_000 });
            return res.data;
          },
          staleTime: 60_000,
        }),
        queryClient.prefetchQuery({
          queryKey: taskKeys.list({ ...DEFAULT_FILTERS, page: 1, perPage: 10 }),
          queryFn: async () => {
            return apiFetch<PaginatedResponse<Task>>(
              `/api/v1/tasks?${buildQueryString(DEFAULT_FILTERS as unknown as Record<string, unknown>, 1, 10)}`,
              { token, timeoutMs: 30_000 }
            );
          },
          staleTime: 30_000,
        }),
        queryClient.prefetchQuery({
          queryKey: labelKeys.all,
          queryFn: async () => {
            const res = await apiFetch<{ success: boolean; data: Label[] }>("/api/v1/labels", { token, timeoutMs: 30_000 });
            return res.data;
          },
          staleTime: 300_000,
        }),
      ]);

      logger.info("Dashboard", "Prefetched stats, tasks, labels");
    };

    prefetchData();
  }, [getToken, queryClient]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      const inInput = ["INPUT", "TEXTAREA", "SELECT"].includes(tag ?? "");
      if (inInput && e.key !== "Escape") return;

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setActiveTaskId(null);
      }
      if (!inInput) {
        if (e.key === "n") router.push("/tasks/new");
        if (e.key === "1") { setViewMode("list"); router.push("/tasks"); }
        if (e.key === "2") { setViewMode("kanban"); router.push("/tasks/kanban"); }
        if (e.key === "3") { setViewMode("calendar"); router.push("/tasks/calendar"); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router, setCommandPaletteOpen, setViewMode, setActiveTaskId]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <ConnectionStatus />
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
