export const CLERK_DARK_APPEARANCE = {
  elements: {
    card: "shadow-none !bg-transparent !border-none !p-0",
    cardBox: "shadow-none !bg-transparent !border-none",

    rootBox: "w-full",

    socialButtonsBlockButton: `
      !bg-white/5 !border !border-white/10
      !text-white !rounded-xl !py-3
      hover:!bg-white/10 transition-all duration-200
      !font-medium !text-sm
    `,
    socialButtonsBlockButtonText: "!text-white !font-medium",

    dividerLine: "!bg-white/10",
    dividerText: "!text-white/40 !text-xs",

    formFieldLabel: "!text-white/60 !text-xs !font-medium !uppercase !tracking-wider",
    formFieldInput: `
      !bg-white/5 !border !border-white/10 !text-white
      !rounded-xl !px-4 !py-3 !text-sm
      placeholder:!text-white/30
      focus:!border-violet-500 focus:!ring-2 focus:!ring-violet-500/20
      focus:!bg-white/8 transition-all duration-200
    `,

    formButtonPrimary: `
      !bg-gradient-to-r !from-violet-600 !to-violet-500
      hover:!from-violet-500 hover:!to-violet-400
      !text-white !font-semibold !rounded-xl !py-3
      !shadow-lg !shadow-violet-500/20
      transition-all duration-200 active:scale-[0.98]
    `,

    footerActionLink: "!text-violet-400 hover:!text-violet-300",
    footerActionText: "!text-white/40",

    headerTitle: "!hidden",
    headerSubtitle: "!hidden",

    identityPreviewText: "!text-white",
    identityPreviewEditButton: "!text-violet-400",

    formFieldErrorText: "!text-red-400 !text-xs",
    alertText: "!text-red-400",

    otpCodeFieldInput: `
      !bg-white/5 !border !border-white/10 !text-white
      !rounded-xl focus:!border-violet-500
    `,
  },
  layout: {
    socialButtonsPlacement: "top",
    showOptionalFields: false,
  },
};
