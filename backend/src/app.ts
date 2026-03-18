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
// Track waiting queues per video room: roomCode -> waiters
const waitingQueues = new Map<string, { socketId: string; userId: number; userName: string }[]>();
// Track lawyer socket per roomCode
const lawyerSockets = new Map<string, string>();
// One-time tokens: socketIds allowed to do webrtc_join after lawyer accepted
const allowedClients = new Set<string>();

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

  // ── Video Call Request Queue (FIFO, lawyer-controlled) ──

  // Client requests to join a video call with a lawyer
  socket.on("video_call_request", (data: { roomCode: string; userId: number; userName: string }) => {
    const { roomCode, userId, userName } = data;

    // Check if lawyer is currently in a call
    const room = `video_${roomCode}`;
    const roomSockets = io.sockets.adapter.rooms.get(room);
    const occupants = roomSockets ? roomSockets.size : 0;
    const isBusy = occupants >= 2;

    if (isBusy) {
      // Auto-decline immediately — lawyer is in a meeting
      socket.emit("video_call_declined", {
        roomCode,
        message: "The lawyer is already in a meeting. Please try again later.",
        autoDeclined: true,
      });
      return;
    }

    // Add to FIFO queue
    if (!waitingQueues.has(roomCode)) waitingQueues.set(roomCode, []);
    const queue = waitingQueues.get(roomCode)!;
    const alreadyQueued = queue.some(w => w.socketId === socket.id);
    if (!alreadyQueued) queue.push({ socketId: socket.id, userId, userName });

    // Forward to lawyer
    const lawyerSocketId = lawyerSockets.get(roomCode);
    if (lawyerSocketId) {
      io.to(lawyerSocketId).emit("video_call_request", {
        socketId: socket.id, userId, userName, roomCode, isBusy: false,
        queuePosition: queue.length,
      });
    }

    // Tell client they are queued
    socket.emit("video_call_queued", { roomCode, isBusy: false, position: queue.length });
  });

  // Lawyer registers their socket as owner of a roomCode
  socket.on("video_lawyer_register", (roomCode: string) => {
    lawyerSockets.set(roomCode, socket.id);
  });

  // Lawyer responds to a queued request
  socket.on("video_call_respond", (data: {
    roomCode: string;
    clientSocketId: string;
    accepted: boolean;
    message?: string;
  }) => {
    const { roomCode, clientSocketId, accepted, message } = data;

    // Remove from queue
    const queue = waitingQueues.get(roomCode) ?? [];
    waitingQueues.set(roomCode, queue.filter(w => w.socketId !== clientSocketId));

    if (accepted) {
      // Mark this client as allowed to join
      allowedClients.add(clientSocketId);
      io.to(clientSocketId).emit("video_call_accepted", { roomCode });
    } else {
      io.to(clientSocketId).emit("video_call_declined", { roomCode, message: message || "" });
    }
  });

  // ── WebRTC Signalling ──

  socket.on("webrtc_join", (data: { roomCode: string; userId: number; userName: string } | string) => {
    const roomCode = typeof data === "string" ? data : data.roomCode;
    const room = `video_${roomCode}`;

    // Only allow if this socket was explicitly accepted by the lawyer
    // (lawyer's own socket is always allowed — they own the room)
    const isLawyer = lawyerSockets.get(roomCode) === socket.id;
    const isAllowed = isLawyer || allowedClients.has(socket.id);

    if (!isAllowed) {
      socket.emit("video_busy", { roomCode });
      return;
    }

    allowedClients.delete(socket.id); // consume the token
    socket.join(room);
    socket.to(room).emit("webrtc_peer_joined", { socketId: socket.id });
  });

  socket.on("webrtc_leave", (roomCode: string) => {
    const room = `video_${roomCode}`;
    socket.leave(room);
    socket.to(room).emit("webrtc_peer_left", { socketId: socket.id });

    // If lawyer left — force-end the call for the client still in room,
    // then notify all queued waiters that the lawyer is free
    if (lawyerSockets.get(roomCode) === socket.id) {
      lawyerSockets.delete(roomCode);
      // Tell the remaining client in the room the session ended
      io.to(room).emit("video_session_ended", { roomCode });
      // Tell all queued waiters the lawyer is now free
      const queue = waitingQueues.get(roomCode) ?? [];
      for (const waiter of queue) {
        io.to(waiter.socketId).emit("video_lawyer_free", { roomCode });
      }
      waitingQueues.delete(roomCode);
    }
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
    // Remove from any waiting queues
    for (const [roomCode, queue] of waitingQueues.entries()) {
      const filtered = queue.filter(w => w.socketId !== socket.id);
      if (filtered.length !== queue.length) {
        if (filtered.length === 0) waitingQueues.delete(roomCode);
        else waitingQueues.set(roomCode, filtered);
      }
    }
    // Clean up lawyer socket registration
    for (const [roomCode, sid] of lawyerSockets.entries()) {
      if (sid === socket.id) lawyerSockets.delete(roomCode);
    }
    // Clean up allowed token
    allowedClients.delete(socket.id);
  });
});

// Export the HTTP server to be used in index.ts
export { httpServer };
export default app;
