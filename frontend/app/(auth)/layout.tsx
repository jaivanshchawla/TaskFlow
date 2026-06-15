"use client";

import { usePathname } from "next/navigation";
import { Component as AnimatedAuthShell } from "@/components/ui/animated-characters-login-page";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mode = pathname.includes("/sign-up") ? "sign-up" : "sign-in";

  return (
    <AnimatedAuthShell mode={mode}>
      {children}
    </AnimatedAuthShell>
  );
}
