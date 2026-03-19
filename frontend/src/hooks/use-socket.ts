import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./use-auth";

const SOCKET_URL = import.meta.env.VITE_API_URL;

export function useSocket(conversationId?: string) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messageCallbackRef = useRef<((msg: any) => void) | null>(null);
  const typingCallbackRef = useRef<((data: { userId: number; isTyping: boolean }) => void) | null>(null);
  const onlineCallbackRef = useRef<((data: { userId: number; isOnline: boolean }) => void) | null>(null);
  const readCallbackRef = useRef<((data: { conversationId: string; readerId: number }) => void) | null>(null);

  // Stable refs so callbacks inside socket handlers never go stale
  const userIdRef = useRef(user?.id);
  const conversationIdRef = useRef(conversationId);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);

  useEffect(() => {
    if (!user?.id) return;

    // Reuse existing connected socket if conversationId is the only thing that changed
    if (socketRef.current?.connected) {
      // Re-join the new conversation room
      if (conversationId) {
        socketRef.current.emit("join_conversation", conversationId);
        const parts = conversationId.split("_");
        const otherId = parts.find((p) => p !== String(user.id));
        if (otherId) socketRef.current.emit("check_online", Number(otherId));
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      path: "/socket.io",
      auth: { token: localStorage.getItem("lawtalk_token") },
      autoConnect: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("user_online", userIdRef.current);
      if (conversationIdRef.current) {
        socket.emit("join_conversation", conversationIdRef.current);
        const parts = conversationIdRef.current.split("_");
        const otherId = parts.find((p) => p !== String(userIdRef.current));
        if (otherId) socket.emit("check_online", Number(otherId));
      }
    });

    socket.on("reconnect", () => {
      socket.emit("user_online", userIdRef.current);
      if (conversationIdRef.current) {
        socket.emit("join_conversation", conversationIdRef.current);
      }
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("receive_message", (msg: any) => {
      messageCallbackRef.current?.(msg);
    });

    socket.on("user_typing", (data: { userId: number; isTyping: boolean }) => {
      typingCallbackRef.current?.(data);
    });

    socket.on("online_status", (data: { userId: number; isOnline: boolean }) => {
      onlineCallbackRef.current?.(data);
    });

    socket.on("messages_read", (data: { conversationId: string; readerId: number }) => {
      readCallbackRef.current?.(data);
    });

    return () => {
      if (conversationIdRef.current && socket.connected) {
        socket.emit("leave_conversation", conversationIdRef.current);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]); // Only reconnect when the logged-in user changes

  // When conversationId changes, join the new room on the existing socket
  useEffect(() => {
    if (!socketRef.current?.connected || !conversationId) return;
    socketRef.current.emit("join_conversation", conversationId);
    const parts = conversationId.split("_");
    const otherId = parts.find((p) => p !== String(user?.id));
    if (otherId) socketRef.current.emit("check_online", Number(otherId));
  }, [conversationId]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (socketRef.current?.connected && conversationIdRef.current && userIdRef.current) {
      socketRef.current.emit("typing", { conversationId: conversationIdRef.current, userId: userIdRef.current, isTyping });
    }
  }, []);

  const emitMessagesRead = useCallback(() => {
    if (socketRef.current?.connected && conversationIdRef.current && userIdRef.current) {
      socketRef.current.emit("messages_read", { conversationId: conversationIdRef.current, readerId: userIdRef.current });
    }
  }, []);

  const onMessage = useCallback((cb: (msg: any) => void) => { messageCallbackRef.current = cb; }, []);
  const onTyping = useCallback((cb: (data: { userId: number; isTyping: boolean }) => void) => { typingCallbackRef.current = cb; }, []);
  const onOnlineStatus = useCallback((cb: (data: { userId: number; isOnline: boolean }) => void) => { onlineCallbackRef.current = cb; }, []);
  const onMessagesRead = useCallback((cb: (data: { conversationId: string; readerId: number }) => void) => { readCallbackRef.current = cb; }, []);

  return { isConnected, sendTyping, emitMessagesRead, onMessage, onTyping, onOnlineStatus, onMessagesRead };
}
