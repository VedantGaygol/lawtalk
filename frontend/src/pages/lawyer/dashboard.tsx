import { Link, useLocation } from "wouter";
import { Users, Briefcase, FileText, CheckCircle2, XCircle, Star, Video, Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { getRequests, respondToRequest } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { formatTimeAgo } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useVideoCallQueue } from "@/hooks/use-video-call-queue";
import { useRealtimeEvent } from "@/hooks/use-realtime";

const LawyerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [requestsData, setRequestsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { videoRequests, replyMessages, lawyerCode, setReplyMessages, respond } = useVideoCallQueue();

  const fetchRequests = () => {
    setIsLoading(true);
    getRequests()
      .then((res) => setRequestsData(res))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchRequests(); }, []);
  useRealtimeEvent("new_request", fetchRequests);
  useRealtimeEvent("approval_updated", () => window.location.reload());

  const handleResponse = async (requestId: number, status: 'accepted' | 'rejected') => {
    try {
      await respondToRequest(requestId, { status });
      toast({ title: `Request ${status}` });
      fetchRequests();
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || error.message, variant: "destructive" });
    }
  };

  const handleVideoRespond = (clientSocketId: string, accepted: boolean) => {
    respond(clientSocketId, accepted);
    if (accepted) setLocation(`/video/${lawyerCode}`);
  };

  const pendingRequests = requestsData?.requests.filter(r => r.status === 'pending') || [];

  if (user?.approvalStatus === 'pending') {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-10 text-center animate-in fade-in">
        <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Briefcase size={40} />
        </div>
        <h2 className="text-3xl font-display font-bold">Profile Under Review</h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Your application is currently being reviewed by our team. Please ensure you have uploaded your license document. You'll be notified once approved.
        </p>
        <Link href="/lawyer/profile">
          <Button className="mt-8 rounded-xl px-8 h-12">Complete Profile</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-3xl font-display font-bold">Lawyer Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage your practice and client requests.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-4">
              <FileText size={20} />
            </div>
            <h4 className="text-3xl font-bold font-display">12</h4>
            <p className="text-sm text-muted-foreground font-medium mt-1">Active Cases</p>
          </CardContent>
        </Card>
        <Card className="bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
              <Users size={20} />
            </div>
            <h4 className="text-3xl font-bold font-display">{pendingRequests.length}</h4>
            <p className="text-sm text-muted-foreground font-medium mt-1">Pending Requests</p>
          </CardContent>
        </Card>
        {/* Placeholder stats */}
        <Card className="hidden md:block bg-card">
          <CardContent className="p-6">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4"><CheckCircle2 size={20} /></div>
            <h4 className="text-3xl font-bold font-display">48</h4><p className="text-sm text-muted-foreground">Cases Won</p>
          </CardContent>
        </Card>
        <Card className="hidden md:block bg-card">
          <CardContent className="p-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4"><Star size={20} /></div>
            <h4 className="text-3xl font-bold font-display">4.9</h4><p className="text-sm text-muted-foreground">Average Rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Video Call Requests */}
      {videoRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold font-display flex items-center gap-2">
            <Video size={20} className="text-primary" /> Incoming Video Call Requests
            <Badge variant="warning" className="ml-1">{videoRequests.length}</Badge>
          </h3>
          <div className="space-y-3">
            {videoRequests.map((req) => (
              <Card key={req.socketId} className="border-amber-200 bg-amber-50/30">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {req.userName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{req.userName} wants to join a video call</p>
                    </div>
                    <Bell size={16} className="text-amber-500 ml-auto animate-pulse" />
                  </div>
                  <textarea
                    rows={2}
                    placeholder='Optional reply (e.g. "We will reschedule to 5pm today")'
                    value={replyMessages[req.socketId] || ""}
                    onChange={e => setReplyMessages(prev => ({ ...prev, [req.socketId]: e.target.value }))}
                    className="w-full rounded-xl border-2 border-border px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary resize-none"
                  />
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-white"
                      onClick={() => handleVideoRespond(req.socketId, false)}
                    >
                      <XCircle size={15} className="mr-2" /> Decline
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleVideoRespond(req.socketId, true)}
                    >
                      <CheckCircle2 size={15} className="mr-2" /> Accept & Join
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-bold font-display">Recent Client Requests</h3>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1,2].map(i => <Card key={i} className="h-24 animate-pulse bg-secondary/30" />)}
          </div>
        ) : pendingRequests.length > 0 ? (
          <div className="space-y-4">
            {pendingRequests.map(req => (
              <Card key={req.id} className="border-border shadow-sm">
                <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="warning">New Request</Badge>
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(req.createdAt)}</span>
                    </div>
                    <h4 className="font-bold text-lg">{req.case?.title || 'Case Inquiry'}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{req.message || req.case?.description}</p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <Button 
                      variant="outline" 
                      className="flex-1 md:w-auto h-10 border-destructive text-destructive hover:bg-destructive hover:text-white"
                      onClick={() => handleResponse(req.id, 'rejected')}
                    >
                      <XCircle size={16} className="mr-2" /> Decline
                    </Button>
                    <Button 
                      className="flex-1 md:w-auto h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleResponse(req.id, 'accepted')}
                    >
                      <CheckCircle2 size={16} className="mr-2" /> Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-card rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground">You have no pending requests at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
export default LawyerDashboard;
