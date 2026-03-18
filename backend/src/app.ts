import "dotenv/config";
import express, { type Express } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import router from "./routes/index";

const app: Express = express();
const httpServer = createServer(app);

// Socket.io for real-time chat
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Track online users: userId -> socketId
const onlineUsers = new Map<number, string>();

// Socket.io chat events
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Register user as online
  socket.on("user_online", (userId: number) => {
    onlineUsers.set(userId, socket.id);
    socket.broadcast.emit("online_status", { userId, isOnline: true });
  });

  // Join a conversation room
  socket.on("join_conversation", (conversationId: string) => {
    socket.join(conversationId);
  });

  // Leave a conversation room
  socket.on("leave_conversation", (conversationId: string) => {
    socket.leave(conversationId);
  });

  // Send a message to a conversation
  socket.on("send_message", (data: {
    conversationId: string;
    senderId: number;
    senderName: string;
    senderRole: string;
    senderImage?: string;
    content: string;
    messageType?: string;
    createdAt: string;
  }) => {
    socket.to(data.conversationId).emit("receive_message", data);
  });

  // Typing indicator
  socket.on("typing", (data: { conversationId: string; userId: number; isTyping: boolean }) => {
    socket.to(data.conversationId).emit("user_typing", data);
  });

  // Read receipt — sender notifies room that messages are read
  socket.on("messages_read", (data: { conversationId: string; readerId: number }) => {
    socket.to(data.conversationId).emit("messages_read", data);
  });

  // Check if a specific user is online
  socket.on("check_online", (userId: number) => {
    socket.emit("online_status", { userId, isOnline: onlineUsers.has(userId) });
  });

  // ── WebRTC Signalling ──
  socket.on("webrtc_join", (roomCode: string) => {
    socket.join(`video_${roomCode}`);
    // Notify others in the room that a new peer joined
    socket.to(`video_${roomCode}`).emit("webrtc_peer_joined", { socketId: socket.id });
  });

  socket.on("webrtc_leave", (roomCode: string) => {
    socket.leave(`video_${roomCode}`);
    socket.to(`video_${roomCode}`).emit("webrtc_peer_left", { socketId: socket.id });
  });

  socket.on("webrtc_offer", (data: { roomCode: string; offer: RTCSessionDescriptionInit }) => {
    socket.to(`video_${data.roomCode}`).emit("webrtc_offer", { offer: data.offer, from: socket.id });
  });

  socket.on("webrtc_answer", (data: { roomCode: string; answer: RTCSessionDescriptionInit }) => {
    socket.to(`video_${data.roomCode}`).emit("webrtc_answer", { answer: data.answer, from: socket.id });
  });

  socket.on("webrtc_ice", (data: { roomCode: string; candidate: RTCIceCandidateInit }) => {
    socket.to(`video_${data.roomCode}`).emit("webrtc_ice", { candidate: data.candidate, from: socket.id });
  });

  socket.on("disconnect", () => {
    // Find and remove the disconnected user
    for (const [userId, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(userId);
        socket.broadcast.emit("online_status", { userId, isOnline: false });
        break;
      }
    }
  });
});

// Export the HTTP server to be used in index.ts
export { httpServer };
export default app;
