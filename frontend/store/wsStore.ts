import { create } from "zustand";
import { WSEvent } from "@/types";

interface WSStore {
  connected: boolean;
  reconnecting: boolean;
  lastEvent: WSEvent | null;
  connectionAttempts: number;
  setConnected: (connected: boolean) => void;
  setReconnecting: (reconnecting: boolean) => void;
  setLastEvent: (event: WSEvent) => void;
  incrementAttempts: () => void;
  resetAttempts: () => void;
}

export const useWSStore = create<WSStore>((set) => ({
  connected: false,
  reconnecting: false,
  lastEvent: null,
  connectionAttempts: 0,
  setConnected: (connected) => set({ connected }),
  setReconnecting: (reconnecting) => set({ reconnecting }),
  setLastEvent: (event) => set({ lastEvent: event }),
  incrementAttempts: () => set((s) => ({ connectionAttempts: s.connectionAttempts + 1 })),
  resetAttempts: () => set({ connectionAttempts: 0 }),
}));