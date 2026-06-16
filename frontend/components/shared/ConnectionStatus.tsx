"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WifiOff, Wifi } from "lucide-react";
import { logger } from "@/lib/logger";

export function ConnectionStatus() {
  const [status, setStatus] = useState<"online" | "offline" | "waking">("online");

  useEffect(() => {
    const handleOffline = () => {
      setStatus("offline");
      logger.warn("ConnectionStatus", "Network offline");
    };
    const handleOnline = () => {
      setStatus("waking");
      logger.info("ConnectionStatus", "Network back online, backend may be waking");
      setTimeout(() => setStatus("online"), 10_000);
    };

    if (!navigator.onLine) setStatus("offline");

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {status !== "online" && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-1.5 text-xs font-medium"
          style={{
            background: status === "offline" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
            color: status === "offline" ? "#ef4444" : "#f59e0b",
            borderBottom: `1px solid ${status === "offline" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
          }}
        >
          {status === "offline" ? <WifiOff size={12} /> : <Wifi size={12} />}
          {status === "offline"
            ? "You're offline — changes will sync when reconnected"
            : "Reconnecting… backend may be waking up"}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
