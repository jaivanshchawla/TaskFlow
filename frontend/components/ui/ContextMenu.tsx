"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING_SNAPPY } from "@/lib/animations";
import { ChevronRight } from "lucide-react";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  submenu?: ContextMenuItem[];
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ items, x, y, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredSubmenu, setHoveredSubmenu] = useState<number | null>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x, y });

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    let newX = x;
    let newY = y;

    if (x + rect.width > window.innerWidth) {
      newX = window.innerWidth - rect.width - 8;
    }
    if (y + rect.height > window.innerHeight) {
      newY = window.innerHeight - rect.height - 8;
    }
    if (newX < 0) newX = 8;
    if (newY < 0) newY = 8;

    setAdjustedPos({ x: newX, y: newY });
  }, [x, y]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={menuRef}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={SPRING_SNAPPY}
      className="fixed z-[100] min-w-[180px] py-1.5 rounded-xl shadow-2xl"
      style={{
        left: adjustedPos.x,
        top: adjustedPos.y,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className="relative"
          onMouseEnter={() => item.submenu && setHoveredSubmenu(i)}
          onMouseLeave={() => item.submenu && setHoveredSubmenu(null)}
        >
          <button
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors"
            style={{
              color: item.destructive ? "#ef4444" : "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = item.destructive ? "rgba(239,68,68,0.08)" : "var(--bg-overlay)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span className="flex-1 text-left">{item.label}</span>
            {item.submenu && <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />}
          </button>

          <AnimatePresence>
            {item.submenu && hoveredSubmenu === i && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute left-full top-0 -mt-1.5 min-w-[160px] py-1.5 rounded-xl shadow-2xl"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {item.submenu.map((sub, j) => (
                  <button
                    key={j}
                    onClick={() => {
                      sub.onClick();
                      onClose();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors"
                    style={{ color: sub.destructive ? "#ef4444" : "var(--text-secondary)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = sub.destructive ? "rgba(239,68,68,0.08)" : "var(--bg-overlay)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {sub.icon && <span className="shrink-0">{sub.icon}</span>}
                    <span>{sub.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </motion.div>
  );
}
