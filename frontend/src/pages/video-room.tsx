import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/use-auth";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Copy, CheckCircle2, Shield, Users, Clock, Bell, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// ── States for a client (user) ────────────────────────────────────────────────
type ClientPhase =
  | "idle"          // entering room code
  | "requesting"    // sent request, waiting for lawyer
  | "busy"          // lawyer is in a meeting, auto-declined
  | "declined"      // lawyer manually declined
  | "call_ended"    // lawyer ended the call
  | "joining"       // accepted, now in call

const VideoConference = () => {
  const { roomCode: paramCode } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [roomCode, setRoomCode] = useState(paramCode || "");
  const [joined, setJoined] = useState(false);

  // Media
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [peerConnected, setPeerConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Client request flow
  const [clientPhase, setClientPhase] = useState<ClientPhase>("idle");
  const [declineMessage, setDeclineMessage] = useState("");
  const [queuePosition, setQueuePosition] = useState(0);
  const [lawyerFreeNotif, setLawyerFreeNotif] = useState(false);

  // Lawyer side — incoming requests queue
  const [incomingRequests, setIncomingRequests] = useState<{
    socketId: string; userId: number; userName: string; isBusy: boolean;
  }[]>([]);
  const [replyMessages, setReplyMessages] = useState<Record<string, string>>({});
  const [waitingCount, setWaitingCount] = useState(0);

  // Call timer
  const [callSeconds, setCallSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isWaiterRef = useRef(false); // true if client is only waiting, not in room

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    if (socketRef.current?.connected) {
      if (!isWaiterRef.current) {
        socketRef.current.emit("webrtc_leave", roomCode);
      }
      socketRef.current.disconnect();
    }
    localStreamRef.current = null;
    pcRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
  }, [roomCode]);

  // ── Build PeerConnection ──────────────────────────────────────────────────
  const createPC = useCallback((socket: Socket) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit("webrtc_ice", { roomCode, candidate });
    };

    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current && streams[0]) {
        remoteVideoRef.current.srcObject = streams[0];
        setPeerConnected(true);
        setCallSeconds(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setPeerConnected(false);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      }
    };

    return pc;
  }, [roomCode]);

  // ── Connect socket (shared for both lawyer and client) ────────────────────
  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current;
    const socket = io(import.meta.env.VITE_API_URL, {
      auth: { token: localStorage.getItem("lawtalk_token") },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    return socket;
  }, []);

  // ── LAWYER: enter room and register ──────────────────────────────────────
  const lawyerJoinRoom = useCallback(async () => {
    if (!roomCode.trim()) return;
    setError("");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      setError("Camera/microphone access denied.");
      return;
    }
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const socket = connectSocket();

    socket.on("connect", () => {
      // Register as the owner of this room
      socket.emit("video_lawyer_register", roomCode);
      // Join the WebRTC room directly
      socket.emit("webrtc_join", { roomCode, userId: user?.id ?? 0, userName: user?.name ?? "" });
    });

    // Incoming client request
    socket.on("video_call_request", (req: {
      socketId: string; userId: number; userName: string; isBusy: boolean; queuePosition: number;
    }) => {
      setIncomingRequests(prev => {
        if (prev.some(r => r.socketId === req.socketId)) return prev;
        return [...prev, req];
      });
      setWaitingCount(req.queuePosition);
    });

    socket.on("webrtc_peer_joined", async () => {
      const pc = createPC(socket);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc_offer", { roomCode, offer });
    });

    socket.on("webrtc_offer", async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      const pc = createPC(socket);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc_answer", { roomCode, answer });
    });

    socket.on("webrtc_answer", async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("webrtc_ice", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });

    socket.on("webrtc_peer_left", () => {
      setPeerConnected(false);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      pcRef.current?.close();
      pcRef.current = null;
    });

    setJoined(true);
  }, [roomCode, user, connectSocket, createPC]);

  // ── CLIENT: send join request ─────────────────────────────────────────────
  const clientSendRequest = useCallback(() => {
    if (!roomCode.trim()) return;
    setError("");
    isWaiterRef.current = true;

    const socket = connectSocket();

    socket.on("connect", () => {
      socket.emit("video_call_request", {
        roomCode, userId: user?.id ?? 0, userName: user?.name ?? "Client",
      });
    });

    // Already connected — emit immediately
    if (socket.connected) {
      socket.emit("video_call_request", {
        roomCode, userId: user?.id ?? 0, userName: user?.name ?? "Client",
      });
    }

    socket.on("video_call_queued", ({ position }: { position: number }) => {
      setClientPhase("requesting");
      setQueuePosition(position);
    });

    socket.on("video_call_accepted", async () => {
      isWaiterRef.current = false;
      setClientPhase("joining");

      // Now get media and join
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        setError("Camera/microphone access denied.");
        setClientPhase("idle");
        return;
      }
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      socket.emit("webrtc_join", { roomCode, userId: user?.id ?? 0, userName: user?.name ?? "" });

      socket.on("webrtc_peer_joined", async () => {
        const pc = createPC(socket);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc_offer", { roomCode, offer });
      });

      socket.on("webrtc_offer", async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
        const pc = createPC(socket);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc_answer", { roomCode, answer });
      });

      socket.on("webrtc_answer", async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on("webrtc_ice", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      });

      socket.on("webrtc_peer_left", () => {
        setPeerConnected(false);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        pcRef.current?.close();
        pcRef.current = null;
      });

      // Lawyer ended the session — force client out
      socket.on("video_session_ended", () => {
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        pcRef.current?.close();
        pcRef.current = null;
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        setJoined(false);
        setClientPhase("call_ended");
      });

      setJoined(true);
    });

    socket.on("video_call_declined", ({ message, autoDeclined }: { message: string; autoDeclined?: boolean }) => {
      if (autoDeclined) {
        setClientPhase("busy");
        setDeclineMessage(message);
      } else {
        setClientPhase("declined");
        setDeclineMessage(message);
      }
    });

    socket.on("video_lawyer_free", () => {
      setLawyerFreeNotif(true);
    });
  }, [roomCode, user, connectSocket, createPC]);

  // ── Lawyer: respond to a request ─────────────────────────────────────────
  const lawyerRespond = (clientSocketId: string, accepted: boolean) => {
    const message = replyMessages[clientSocketId] || "";
    socketRef.current?.emit("video_call_respond", {
      roomCode, clientSocketId, accepted, message,
    });
    setIncomingRequests(prev => prev.filter(r => r.socketId !== clientSocketId));
    setReplyMessages(prev => { const n = { ...prev }; delete n[clientSocketId]; return n; });
  };

  // ── Auto-join if roomCode in URL ──────────────────────────────────────────
  useEffect(() => {
    if (paramCode) {
      if (user?.role === "lawyer") lawyerJoinRoom();
      else clientSendRequest();
    }
    return () => cleanup();
  }, []); // eslint-disable-line

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); }
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOn(track.enabled); }
  };

  const endCall = () => {
    cleanup();
    setLocation(user?.role === "lawyer" ? "/lawyer/dashboard" : "/dashboard");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── CLIENT: requesting / declined screens ────────────────────────────────
  if (user?.role !== "lawyer" && !joined) {
    // Busy screen — auto-declined because lawyer is in a meeting
    if (clientPhase === "busy") {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <Clock size={36} />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold">Lawyer is in a Meeting</h2>
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm">
                <p className="text-amber-800">{declineMessage}</p>
              </div>
            </div>
            {lawyerFreeNotif ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-center gap-2 text-emerald-700 font-semibold">
                  <Bell size={18} /> The lawyer is now free!
                </div>
                <p className="text-sm text-emerald-600">You can now send a join request.</p>
                <Button className="w-full gap-2" onClick={() => {
                  setClientPhase("idle");
                  setLawyerFreeNotif(false);
                  setDeclineMessage("");
                }}>
                  <Bell size={16} /> Send Join Request
                </Button>
              </div>
            ) : (
              <div className="bg-secondary rounded-2xl p-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-sm">You'll be notified when the lawyer is free...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Call ended screen — lawyer ended the session
    if (clientPhase === "call_ended") {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="w-20 h-20 bg-secondary text-muted-foreground rounded-full flex items-center justify-center mx-auto">
              <PhoneOff size={36} />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold">Meeting Ended</h2>
              <p className="text-muted-foreground mt-2 text-sm">The lawyer has ended the conference.</p>
            </div>
            <Button className="w-full" onClick={() => setLocation("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      );
    }

    // Declined screen — lawyer manually declined
    if (clientPhase === "declined") {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <XCircle size={36} />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold">Request Declined</h2>
              {declineMessage && (
                <div className="mt-4 bg-secondary rounded-2xl p-4 text-sm text-left">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Message from lawyer:</p>
                  <p className="text-foreground">"{declineMessage}"</p>
                </div>
              )}
            </div>
            <Button variant="outline" className="w-full" onClick={() => setClientPhase("idle")}>
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    // Requesting / waiting screen
    if (clientPhase === "requesting") {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <Clock size={36} />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold">Waiting for Lawyer</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Your request has been sent. You are #{queuePosition} in the queue.
              </p>
            </div>
            {lawyerFreeNotif ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-center gap-2 text-emerald-700 font-semibold">
                  <Bell size={18} /> The lawyer is now available!
                </div>
                <Button className="w-full gap-2" onClick={() => { setClientPhase("idle"); setLawyerFreeNotif(false); }}>
                  <Video size={16} /> Send New Request
                </Button>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-center justify-center gap-2 text-amber-700">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-sm font-medium">Waiting for the lawyer to accept...</span>
                </div>
                <p className="text-xs text-amber-600 mt-2">You'll be connected automatically once accepted.</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Idle — enter room code and send request
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
            <Video size={36} />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold">Request Video Conference</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Enter the lawyer's code to send a join request. The lawyer will accept or respond.
            </p>
          </div>
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl p-3">
              {error}
            </div>
          )}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Lawyer Code</label>
              <Input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. LT-ABC123"
                className="font-mono text-center text-lg tracking-widest h-12"
                onKeyDown={(e) => e.key === "Enter" && clientSendRequest()}
              />
            </div>
            <Button onClick={clientSendRequest} disabled={!roomCode.trim()} className="w-full h-12 gap-2">
              <Bell size={18} /> Send Join Request
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
            <Shield size={14} />
            <span>Peer-to-peer encrypted via WebRTC</span>
          </div>
        </div>
      </div>
    );
  }

  // ── LAWYER: pre-join screen ───────────────────────────────────────────────
  if (user?.role === "lawyer" && !joined) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
            <Video size={36} />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold">Start Video Conference</h2>
            <p className="text-muted-foreground mt-2 text-sm">Enter your lawyer code to open your conference room.</p>
          </div>
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl p-3">
              {error}
            </div>
          )}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Your Lawyer Code</label>
              <Input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. LT-ABC123"
                className="font-mono text-center text-lg tracking-widest h-12"
                onKeyDown={(e) => e.key === "Enter" && lawyerJoinRoom()}
              />
            </div>
            <Button onClick={lawyerJoinRoom} disabled={!roomCode.trim()} className="w-full h-12 gap-2">
              <Video size={18} /> Open Conference Room
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── In-call screen ────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-gray-950 text-white relative overflow-hidden">
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <div className={`w-2 h-2 rounded-full ${peerConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className="text-xs font-medium">
              {peerConnected ? "Connected" : "Waiting for participant..."}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Users size={13} />
            <span className="text-xs font-mono font-bold tracking-wider">{roomCode}</span>
            <button onClick={copyCode} className="ml-1 text-gray-300 hover:text-white transition-colors">
              {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
          {peerConnected && (
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Clock size={13} className="text-emerald-400" />
              <span className="text-xs font-mono tabular-nums">
                {String(Math.floor(callSeconds / 60)).padStart(2, "0")}:{String(callSeconds % 60).padStart(2, "0")}
              </span>
            </div>
          )}
          {waitingCount > 0 && user?.role === "lawyer" && (
            <div className="flex items-center gap-1.5 bg-amber-500/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Clock size={13} />
              <span className="text-xs font-medium">{waitingCount} waiting</span>
            </div>
          )}
        </div>
        <span className="text-xs text-gray-400 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
          {user?.name}
        </span>
      </div>

      {/* Lawyer: incoming request panel */}
      {user?.role === "lawyer" && incomingRequests.length > 0 && (
        <div className="absolute top-14 right-4 z-30 w-80 space-y-2">
          {incomingRequests.map((req) => (
            <div key={req.socketId} className="bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Bell size={14} className="text-amber-400" />
                <span className="text-sm font-semibold">{req.userName} wants to join</span>
                {req.isBusy && <span className="text-xs text-amber-400 ml-auto">You're in a call</span>}
              </div>
              <textarea
                rows={2}
                placeholder='Reply message (e.g. "We will reschedule to 5pm today")'
                value={replyMessages[req.socketId] || ""}
                onChange={e => setReplyMessages(prev => ({ ...prev, [req.socketId]: e.target.value }))}
                className="w-full text-xs bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder:text-gray-500 resize-none focus:outline-none focus:border-white/40 mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => lawyerRespond(req.socketId, false)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs font-semibold transition-colors"
                >
                  <XCircle size={13} /> Decline
                </button>
                <button
                  onClick={() => lawyerRespond(req.socketId, true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 text-xs font-semibold transition-colors"
                >
                  <CheckCircle2 size={13} /> Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Remote video */}
      <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        {!peerConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-4xl font-bold text-gray-400">?</div>
            <p className="text-gray-400 text-sm animate-pulse">Waiting for participant to join...</p>
          </div>
        )}
      </div>

      {/* Local video PiP */}
      <div className="absolute bottom-24 right-4 z-20 w-32 h-44 sm:w-40 sm:h-56 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-gray-800">
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        {!camOn && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <VideoOff size={24} className="text-gray-500" />
          </div>
        )}
        <div className="absolute bottom-1 left-0 right-0 text-center">
          <span className="text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded-full">You</span>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-4 py-6 bg-gradient-to-t from-black/70 to-transparent">
        <button
          onClick={toggleMic}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${micOn ? "bg-white/20 hover:bg-white/30 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
        >
          {micOn ? <Mic size={22} /> : <MicOff size={22} />}
        </button>
        <button
          onClick={endCall}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-xl transition-all scale-110"
        >
          <PhoneOff size={26} />
        </button>
        <button
          onClick={toggleCam}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${camOn ? "bg-white/20 hover:bg-white/30 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
        >
          {camOn ? <Video size={22} /> : <VideoOff size={22} />}
        </button>
      </div>
    </div>
  );
};

export default VideoConference;
