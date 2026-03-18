import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/use-auth";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Copy, CheckCircle2, Shield, Users, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const VideoConference = () => {
  const { roomCode: paramCode } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Pre-join state
  const [roomCode, setRoomCode] = useState(paramCode || "");
  const [joined, setJoined] = useState(false);

  // Media state
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [peerConnected, setPeerConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isInitiatorRef = useRef(false); // first to join sends offer

  // ── Cleanup ──────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    if (socketRef.current?.connected) {
      socketRef.current.emit("webrtc_leave", roomCode);
      socketRef.current.disconnect();
    }
    localStreamRef.current = null;
    pcRef.current = null;
  }, [roomCode]);

  // ── Build PeerConnection ──────────────────────────────────────────────────
  const createPC = useCallback((socket: Socket) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Add local tracks
    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

    // ICE candidates → signal
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit("webrtc_ice", { roomCode, candidate });
    };

    // Remote stream → remote video
    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current && streams[0]) {
        remoteVideoRef.current.srcObject = streams[0];
        setPeerConnected(true);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setPeerConnected(false);
      }
    };

    return pc;
  }, [roomCode]);

  // ── Join room ─────────────────────────────────────────────────────────────
  const joinRoom = useCallback(async () => {
    if (!roomCode.trim()) return;
    setError("");

    // 1. Get local media
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      setError("Camera/microphone access denied. Please allow permissions and try again.");
      return;
    }
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // 2. Connect socket
    const socket = io("http://localhost:5000", {
      auth: { token: localStorage.getItem("lawtalk_token") },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("webrtc_join", roomCode);
    });

    // Another peer already in room → we are the late joiner, send offer
    socket.on("webrtc_peer_joined", async () => {
      isInitiatorRef.current = true;
      const pc = createPC(socket);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc_offer", { roomCode, offer });
    });

    // We received an offer → send answer
    socket.on("webrtc_offer", async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      const pc = createPC(socket);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc_answer", { roomCode, answer });
    });

    // We received an answer
    socket.on("webrtc_answer", async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // ICE candidate from peer
    socket.on("webrtc_ice", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    });

    // Peer left
    socket.on("webrtc_peer_left", () => {
      setPeerConnected(false);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      pcRef.current?.close();
      pcRef.current = null;
    });

    setJoined(true);
  }, [roomCode, createPC]);

  // ── Auto-join if roomCode in URL ──────────────────────────────────────────
  useEffect(() => {
    if (paramCode) joinRoom();
    return () => cleanup();
  }, []); // eslint-disable-line

  // ── Toggle mic ────────────────────────────────────────────────────────────
  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); }
  };

  // ── Toggle camera ─────────────────────────────────────────────────────────
  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOn(track.enabled); }
  };

  // ── End call ──────────────────────────────────────────────────────────────
  const endCall = () => {
    cleanup();
    setLocation(user?.role === "lawyer" ? "/lawyer/dashboard" : "/dashboard");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Pre-join screen ───────────────────────────────────────────────────────
  if (!joined) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
            <Video size={36} />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold">Join Video Conference</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Enter the lawyer's unique code to start a secure video call.
            </p>
          </div>
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl p-3">
              {error}
            </div>
          )}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Room / Lawyer Code</label>
              <Input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. LT-ABC123"
                className="font-mono text-center text-lg tracking-widest h-12"
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              />
            </div>
            <Button onClick={joinRoom} disabled={!roomCode.trim()} className="w-full h-12 gap-2">
              <Video size={18} /> Join Conference
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

  // ── In-call screen ────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-gray-950 text-white relative overflow-hidden">
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <div className={`w-2 h-2 rounded-full ${peerConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className="text-xs font-medium">
              {peerConnected ? "Connected" : "Waiting for other participant..."}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Users size={13} />
            <span className="text-xs font-mono font-bold tracking-wider">{roomCode}</span>
            <button onClick={copyCode} className="ml-1 text-gray-300 hover:text-white transition-colors">
              {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
        </div>
        <span className="text-xs text-gray-400 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
          {user?.name}
        </span>
      </div>

      {/* Remote video (full screen) */}
      <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        {!peerConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-4xl font-bold text-gray-400">
              ?
            </div>
            <p className="text-gray-400 text-sm animate-pulse">Waiting for participant to join...</p>
          </div>
        )}
      </div>

      {/* Local video (picture-in-picture) */}
      <div className="absolute bottom-24 right-4 z-20 w-32 h-44 sm:w-40 sm:h-56 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-gray-800">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
        {!camOn && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <VideoOff size={24} className="text-gray-500" />
          </div>
        )}
        <div className="absolute bottom-1 left-0 right-0 text-center">
          <span className="text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded-full">You</span>
        </div>
      </div>

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-4 py-6 bg-gradient-to-t from-black/70 to-transparent">
        {/* Mic */}
        <button
          onClick={toggleMic}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
            micOn ? "bg-white/20 hover:bg-white/30 text-white" : "bg-red-500 hover:bg-red-600 text-white"
          }`}
          title={micOn ? "Mute" : "Unmute"}
        >
          {micOn ? <Mic size={22} /> : <MicOff size={22} />}
        </button>

        {/* End call */}
        <button
          onClick={endCall}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-xl transition-all scale-110"
          title="End call"
        >
          <PhoneOff size={26} />
        </button>

        {/* Camera */}
        <button
          onClick={toggleCam}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
            camOn ? "bg-white/20 hover:bg-white/30 text-white" : "bg-red-500 hover:bg-red-600 text-white"
          }`}
          title={camOn ? "Turn off camera" : "Turn on camera"}
        >
          {camOn ? <Video size={22} /> : <VideoOff size={22} />}
        </button>
      </div>
    </div>
  );
};

export default VideoConference;
