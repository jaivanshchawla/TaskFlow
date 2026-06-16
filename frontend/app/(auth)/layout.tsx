"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Component as AnimatedAuthShell } from "@/components/ui/animated-characters-login-page";
import { logger } from "@/lib/logger";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mode = pathname.includes("/sign-up") ? "sign-up" : "sign-in";

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/health`, {
      method: "GET",
      cache: "no-store",
    }).catch(() => {});
    logger.info("AuthLayout", "Backend warmup ping sent");
  }, []);

  return (
    <AnimatedAuthShell mode={mode}>
      {children}
    </AnimatedAuthShell>
  );
}
