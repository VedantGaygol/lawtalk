import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  ArrowLeft, BrainCircuit, MapPin,
  IndianRupee, Clock, CheckCircle2, Search,
  MessageSquare, Video, Star, ShieldCheck, Briefcase, CheckCheck, XCircle, Sparkles
} from "lucide-react";
import { getCaseById, getCaseAnalysis, getCaseAssignedLawyer, getRequests, getConversationId, markCaseSolved, confirmCaseSolved, createReview, getSolvePending, getCaseRecommendations } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

// ── Recommended Lawyers Section ───────────────────────────────────────────────
const RecommendedLawyers = ({ lawyers, loading }: { lawyers: any[]; loading: boolean }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent">
            <Sparkles size={18} /> AI Recommended Lawyers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-secondary/40 animate-pulse" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lawyers.length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-accent">
          <Sparkles size={18} /> AI Recommended Lawyers
        </CardTitle>
        <p className="text-xs text-muted-foreground">Ranked by specialization, location, budget & rating match</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {lawyers.map((lawyer, idx) => (
          <Link key={lawyer.id} href={`/lawyers/${lawyer.id}`}>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
              {/* Rank badge */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                idx === 0 ? "bg-amber-100 text-amber-700" :
                idx === 1 ? "bg-slate-100 text-slate-600" :
                idx === 2 ? "bg-orange-100 text-orange-600" :
                "bg-secondary text-muted-foreground"
              }`}>
                #{idx + 1}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                {lawyer.name?.charAt(0)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{lawyer.name}</p>
                <p className="text-xs text-accent font-medium truncate">{lawyer.specialization || "General Practice"}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                  {lawyer.location && <span className="flex items-center gap-1"><MapPin size={10} />{lawyer.location}</span>}
                  {lawyer.experience > 0 && <span className="flex items-center gap-1"><Briefcase size={10} />{lawyer.experience} yrs</span>}
                  {lawyer.rating > 0 && <span className="flex items-center gap-1 text-amber-500"><Star size={10} className="fill-amber-500" />{Number(lawyer.rating).toFixed(1)}</span>}
                </div>
              </div>

              {/* Match score */}
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-accent">{Math.round(lawyer.score * 100)}%</div>
                <div className="text-[10px] text-muted-foreground">match</div>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
};

const CaseDetail = () => {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const caseId = parseInt(params.id || "0");

  const [caseData, setCaseData] = useState<any>(null);
  const [loadingCase, setLoadingCase] = useState(true);
  const [caseError, setCaseError] = useState(false);
  const [aiData, setAiData] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(true);
  const [assignedLawyer, setAssignedLawyer] = useState<any>(null);
  const [acceptedRequest, setAcceptedRequest] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Lawyer: mark solved
  const [markingsolved, setMarkingSolved] = useState(false);

  // User: confirm solved dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [solvePending, setSolvePending] = useState(false);

  const checkSolvePending = (id: number) => {
    if (user?.role !== "user") return;
    getSolvePending(id)
      .then((r) => setSolvePending(r.pending))
      .catch(() => {});
  };

  // User: rating dialog
  const [ratingOpen, setRatingOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const fetchCase = () => {
    if (!caseId) return;
    getCaseById(caseId)
      .then((res) => {
        setCaseData(res);
        checkSolvePending(caseId);
        if (res.assignedLawyerId) {
          getCaseAssignedLawyer(caseId)
            .then((l) => setAssignedLawyer(l))
            .catch(() => {});
          getRequests()
            .then((reqData) => {
              const accepted = reqData.requests?.find(
                (r: any) => r.caseId === caseId && r.status === "accepted"
              );
              setAcceptedRequest(accepted || null);
            })
            .catch(() => {});
        }
      })
      .catch(() => setCaseError(true))
      .finally(() => setLoadingCase(false));
  };

  useEffect(() => {
    fetchCase();
    getCaseAnalysis(caseId)
      .then((res) => setAiData(res))
      .catch(() => {})
      .finally(() => setLoadingAi(false));
    setLoadingRecs(true);
    getCaseRecommendations(caseId)
      .then((res) => setRecommendations(res.lawyers || []))
      .catch(() => {})
      .finally(() => setLoadingRecs(false));
  }, [caseId]);

  const handleMarkSolved = async () => {
    setMarkingSolved(true);
    try {
      await markCaseSolved(caseId);
      toast({ title: "Notification sent!", description: "The client has been asked to confirm the case is resolved." });
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setMarkingSolved(false);
    }
  };

  const handleConfirm = async (confirmed: boolean) => {
    setConfirming(true);
    try {
      const res = await confirmCaseSolved(caseId, confirmed);
      setConfirmOpen(false);
      if (confirmed) {
        toast({ title: "Case marked as resolved!", description: "You can now rate your lawyer." });
        setCaseData((prev: any) => ({ ...prev, status: "resolved" }));
        setSolvePending(false);
        setRatingOpen(true);
      } else {
        toast({ title: "Case reopened", description: "The lawyer has been notified to continue working on your case." });
        setCaseData((prev: any) => ({ ...prev, status: "in_progress" }));
        setSolvePending(false);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!rating || !assignedLawyer) return;
    setSubmittingReview(true);
    try {
      await createReview({ lawyerId: assignedLawyer.id, caseId, rating, comment });
      toast({ title: "Review submitted!", description: "Thank you for your feedback." });
      setRatingOpen(false);
      setAlreadyReviewed(true);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      if (err.response?.status === 409) setAlreadyReviewed(true);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loadingCase) {
    return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (caseError || !caseData) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold">Case not found</h2>
        <Link href="/cases"><Button className="mt-4">Back to Cases</Button></Link>
      </div>
    );
  }

  const analysis = aiData || {
    winningProbability: 78,
    legalSection: "Section 43, Property Act",
    recommendation: "Focus on gathering written communication evidence. Settle out of court if possible.",
    keyPoints: ["Strong documentary evidence", "Jurisdiction advantage", "Statute of limitations valid"],
  };

  const chartData = [{ name: "Win Probability", value: analysis.winningProbability, fill: "hsl(var(--accent))" }];

  // Build conversation ID: sorted [myUserId, lawyerUserId]
  const conversationId = assignedLawyer && user
    ? getConversationId(user.id, assignedLawyer.userId)
    : null;

  const statusVariant: Record<string, any> = {
    open: "success", in_progress: "warning", resolved: "success", closed: "secondary",
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Confirm Solved Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Is your case resolved?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Your lawyer has marked this case as solved. Please confirm whether your issue has been fully resolved.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            If you click <strong>No</strong>, the case will be reopened and your lawyer will be notified to continue working on it.
          </div>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-white gap-2" onClick={() => handleConfirm(false)} isLoading={confirming}>
              <XCircle size={16} /> No, Reopen Case
            </Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => handleConfirm(true)} isLoading={confirming}>
              <CheckCheck size={16} /> Yes, It's Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Rate Your Lawyer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">How would you rate {assignedLawyer?.name}'s service on this case?</p>
          <div className="flex justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(s)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={36}
                  className={s <= (hoverRating || rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm font-semibold text-amber-600">
              {["Poor", "Fair", "Good", "Very Good", "Excellent"][rating - 1]}
            </p>
          )}
          <textarea
            rows={3}
            placeholder="Write a review (optional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-xl border-2 border-border px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary resize-none"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRatingOpen(false)}>Skip</Button>
            <Button onClick={handleSubmitReview} disabled={!rating} isLoading={submittingReview} className="gap-2">
              <Star size={15} /> Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-4 mb-2">
        <Link href="/cases" className="p-2 bg-card border border-border rounded-full hover:bg-secondary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <Badge variant={statusVariant[caseData.status] || "secondary"} className="px-3 py-1">
          {caseData.status.replace("_", " ").toUpperCase()}
        </Badge>
        <span className="text-sm font-semibold text-muted-foreground bg-secondary px-3 py-1 rounded-full">
          {caseData.category}
        </span>
      </div>

      {/* User: pending solve confirmation banner — only shown when lawyer sent a solve request */}
      {user?.role === "user" && solvePending && assignedLawyer && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-amber-800">Your lawyer says this case is solved!</p>
              <p className="text-sm text-amber-700 mt-0.5">Please confirm whether your issue has been fully resolved.</p>
            </div>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-2" onClick={() => setConfirmOpen(true)}>
              <CheckCheck size={16} /> Confirm Resolution
            </Button>
          </CardContent>
        </Card>
      )}

      {/* User: resolved — show rate button if not yet reviewed */}
      {user?.role === "user" && caseData.status === "resolved" && assignedLawyer && !alreadyReviewed && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-emerald-800">Case Resolved ✅</p>
              <p className="text-sm text-emerald-700 mt-0.5">Share your experience to help others find the right lawyer.</p>
            </div>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 gap-2" onClick={() => setRatingOpen(true)}>
              <Star size={16} /> Rate Your Lawyer
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Col */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">{caseData.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground font-medium">
              {caseData.location && <div className="flex items-center gap-1.5"><MapPin size={16} /> {caseData.location}</div>}
              <div className="flex items-center gap-1.5"><IndianRupee size={16} /> Budget: {formatCurrency(caseData.budget)}</div>
              <div className="flex items-center gap-1.5"><Clock size={16} /> Posted {formatDate(caseData.createdAt)}</div>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>Case Description</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{caseData.description}</p>
            </CardContent>
          </Card>

          {caseData.status === "in_progress" && assignedLawyer ? (
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-card overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-200 overflow-hidden border-2 border-emerald-200 shrink-0">
                    {assignedLawyer.profileImage ? (
                      <img src={assignedLawyer.profileImage} alt={assignedLawyer.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary text-white text-2xl font-bold">
                        {assignedLawyer.name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-lg">{assignedLawyer.name}</h4>
                      <ShieldCheck size={18} className="text-emerald-500" />
                      <Badge variant="success" className="text-xs">Your Lawyer</Badge>
                    </div>
                    <p className="text-sm text-accent font-medium mt-0.5">{assignedLawyer.specialization || "General Practice"}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      {assignedLawyer.location && <span className="flex items-center gap-1"><MapPin size={12} />{assignedLawyer.location}</span>}
                      {assignedLawyer.experience != null && <span className="flex items-center gap-1"><Briefcase size={12} />{assignedLawyer.experience} yrs</span>}
                      {assignedLawyer.rating && <span className="flex items-center gap-1 text-amber-500"><Star size={12} className="fill-amber-500" />{assignedLawyer.rating.toFixed(1)}</span>}
                    </div>
                  </div>
                </div>

                {/* Room code display */}
                {(assignedLawyer.lawyerCode || acceptedRequest?.roomCode) && (
                  <div className="mt-4 p-3 bg-white rounded-xl border border-emerald-200">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Video Room Code</p>
                    <p className="text-xl font-display font-bold text-emerald-700 tracking-widest">
                      {assignedLawyer.lawyerCode || acceptedRequest?.roomCode}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Use this code to join the video conference.</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Button
                    className="gap-2 bg-primary"
                    onClick={() => conversationId && setLocation(`/chat/${conversationId}`)}
                    disabled={!conversationId}
                  >
                    <MessageSquare size={16} /> Chat
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => {
                      const code = assignedLawyer.lawyerCode || acceptedRequest?.roomCode;
                      if (code) setLocation(`/video/${code}`);
                    }}
                    disabled={!assignedLawyer.lawyerCode && !acceptedRequest?.roomCode}
                  >
                    <Video size={16} /> Video Call
                  </Button>
                </div>

                {/* Lawyer: mark case as solved */}
                {user?.role === "lawyer" && caseData.status === "in_progress" && (
                  <Button
                    className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    onClick={handleMarkSolved}
                    isLoading={markingsolved}
                  >
                    <CheckCircle2 size={16} /> Mark as Solved
                  </Button>
                )}

                <Link href={`/lawyers/${assignedLawyer.id}`}>
                  <p className="text-xs text-center text-primary hover:underline mt-3 cursor-pointer">View full profile →</p>
                </Link>
              </CardContent>
            </Card>
          ) : !caseData.assignedLawyerId ? (
            <>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-lg text-primary">Find the Right Representation</h4>
                    <p className="text-sm text-muted-foreground">Browse specialized lawyers and send a case request.</p>
                  </div>
                  <Link href={`/lawyers?category=${encodeURIComponent(caseData.category)}`}>
                    <Button size="lg" className="rounded-full shrink-0">
                      <Search size={18} className="mr-2" /> Browse Lawyers
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* AI Recommended Lawyers */}
              <RecommendedLawyers lawyers={recommendations} loading={loadingRecs} />
            </>
          ) : null}
        </div>

        {/* Right Col - AI Analysis */}
        <div className="space-y-6">
          <Card className="border-accent/20 bg-gradient-to-b from-card to-accent/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-bl-full -z-0" />
            <CardHeader className="relative z-10 pb-2">
              <CardTitle className="flex items-center gap-2 text-accent">
                <BrainCircuit size={20} /> AI Analysis Report
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Generated based on case details</p>
            </CardHeader>
            <CardContent className="relative z-10 space-y-6">
              {loadingAi ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" />
                </div>
              ) : (
                <>
                  <div className="h-[160px] w-full flex items-center justify-center relative -my-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={14} data={chartData} startAngle={180} endAngle={0}>
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar background dataKey="value" cornerRadius={10} fill="var(--color-accent)" />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center top-[50%]">
                      <span className="text-3xl font-display font-bold text-foreground">{analysis.winningProbability}%</span>
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Win Prob.</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-bold text-foreground mb-1">Applicable Law</h5>
                      <p className="text-sm text-muted-foreground bg-white p-2 rounded-lg border border-border">{analysis.legalSection}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-foreground mb-1">Key Strengths</h5>
                      <ul className="space-y-1">
                        {analysis.keyPoints?.map((point: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-border shadow-sm">
                      <h5 className="text-xs font-bold uppercase text-primary mb-1">AI Recommendation</h5>
                      <p className="text-sm text-muted-foreground">{analysis.recommendation}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CaseDetail;
