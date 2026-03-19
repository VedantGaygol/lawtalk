import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./use-auth";

let sharedSocket: Socket | null = null;
const listeners = new Map<string, Set<() => void>>();

function getSharedSocket(token: string): Socket {
  if (sharedSocket?.connected) return sharedSocket;
  sharedSocket = io(import.meta.env.VITE_API_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });
  sharedSocket.on("disconnect", () => { sharedSocket = null; });
  return sharedSocket;
}

function subscribe(event: string, cb: () => void) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(cb);
  return () => listeners.get(event)?.delete(cb);
}

// Called once per app — sets up the socket and fans out events to subscribers
export function useRealtimeSetup() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("lawtalk_token") || "";
    const socket = getSharedSocket(token);

    const events = [
      `user_${user.id}_new_request`,
      `user_${user.id}_request_updated`,
      `user_${user.id}_new_notification`,
      `user_${user.id}_approval_updated`,
    ];

    const handler = (event: string) => () => {
      listeners.get(event)?.forEach(cb => cb());
    };

    const handlers = events.map(e => ({ event: e, fn: handler(e) }));
    handlers.forEach(({ event, fn }) => socket.on(event, fn));

    return () => {
      handlers.forEach(({ event, fn }) => socket.off(event, fn));
    };
  }, [user?.id]);
}

// Used by individual pages to react to specific events
export function useRealtimeEvent(event: string, callback: () => void) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const fullEvent = `user_${user.id}_${event}`;
    return subscribe(fullEvent, callback);
  }, [user?.id, event, callback]);
}
