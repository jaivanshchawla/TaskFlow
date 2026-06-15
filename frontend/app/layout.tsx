import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { QueryClientProviderWrapper } from "@/components/providers/QueryClientProvider";
import { Toaster } from "sonner";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TaskFlow — Modern Task Management",
  description: "A powerful task management application with real-time collaboration",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <html lang="en" suppressHydrationWarning className={cn(inter.variable, jetbrains.variable, "font-sans", geist.variable)}>
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange={false}
          >
            <QueryClientProviderWrapper>
              {children}
              <Toaster
                position="bottom-right"
                expand={false}
                richColors={false}
                toastOptions={{
                  style: {
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                  },
                  classNames: {
                    error: "!border-red-500/20",
                    success: "!border-emerald-500/20",
                  },
                }}
              />
            </QueryClientProviderWrapper>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}