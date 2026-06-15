"use client";
import { SignIn } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { MODAL_VARIANTS } from "@/lib/animations";

export default function SignInPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden"
         style={{ background: "var(--bg-base)" }}>

      <div className="orb-1" style={{ top: "-100px", left: "-100px" }} />
      <div className="orb-2" style={{ bottom: "-50px", right: "-50px" }} />

      <motion.div
        variants={MODAL_VARIANTS}
        initial="initial"
        animate="animate"
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            TaskFlow
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Sign in to continue to your workspace
          </p>
        </div>

        <div className="rounded-2xl border p-1"
             style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
          <SignIn
            appearance={{
              elements: {
                card: "shadow-none bg-transparent border-none",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: `
                  border border-[var(--border-default)]
                  bg-[var(--bg-elevated)]
                  text-[var(--text-primary)]
                  hover:bg-[var(--bg-overlay)]
                  transition-colors rounded-lg
                `,
                dividerLine: "bg-[var(--border-subtle)]",
                dividerText: "text-[var(--text-muted)] text-xs",
                formFieldInput: `
                  bg-[var(--bg-elevated)]
                  border border-[var(--border-default)]
                  text-[var(--text-primary)]
                  placeholder:text-[var(--text-muted)]
                  rounded-lg px-3 py-2
                  focus:border-[var(--accent)]
                  focus:ring-2 focus:ring-[var(--accent-glow)]
                  transition-all
                `,
                formButtonPrimary: `
                  bg-violet-600 hover:bg-violet-500
                  text-white font-medium rounded-lg
                  transition-all active:scale-[0.97]
                `,
                footerActionLink: "text-violet-400 hover:text-violet-300",
                identityPreviewText: "text-[var(--text-primary)]",
                formFieldLabel: "text-[var(--text-secondary)] text-sm font-medium",
              },
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}