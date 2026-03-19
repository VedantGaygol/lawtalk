import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/use-auth";
import { getLawyerProfile } from "@/services/api";

export interface VideoCallRequest {
  socketId: string;
  userId: number;
  userName: string;
}

interface VideoCallQueueContextType {
  videoRequests: VideoCallRequest[];
  replyMessages: Record<string, string>;
  lawyerCode: string;
  setReplyMessages: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  respond: (clientSocketId: string, accepted: boolean) => void;
}

const VideoCallQueueContext = createContext<VideoCallQueueContextType | null>(null);

export function VideoCallQueueProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [videoRequests, setVideoRequests] = useState<VideoCallRequest[]>([]);
  const [replyMessages, setReplyMessages] = useState<Record<string, string>>({});
  const [lawyerCode, setLawyerCode] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const lawyerCodeRef = useRef("");

  useEffect(() => {
    if (user?.role !== "lawyer") return;

    getLawyerProfile().then((profile) => {
      if (!profile.lawyerCode) return;
      setLawyerCode(profile.lawyerCode);
      lawyerCodeRef.current = profile.lawyerCode;

      // Only create socket once
      if (socketRef.current?.connected) return;

      const socket = io(import.meta.env.VITE_API_URL, {
        auth: { token: localStorage.getItem("lawtalk_token") },
        transports: ["websocket", "polling"],
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("video_lawyer_register", profile.lawyerCode);
      });

      socket.on("video_call_request", (req: VideoCallRequest) => {
        setVideoRequests((prev) => {
          if (prev.some((r) => r.socketId === req.socketId)) return prev;
          return [...prev, req];
        });
      });
    }).catch(() => {});

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [user?.role]);

  const respond = (clientSocketId: string, accepted: boolean) => {
    const message = replyMessages[clientSocketId] || "";
    socketRef.current?.emit("video_call_respond", {
      roomCode: lawyerCodeRef.current,
      clientSocketId,
      accepted,
      message,
    });
    setVideoRequests((prev) => prev.filter((r) => r.socketId !== clientSocketId));
    setReplyMessages((prev) => {
      const next = { ...prev };
      delete next[clientSocketId];
      return next;
    });
  };

  return (
    <VideoCallQueueContext.Provider
      value={{ videoRequests, replyMessages, lawyerCode, setReplyMessages, respond }}
    >
      {children}
    </VideoCallQueueContext.Provider>
  );
}

export function useVideoCallQueue() {
  const ctx = useContext(VideoCallQueueContext);
  if (!ctx) throw new Error("useVideoCallQueue must be used within VideoCallQueueProvider");
  return ctx;
}
