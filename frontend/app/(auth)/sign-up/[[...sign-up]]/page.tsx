"use client";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        elements: {
          card: "shadow-none bg-transparent border-none",
        },
      }}
    />
  );
}
