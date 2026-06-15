"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useWSStore } from "@/store/wsStore";
import { taskKeys, statsKeys } from "./useTasks";
import { logger } from "@/lib/logger";
import { Task, WSEvent } from "@/types";

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace("http", "ws");
const MAX_RECONNECT_DELAY = 30_000;

export function useWebSocket() {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { setConnected, setReconnecting, setLastEvent, incrementAttempts, resetAttempts } = useWSStore();

  const connectRef = useRef<() => Promise<void>>(undefined!);

  const scheduleReconnect = useCallback(() => {
    const delay = Math.min(1000 * 2 ** reconnectAttempts.current, MAX_RECONNECT_DELAY);
    reconnectAttempts.current++;
    setReconnecting(true);
    logger.warn("WebSocket", "Reconnecting", { attempt: reconnectAttempts.current, delay });
    reconnectTimer.current = setTimeout(() => connectRef.current(), delay);
  }, [setReconnecting]);

  const connect = useCallback(async () => {
    if (!isSignedIn || wsRef.current?.readyState === WebSocket.OPEN) return;
    const token = await getToken();
    if (!token) return;

    const attempt = reconnectAttempts.current + 1;
    logger.info("WebSocket", "Connecting", { attempt });
    incrementAttempts();

    const ws = new WebSocket(`${WS_BASE}/api/v1/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0;
      resetAttempts();
      setConnected(true);
      setReconnecting(false);
      logger.info("WebSocket", "Connected");

      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30_000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSEvent;
        logger.info("WebSocket", "Event received", { type: data.type });
        setLastEvent(data);

        switch (data.type) {
          case "task:created":
            queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
            queryClient.invalidateQueries({ queryKey: statsKeys.all });
            break;
          case "task:updated": {
            const task = data.payload as Task;
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(task.id) });
            break;
          }
          case "task:deleted":
            queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
            queryClient.invalidateQueries({ queryKey: statsKeys.all });
            break;
          case "comment:added": {
            const updatedTask = data.payload as Task;
            if (updatedTask?.id) {
              queryClient.invalidateQueries({ queryKey: taskKeys.detail(updatedTask.id) });
            }
            break;
          }
          case "subtask:updated": {
            const subtaskTask = data.payload as Task;
            if (subtaskTask?.id) {
              queryClient.invalidateQueries({ queryKey: taskKeys.detail(subtaskTask.id) });
            }
            break;
          }
        }
      } catch (e) {
        logger.error("WebSocket", "Failed to parse event", { error: String(e) });
      }
    };

    ws.onclose = (event) => {
      setConnected(false);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      logger.warn("WebSocket", "Connection closed", { code: event.code });
      scheduleReconnect();
    };

    ws.onerror = () => {
      logger.error("WebSocket", "Connection error");
    };
  }, [isSignedIn, getToken, queryClient, setConnected, setReconnecting, setLastEvent, incrementAttempts, resetAttempts, scheduleReconnect]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (isSignedIn) connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      wsRef.current?.close();
    };
  }, [isSignedIn, connect]);
}
