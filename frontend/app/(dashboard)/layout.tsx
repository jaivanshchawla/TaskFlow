"use client";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/store/uiStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useWebSocket } from "@/hooks/useWebSocket";

const CommandPalette = dynamic(() => import("@/components/layout/CommandPalette").then(m => ({ default: m.CommandPalette })), { ssr: false });

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setCommandPaletteOpen, setViewMode, setActiveTaskId } = useUIStore();

  useWebSocket();

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