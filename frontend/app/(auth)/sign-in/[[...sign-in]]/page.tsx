"use client";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          card: "shadow-none bg-transparent border-none",
        },
      }}
    />
  );
}
