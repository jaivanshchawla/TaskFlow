"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Component as AnimatedAuthShell } from "@/components/ui/animated-characters-login-page";
import { logger } from "@/lib/logger";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mode = pathname.includes("/sign-up") ? "sign-up" : "sign-in";

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35_000);
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(() => logger.info("AuthLayout", "Backend warmup ping succeeded"))
      .catch(() => logger.debug("AuthLayout", "Backend warmup ping failed (expected during cold start)"))
      .finally(() => clearTimeout(timeoutId));
    return () => { controller.abort(); clearTimeout(timeoutId); };
  }, []);

  return (
    <AnimatedAuthShell mode={mode}>
      {children}
    </AnimatedAuthShell>
  );
}
