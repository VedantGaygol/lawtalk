import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import { getMessages, sendMessage as httpSendMessage } from "@/services/api";
import { format } from "date-fns";
import { ArrowLeft, Send, Shield, Check, CheckCheck, Bot } from "lucide-react";

const ChatRoom = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [participant, setParticipant] = useState<any>(null);
  const [isParticipantOnline, setIsParticipantOnline] = useState(false);
  const [isParticipantTyping, setIsParticipantTyping] = useState(false);
  const [allRead, setAllRead] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const participantIdRef = useRef<number | null>(null);

  const {
    sendTyping,
    emitMessagesRead,
    onMessage,
    onTyping,
    onOnlineStatus,
    onMessagesRead,
    isConnected,
  } = useSocket(conversationId);

  // Derive participant ID directly from conversationId — no need to wait for messages
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    const parts = conversationId.split("_");
    const otherId = parts.find((p) => p !== String(user.id));
    if (otherId) participantIdRef.current = Number(otherId);
  }, [conversationId, user?.id]);

  // Load history
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    setIsLoading(true);
    setMessages([]);
    getMessages(conversationId)
      .then((res) => {
        if (res?.messages) {
          setMessages(
            res.messages.map((m: any) => ({
              ...m,
              senderId: Number(m.sender?.id ?? m.senderId),
            }))
          );
          const ourMsgs = res.messages.filter((m: any) => Number(m.sender?.id ?? m.senderId) === user.id);
          if (ourMsgs.length > 0 && ourMsgs.every((m: any) => m.isRead)) setAllRead(true);
        }
        // Set participant info from history if available
        const other = res?.messages?.find(
          (m: any) => Number(m.sender?.id ?? m.senderId) !== user.id
        );
        if (other?.sender) setParticipant(other.sender);
        emitMessagesRead();
      })
      .finally(() => setIsLoading(false));
  }, [conversationId, user?.id]);

  // Incoming messages via socket
  useEffect(() => {
    onMessage((newMsg: any) => {
      const incomingSenderId = Number(newMsg.senderId);

      setMessages((prev) => {
        // For system messages: always append if not already present
        if (newMsg.messageType === "system") {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, { ...newMsg, senderId: incomingSenderId }];
        }

        // For own messages: replace the pending temp message by matching content+time proximity
        // OR skip if already confirmed via HTTP response
        if (incomingSenderId === user?.id) {
          // Replace pending temp msg that matches this content
          const tempIdx = prev.findIndex(
            (m) => m._pending && m.content === newMsg.content && m.senderId === user.id
          );
          if (tempIdx !== -1) {
            const updated = [...prev];
            updated[tempIdx] = { ...newMsg, senderId: incomingSenderId, _pending: false };
            return updated;
          }
          // Already confirmed by HTTP — skip duplicate
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return prev;
        }

        // Other person's message — dedup by id
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, { ...newMsg, senderId: incomingSenderId }];
      });

      if (newMsg.messageType !== "system" && incomingSenderId !== user?.id) {
        emitMessagesRead();
      }
    });
  }, [onMessage, user?.id]);

  useEffect(() => {
    onTyping(({ userId, isTyping }) => {
      if (userId !== user?.id) setIsParticipantTyping(isTyping);
    });
  }, [onTyping, user?.id]);

  useEffect(() => {
    onOnlineStatus(({ userId, isOnline }) => {
      if (userId === participantIdRef.current) setIsParticipantOnline(isOnline);
    });
  }, [onOnlineStatus]);

  useEffect(() => {
    onMessagesRead(({ readerId }) => {
      if (readerId !== user?.id) setAllRead(true);
    });
  }, [onMessagesRead, user?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isParticipantTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 1500);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversationId) return;

    const content = input.trim();
    setInput("");
    sendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setAllRead(false);

    const tempId = `temp_${Date.now()}`;
    const tempMsg = {
      id: tempId,
      senderId: user?.id,
      content,
      createdAt: new Date().toISOString(),
      messageType: "text",
      sender: user,
      isRead: false,
      _pending: true,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const saved = await httpSendMessage(conversationId, { content, messageType: "text" });
      // Replace temp with confirmed message (socket broadcast may also arrive — dedup handles it)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...saved, senderId: Number(saved.sender?.id ?? saved.senderId), sender: user, _pending: false }
            : m
        )
      );
    } catch (err: any) {
      if (err?.response?.status === 451) {
        const warning = err.response.data?.warning;
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== tempId)
            .concat(warning ? [{ ...warning, senderId: user?.id, messageType: "system" }] : [])
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    }
  };

  const participantName = participant?.name || "Conversation";
  const participantInitial = participantName.charAt(0).toUpperCase();
  const lastSentIdx = messages.reduce((acc, m, i) => (Number(m.senderId) === user?.id ? i : acc), -1);

  return (
    <div className="h-full flex flex-col bg-[#F0F2F5] max-w-3xl mx-auto border-x border-border shadow-2xl">
      {/* Header */}
      <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/chat" className="p-2 -ml-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                {participant?.profileImage ? (
                  <img src={participant.profileImage} alt="" className="w-full h-full object-cover" />
                ) : participantInitial}
              </div>
              {isParticipantOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-foreground leading-tight">{participantName}</h3>
              <p className="text-xs font-medium text-emerald-600">
                {isParticipantTyping
                  ? "typing..."
                  : isParticipantOnline
                  ? "Online"
                  : isConnected
                  ? "Connected · Secure"
                  : "Connecting..."}
              </p>
            </div>
          </div>
        </div>
        <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-400"}`} />
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        <div className="flex justify-center mb-4">
          <div className="bg-amber-100 text-amber-800 text-xs py-2 px-4 rounded-xl shadow-sm text-center max-w-sm border border-amber-200">
            <Shield size={13} className="inline mr-1 -mt-0.5" />
            Protected by attorney-client privilege guidelines.
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = Number(msg.senderId) === Number(user!.id);
            const prev = messages[idx - 1];
            const next = messages[idx + 1];
            const showTime =
              idx === 0 ||
              new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 300000;
            const isLastInGroup = !next || Number(next.senderId) !== Number(msg.senderId);
            const isLastSent = isMe && idx === lastSentIdx;

            // System / bot warning
            if (msg.messageType === "system") {
              return (
                <div key={msg.id} className="flex justify-center px-2 my-2">
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs py-2 px-4 rounded-xl shadow-sm max-w-sm">
                    <Bot size={13} className="shrink-0" />
                    <span>{msg.content}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} px-2`}>
                <div className="flex flex-col" style={{ maxWidth: "75%" }}>
                  {showTime && (
                    <span className="text-[10px] text-muted-foreground/60 font-medium my-3 w-full text-center block">
                      {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                    </span>
                  )}
                  <div
                    className={`relative px-3 py-2 text-sm break-words leading-relaxed shadow-sm ${
                      isMe
                        ? `bg-[#DCF8C6] text-gray-900 ${isLastInGroup ? "rounded-2xl rounded-br-sm" : "rounded-2xl"}`
                        : `bg-white text-gray-900 border border-gray-100 ${isLastInGroup ? "rounded-2xl rounded-bl-sm" : "rounded-2xl"}`
                    }`}
                  >
                    {msg.content}
                    <span className="inline-flex items-center gap-0.5 ml-2 float-right mt-1 select-none">
                      <span className="text-[10px] text-gray-400">
                        {format(new Date(msg.createdAt), "h:mm a")}
                      </span>
                      {isMe && (
                        <span className="ml-0.5">
                          {msg._pending ? (
                            <Check size={12} className="text-gray-400" />
                          ) : isLastSent && allRead ? (
                            <CheckCheck size={12} className="text-blue-500" />
                          ) : (
                            <CheckCheck size={12} className="text-gray-400" />
                          )}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isParticipantTyping && (
          <div className="flex justify-start px-2">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-border shrink-0">
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 bg-secondary/50 p-1.5 rounded-full border border-border/50 focus-within:bg-white focus-within:border-primary/50 transition-all"
        >
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm px-3"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatRoom;
