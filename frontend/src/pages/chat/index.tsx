import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { getConversations, getRequests, getConversationId } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import { formatTimeAgo } from "@/lib/utils";
import { MessageSquare, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

const ChatList = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [data, setData] = useState<any>(null);
  const [acceptedRequests, setAcceptedRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      getConversations().catch(() => ({ conversations: [] })),
      getRequests().catch(() => ({ requests: [] })),
    ]).then(([convData, reqData]) => {
      setData(convData);
      // Accepted requests = potential conversations not yet started
      const accepted = (reqData.requests || []).filter((r: any) => r.status === "accepted");
      setAcceptedRequests(accepted);
    }).finally(() => setIsLoading(false));
  }, []);

  const conversations = (data?.conversations || []).filter((c: any) =>
    search ? c.participantName?.toLowerCase().includes(search.toLowerCase()) : true
  );

  // Build list of accepted contacts not yet in conversations
  const existingConvIds = new Set(conversations.map((c: any) => c.id));
  const pendingContacts = acceptedRequests.filter((r: any) => {
    if (!user) return false;
    // For user: lawyer's userId; for lawyer: client's userId
    const otherId = user.role === "lawyer" ? r.userId : r.lawyer?.userId;
    if (!otherId) return false;
    const convId = getConversationId(user.id, otherId);
    return !existingConvIds.has(convId);
  });

  const startConversation = (otherId: number) => {
    if (!user) return;
    const convId = getConversationId(user.id, otherId);
    setLocation(`/chat/${convId}`);
  };

  return (
    <div className="h-full flex flex-col bg-background max-w-3xl mx-auto w-full border-x border-border shadow-sm">
      <div className="p-4 md:p-6 border-b border-border bg-card sticky top-0 z-10">
        <h1 className="text-2xl font-bold font-display text-foreground mb-4">Messages</h1>
        <Input
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={18} />}
          className="bg-secondary/50 border-transparent h-10"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 items-center animate-pulse">
                <div className="w-12 h-12 bg-secondary rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary w-1/3 rounded" />
                  <div className="h-3 bg-secondary w-2/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Accepted contacts not yet messaged */}
            {pendingContacts.length > 0 && (
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Start a conversation
                </p>
                <div className="space-y-2">
                  {pendingContacts.map((r: any) => {
                    const isLawyer = user?.role === "lawyer";
                    const name = isLawyer ? r.user?.name : r.lawyer?.name;
                    const image = isLawyer ? r.user?.profileImage : r.lawyer?.profileImage;
                    const otherId = isLawyer ? r.userId : r.lawyer?.userId;
                    if (!otherId) return null;
                    return (
                      <button
                        key={r.id}
                        onClick={() => startConversation(otherId)}
                        className="w-full flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-2xl hover:bg-primary/10 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">
                          {image ? <img src={image} alt="" className="w-full h-full object-cover rounded-full" /> : name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{name}</p>
                          <p className="text-xs text-muted-foreground truncate">Re: {r.case?.title}</p>
                        </div>
                        <div className="shrink-0 flex items-center gap-1 text-xs text-primary font-semibold">
                          <Plus size={14} /> Chat
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Existing conversations */}
            {conversations.length > 0 ? (
              <div className="divide-y divide-border">
                {conversations.map((conv: any) => (
                  <Link key={conv.id} href={`/chat/${conv.id}`}>
                    <div className="flex items-center gap-4 p-4 hover:bg-secondary/50 cursor-pointer transition-colors group">
                      <div className="w-14 h-14 rounded-full bg-slate-200 overflow-hidden relative flex-shrink-0">
                        {conv.participantImage ? (
                          <img src={conv.participantImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                            {conv.participantName?.charAt(0)}
                          </div>
                        )}
                        {conv.unreadCount > 0 && (
                          <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {conv.participantName}
                          </h4>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {conv.lastMessageAt ? formatTimeAgo(conv.lastMessageAt) : ""}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${conv.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                          {conv.lastMessage || "Say hello!"}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                          {conv.unreadCount}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : pendingContacts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 py-20">
                <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                  <MessageSquare size={32} />
                </div>
                <h3 className="text-xl font-bold font-display">No messages yet</h3>
                <p className="text-muted-foreground mt-2 max-w-xs text-sm">
                  Once a lawyer accepts your case request, you can start chatting here.
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatList;
