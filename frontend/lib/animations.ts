import type { Transition } from "framer-motion";

export const EASE_OUT_EXPO = [0.23, 1, 0.32, 1] as const;
export const SPRING_SOFT: Transition = { type: "spring", stiffness: 300, damping: 30 };
export const SPRING_SNAPPY: Transition = { type: "spring", stiffness: 500, damping: 40 };

export const PAGE_VARIANTS = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT_EXPO } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } }
};

export const LIST_CONTAINER = {
  animate: { transition: { staggerChildren: 0.04 } }
};

export const LIST_ITEM = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.25, ease: EASE_OUT_EXPO } }
};

export const DRAWER_VARIANTS = {
  initial: { x: 40, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.25, ease: EASE_OUT_EXPO } },
  exit: { x: 60, opacity: 0, transition: { duration: 0.18 } }
};

export const MODAL_VARIANTS = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { duration: 0.2, ease: EASE_OUT_EXPO } },
  exit: { scale: 0.97, opacity: 0, transition: { duration: 0.15 } }
};

export const SCALE_TAP = { whileTap: { scale: 0.97 } };
export const LIFT_HOVER = { whileHover: { y: -1 } };
