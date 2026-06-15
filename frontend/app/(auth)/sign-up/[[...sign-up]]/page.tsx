"use client";
import { SignUp } from "@clerk/nextjs";
import { CLERK_DARK_APPEARANCE } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return <SignUp appearance={CLERK_DARK_APPEARANCE} />;
}
