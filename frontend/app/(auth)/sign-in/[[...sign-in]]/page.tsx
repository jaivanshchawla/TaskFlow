"use client";
import { SignIn } from "@clerk/nextjs";
import { CLERK_DARK_APPEARANCE } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return <SignIn appearance={CLERK_DARK_APPEARANCE} />;
}
