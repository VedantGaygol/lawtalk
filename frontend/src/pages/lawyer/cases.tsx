import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle2, ChevronDown, ChevronUp,
  MapPin, IndianRupee, Clock, User, FileText,
  MessageSquare, Video, Briefcase, Send,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCases, markCaseSolved, getConversationId, getLawyerProfile } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatTimeAgo, formatCurrency } from "@/lib/utils";
import { useRealtimeEvent } from "@/hooks/use-realtime";

const statusVariant: Record<string, any> = {
  open: "success",
  in_progress: "warning",
  resolved: "success",
  closed: "secondary",
};

const statusLabel: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const LawyerCases = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [cases, setCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "in_progress" | "resolved">("in_progress");
  const [lawyerCode, setLawyerCode] = useState<string>("");

  const fetchCases = () => {
    setIsLoading(true);
    getCases()
      .then((res) => setCases(res.cases || []))
      .catch(() => toast({ title: "Failed to load cases", variant: "destructive" }))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchCases();
    getLawyerProfile().then((p) => setLawyerCode(p.lawyerCode || "")).catch(() => {});
  }, []);
  useRealtimeEvent("request_updated", fetchCases);

  const handleMarkSolved = async (caseId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setMarkingId(caseId);
    try {
      await markCaseSolved(caseId);
      toast({
        title: "Confirmation sent!",
        description: "The client has been notified to confirm the case is resolved.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setMarkingId(null);
    }
  };

  const filtered = cases.filter((c) =>
    filter === "all" ? true : c.status === filter
  );

  const counts = cases.reduce((acc: any, c: any) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold">My Cases</h1>
        <p className="text-muted-foreground mt-1">
          Manage your assigned cases and notify clients when resolved.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["in_progress", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
              filter === f
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card border border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {f === "in_progress" ? "In Progress" : f === "all" ? "All" : "Resolved"}
            {f !== "all" && counts[f] ? ` (${counts[f]})` : ""}
            {f === "all" && cases.length ? ` (${cases.length})` : ""}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-24 animate-pulse bg-secondary/30" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((c: any) => {
            const isExpanded = expandedId === c.id;
            const conversationId = user ? getConversationId(user.id, c.userId) : null;

            return (
              <Card
                key={c.id}
                className={`border-border shadow-sm transition-all ${
                  c.status === "in_progress" ? "border-amber-200" : ""
                } ${c.status === "resolved" ? "border-emerald-200" : ""}`}
              >
                <CardContent className="p-0">
                  {/* Header row — click to expand */}
                  <div
                    className="p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-xl"
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <Badge variant={statusVariant[c.status] || "secondary"}>
                          {statusLabel[c.status] || c.status}
                        </Badge>
                        {c.category && (
                          <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-md font-medium">
                            {c.category}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={12} /> {formatTimeAgo(c.createdAt)}
                        </span>
                      </div>
                      <h4 className="font-bold text-lg leading-tight">{c.title}</h4>
                      {c.location && (
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                          <MapPin size={13} /> {c.location}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Mark as Solved — only for in_progress */}
                      {c.status === "in_progress" && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9"
                          isLoading={markingId === c.id}
                          onClick={(e) => handleMarkSolved(c.id, e)}
                        >
                          <Send size={14} /> Mark Solved
                        </Button>
                      )}
                      <div className="text-muted-foreground">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-border px-5 pb-5 pt-4 space-y-5">
                      {/* Meta */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {c.budget && (
                          <span className="flex items-center gap-1.5">
                          <IndianRupee size={15} /> Budget: {formatCurrency(c.budget)}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Clock size={15} /> Submitted {formatTimeAgo(c.createdAt)}
                        </span>
                      </div>

                      {/* Description */}
                      <div className="bg-secondary/40 rounded-2xl p-4">
                        <h5 className="text-sm font-bold mb-2 flex items-center gap-2">
                          <FileText size={15} className="text-primary" /> Case Description
                        </h5>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {c.description}
                        </p>
                      </div>

                      {/* Resolved notice */}
                      {c.status === "resolved" && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-emerald-800">Case Resolved</p>
                            <p className="text-xs text-emerald-700 mt-0.5">
                              The client has confirmed this case is resolved.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-3 pt-1">
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => conversationId && setLocation(`/chat/${conversationId}`)}
                          disabled={!conversationId}
                        >
                          <MessageSquare size={15} /> Chat with Client
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => lawyerCode && setLocation(`/video/${lawyerCode}`)}
                        >
                          <Video size={15} /> Video Call
                        </Button>
                        {c.status === "in_progress" && (
                          <Button
                            size="sm"
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                            isLoading={markingId === c.id}
                            onClick={(e) => handleMarkSolved(c.id, e)}
                          >
                            <Send size={15} /> Send Solve Confirmation to Client
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
            <Briefcase size={32} />
          </div>
          <h3 className="text-xl font-bold font-display">
            No {filter === "in_progress" ? "active" : filter === "resolved" ? "resolved" : ""} cases
          </h3>
          <p className="text-muted-foreground mt-2 max-w-xs">
            {filter === "in_progress"
              ? "Cases you accept from requests will appear here."
              : "Nothing to show for this filter."}
          </p>
        </div>
      )}
    </div>
  );
};

export default LawyerCases;
