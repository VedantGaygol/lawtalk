import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./use-auth";

const SOCKET_URL = "http://localhost:5000";

export function useSocket(conversationId?: string) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messageCallbackRef = useRef<((msg: any) => void) | null>(null);
  const typingCallbackRef = useRef<((data: { userId: number; isTyping: boolean }) => void) | null>(null);
  const onlineCallbackRef = useRef<((data: { userId: number; isOnline: boolean }) => void) | null>(null);
  const readCallbackRef = useRef<((data: { conversationId: string; readerId: number }) => void) | null>(null);

  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, {
      path: "/socket.io",
      auth: { token: localStorage.getItem("lawtalk_token") },
      autoConnect: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      // Register presence
      socket.emit("user_online", user.id);
      if (conversationId) {
        socket.emit("join_conversation", conversationId);
        // Ask if the other participant is online
        const parts = conversationId.split("_");
        const otherId = parts.find((p) => p !== String(user.id));
        if (otherId) socket.emit("check_online", Number(otherId));
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
      if (conversationId && socket.connected) {
        socket.emit("leave_conversation", conversationId);
      }
      socket.disconnect();
    };
  }, [user, conversationId]);

  const sendMessage = useCallback((content: string, type: "text" | "file" = "text") => {
    if (socketRef.current?.connected && conversationId) {
      socketRef.current.emit("send_message", {
        conversationId,
        content,
        messageType: type,
        senderId: user?.id,
        senderName: user?.name,
        createdAt: new Date().toISOString(),
      });
    }
  }, [conversationId, user]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (socketRef.current?.connected && conversationId && user) {
      socketRef.current.emit("typing", { conversationId, userId: user.id, isTyping });
    }
  }, [conversationId, user]);

  const emitMessagesRead = useCallback(() => {
    if (socketRef.current?.connected && conversationId && user) {
      socketRef.current.emit("messages_read", { conversationId, readerId: user.id });
    }
  }, [conversationId, user]);

  const onMessage = useCallback((cb: (msg: any) => void) => { messageCallbackRef.current = cb; }, []);
  const onTyping = useCallback((cb: (data: { userId: number; isTyping: boolean }) => void) => { typingCallbackRef.current = cb; }, []);
  const onOnlineStatus = useCallback((cb: (data: { userId: number; isOnline: boolean }) => void) => { onlineCallbackRef.current = cb; }, []);
  const onMessagesRead = useCallback((cb: (data: { conversationId: string; readerId: number }) => void) => { readCallbackRef.current = cb; }, []);

  return { isConnected, sendMessage, sendTyping, emitMessagesRead, onMessage, onTyping, onOnlineStatus, onMessagesRead, socket: socketRef.current };
}
