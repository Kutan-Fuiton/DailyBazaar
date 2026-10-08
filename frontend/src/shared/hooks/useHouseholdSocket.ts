/**
 * useHouseholdSocket.ts — Real-time WebSocket hook for live household collaboration.
 *
 * Automatically connects to backend WebSocket endpoint, handles reconnection,
 * and notifies subscribers of ITEM_ADDED, ITEM_TOGGLED, ITEM_DELETED, etc.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { authToken } from "../api/client";

export interface HouseholdWSEvent {
  type: "ITEM_ADDED" | "ITEM_TOGGLED" | "ITEM_DELETED" | "ALL_BOUGHT" | "COLLABORATOR_ADDED" | "COLLABORATOR_REMOVED" | "USER_CONNECTED" | "USER_DISCONNECTED" | string;
  household_id?: number;
  list_id?: number;
  sender_user_id?: number;
  data: Record<string, any>;
}

interface UseHouseholdSocketOptions {
  householdId?: number | null;
  listId?: number | null;
  onEvent?: (event: HouseholdWSEvent) => void;
  enabled?: boolean;
}

export function useHouseholdSocket({
  householdId,
  listId,
  onEvent,
  enabled = true,
}: UseHouseholdSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<HouseholdWSEvent | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    const token = authToken.get();
    const targetId = listId || householdId;
    if (!enabled || !targetId || !token) return;

    // Build WS URL relative to current host or API host
    const rawApiBase = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").trim().replace(/\/+$/, "");
    const originBase = rawApiBase.replace(/\/api\/v1$/, "");
    const wsBase = originBase.replace(/^http/, "ws");
    const endpoint = listId ? `list/${listId}` : `household/${householdId}`;
    const url = `${wsBase}/api/v1/ws/${endpoint}?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Start keepalive heartbeat ping
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === "pong") return;
          setLastEvent(parsed);
          onEvent?.(parsed);
        } catch {
          // ignore non-json messages
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // Attempt reconnect after 3 seconds if still enabled
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.warn("[WS] Connection attempt failed:", e);
    }
  }, [enabled, householdId, listId, onEvent]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(typeof message === "string" ? message : JSON.stringify(message));
    }
  }, []);

  return { isConnected, lastEvent, send };
}
