"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Shield, ShieldOff } from "lucide-react";
import { useAdminUsers, useAdminUpdateUser } from "@/hooks/useTasks";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PAGE_VARIANTS, LIST_CONTAINER, LIST_ITEM } from "@/lib/animations";
import { StatCardSkeleton } from "@/components/shared/SkeletonLoader";
import { logger } from "@/lib/logger";

export default function AdminUsersPage() {
  const { data: users, isLoading } = useAdminUsers();
  const updateUser = useAdminUpdateUser();
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ userId: string; userName: string; newRole: string } | null>(null);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  const handleRoleChange = () => {
    if (!confirmAction) return;
    logger.info("Admin", "Changing user role", { userId: confirmAction.userId, role: confirmAction.newRole });
    updateUser.mutate({ id: confirmAction.userId, role: confirmAction.newRole });
    setConfirmAction(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <motion.div variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-4">
      <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Users</h2>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-8 pr-3 py-2 rounded-lg text-xs outline-none"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
        />
      </div>

      {/* Users table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--bg-elevated)" }}>
              {["Name", "Email", "Role", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <motion.tbody variants={LIST_CONTAINER} initial="initial" animate="animate">
            <AnimatePresence>
              {filteredUsers.map(user => (
                <motion.tr
                  key={user.id}
                  variants={LIST_ITEM}
                  layout
                  className="border-t"
                  style={{ borderColor: "var(--border-subtle)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: "var(--accent)" }}>
                        {user.name?.[0]?.toUpperCase() ?? "U"}
                      </div>
                      <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{user.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${user.role === "admin" ? "bg-violet-500/10 text-violet-400" : "bg-slate-500/10 text-slate-400"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setConfirmAction({
                        userId: user.id,
                        userName: user.name,
                        newRole: user.role === "admin" ? "user" : "admin",
                      })}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors"
                      style={{
                        background: user.role === "admin" ? "rgba(239,68,68,0.08)" : "rgba(124,58,237,0.08)",
                        color: user.role === "admin" ? "#ef4444" : "var(--accent-bright)",
                      }}
                    >
                      {user.role === "admin" ? <ShieldOff size={10} /> : <Shield size={10} />}
                      {user.role === "admin" ? "Demote" : "Promote"}
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </motion.tbody>
        </table>

        {filteredUsers.length === 0 && (
          <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>No users found</p>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title={`${confirmAction?.newRole === "admin" ? "Promote" : "Demote"} user`}
        description={`Are you sure you want to ${confirmAction?.newRole === "admin" ? "promote" : "demote"} "${confirmAction?.userName}"?`}
        confirmLabel={confirmAction?.newRole === "admin" ? "Promote" : "Demote"}
        danger={confirmAction?.newRole === "user"}
        onConfirm={handleRoleChange}
        onCancel={() => setConfirmAction(null)}
      />
    </motion.div>
  );
}
