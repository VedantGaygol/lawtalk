import { useEffect, useState } from "react";
import {
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  MapPin, IndianRupee, Clock, User, FileText, MessageSquare
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getRequests, respondToRequest } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { formatTimeAgo, formatCurrency } from "@/lib/utils";
import { useRealtimeEvent } from "@/hooks/use-realtime";

const statusVariant: Record<string, any> = {
  pending: "warning",
  accepted: "success",
  rejected: "destructive",
};

const LawyerRequests = () => {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"pending" | "accepted" | "rejected" | "all">("pending");

  const fetchRequests = () => {
    setIsLoading(true);
    getRequests()
      .then((res) => setData(res))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchRequests(); }, []);
  useRealtimeEvent("new_request", fetchRequests);

  const handleRespond = async (requestId: number, status: "accepted" | "rejected") => {
    setProcessingId(requestId);
    try {
      await respondToRequest(requestId, { status });
      toast({
        title: status === "accepted" ? "Request Accepted!" : "Request Declined",
        description: status === "accepted"
          ? "A room code has been generated. The client has been notified."
          : "The client has been notified.",
      });
      fetchRequests();
      setExpandedId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const requests = (data?.requests || []).filter((r: any) =>
    filter === "all" ? true : r.status === filter
  );

  const counts = (data?.requests || []).reduce((acc: any, r: any) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold">Case Requests</h1>
        <p className="text-muted-foreground mt-1">Review client requests and case details before accepting.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["pending", "accepted", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
              filter === f
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card border border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {f} {f !== "all" && counts[f] ? `(${counts[f]})` : ""}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Card key={i} className="h-28 animate-pulse bg-secondary/30" />)}
        </div>
      ) : requests.length > 0 ? (
        <div className="space-y-4">
          {requests.map((req: any) => {
            const isExpanded = expandedId === req.id;
            return (
              <Card key={req.id} className={`border-border shadow-sm transition-all ${req.status === 'pending' ? 'border-amber-200' : ''}`}>
                <CardContent className="p-0">
                  {/* Header row */}
                  <div
                    className="p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-xl"
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                        {req.case?.category && (
                          <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-md font-medium">
                            {req.case.category}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={12} /> {formatTimeAgo(req.createdAt)}
                        </span>
                      </div>
                      <h4 className="font-bold text-lg leading-tight">{req.case?.title || "Case Inquiry"}</h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <User size={14} />
                        <span>{req.user?.name || "Client"}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-muted-foreground">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {/* Expanded case details */}
                  {isExpanded && (
                    <div className="border-t border-border px-5 pb-5 pt-4 space-y-5">
                      {/* Case meta */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {req.case?.location && (
                          <span className="flex items-center gap-1.5"><MapPin size={15} /> {req.case.location}</span>
                        )}
                        {req.case?.budget && (
                          <span className="flex items-center gap-1.5"><IndianRupee size={15} /> Budget: {formatCurrency(req.case.budget)}</span>
                        )}
                        <span className="flex items-center gap-1.5"><Clock size={15} /> Submitted {formatTimeAgo(req.case?.createdAt)}</span>
                      </div>

                      {/* Case description */}
                      <div className="bg-secondary/40 rounded-2xl p-4">
                        <h5 className="text-sm font-bold mb-2 flex items-center gap-2">
                          <FileText size={15} className="text-primary" /> Case Description
                        </h5>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {req.case?.description}
                        </p>
                      </div>

                      {/* Client message */}
                      {req.message && (
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                          <h5 className="text-sm font-bold mb-2 flex items-center gap-2">
                            <MessageSquare size={15} className="text-primary" /> Message from Client
                          </h5>
                          <p className="text-sm text-muted-foreground leading-relaxed">{req.message}</p>
                        </div>
                      )}

                      {/* Room code if accepted */}
                      {req.status === "accepted" && req.roomCode && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                          <h5 className="text-sm font-bold text-emerald-800 mb-1">Video Room Code</h5>
                          <p className="text-2xl font-display font-bold text-emerald-700 tracking-widest">{req.roomCode}</p>
                          <p className="text-xs text-emerald-600 mt-1">Share this code with the client to start a video conference.</p>
                        </div>
                      )}

                      {/* Actions */}
                      {req.status === "pending" && (
                        <div className="flex gap-3 pt-2">
                          <Button
                            variant="outline"
                            className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-white"
                            onClick={() => handleRespond(req.id, "rejected")}
                            isLoading={processingId === req.id}
                          >
                            <XCircle size={16} className="mr-2" /> Decline Request
                          </Button>
                          <Button
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleRespond(req.id, "accepted")}
                            isLoading={processingId === req.id}
                          >
                            <CheckCircle2 size={16} className="mr-2" /> Accept & Generate Room
                          </Button>
                        </div>
                      )}
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
            <FileText size={32} />
          </div>
          <h3 className="text-xl font-bold font-display">No {filter !== "all" ? filter : ""} requests</h3>
          <p className="text-muted-foreground mt-2 max-w-xs">
            {filter === "pending" ? "New case requests from clients will appear here." : "Nothing to show for this filter."}
          </p>
        </div>
      )}
    </div>
  );
};

export default LawyerRequests;
