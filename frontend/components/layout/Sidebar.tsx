"use client";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { LayoutDashboard, CheckSquare, Kanban, Calendar, Tag, Shield } from "lucide-react";
import { FileTextIcon } from "@/components/ui/file-text";
import { SettingsIcon } from "@/components/ui/settings";
import { ChevronLeftIcon } from "@/components/ui/chevron-left";
import { useUIStore } from "@/store/uiStore";
import { SPRING_SOFT } from "@/lib/animations";
import { UserButton } from "@clerk/nextjs";

const NAV_ITEMS = [
  { href: "/dashboard",        label: "Dashboard",  icon: LayoutDashboard },
  { href: "/tasks",            label: "Tasks",      icon: CheckSquare },
  { href: "/tasks/kanban",     label: "Kanban",     icon: Kanban },
  { href: "/tasks/calendar",   label: "Calendar",   icon: Calendar },
  { href: "/labels",           label: "Labels",     icon: Tag },
  { href: "/templates",        label: "Templates",  icon: FileTextIcon },
  { href: "/settings",         label: "Settings",   icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const isAdmin = (user?.publicMetadata as { role?: string })?.role === "admin";

  const items = isAdmin
    ? [...NAV_ITEMS, { href: "/admin", label: "Admin", icon: Shield }]
    : NAV_ITEMS;

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 240 : 56 }}
      transition={SPRING_SOFT}
      className="relative flex flex-col h-full shrink-0 overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-center h-14 px-3 shrink-0">
        <AnimatePresence mode="wait">
          {sidebarOpen ? (
            <motion.span
              key="full"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="text-lg font-bold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent whitespace-nowrap ml-1"
            >
              TaskFlow
            </motion.span>
          ) : (
            <motion.div
              key="icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center mx-auto"
            >
              <span className="text-white text-xs font-bold">T</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} title={!sidebarOpen ? item.label : undefined}>
              <motion.div
                whileHover={{ x: 1 }}
                whileTap={{ scale: 0.97 }}
                className="relative flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer transition-colors group"
                style={{
                  color: isActive ? "var(--accent-bright)" : "var(--text-secondary)",
                  background: isActive ? "rgba(124,58,237,0.08)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--bg-elevated)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-violet-500"
                    transition={SPRING_SOFT}
                  />
                )}

                <Icon size={16} className="shrink-0" />

                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center gap-2.5 px-2 py-2">
          <UserButton />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="overflow-hidden"
              >
                <p className="text-xs font-medium truncate max-w-[120px]"
                   style={{ color: "var(--text-primary)" }}>
                  {user?.fullName ?? user?.primaryEmailAddress?.emailAddress}
                </p>
                {isAdmin && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-medium">
                    Admin
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.button
        onClick={toggleSidebar}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full border flex items-center justify-center z-10"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border-default)",
          color: "var(--text-muted)",
        }}
      >
        <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }} transition={SPRING_SOFT}>
          <ChevronLeftIcon size={12} />
        </motion.div>
      </motion.button>
    </motion.aside>
  );
}