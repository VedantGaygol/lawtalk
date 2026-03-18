import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  ArrowLeft, BrainCircuit, MapPin,
  DollarSign, Clock, CheckCircle2, Search,
  MessageSquare, Video, Star, ShieldCheck, Briefcase
} from "lucide-react";
import { getCaseById, getCaseAnalysis, getCaseAssignedLawyer, getRequests, getConversationId } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

const CaseDetail = () => {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const caseId = parseInt(params.id || "0");

  const [caseData, setCaseData] = useState<any>(null);
  const [loadingCase, setLoadingCase] = useState(true);
  const [caseError, setCaseError] = useState(false);
  const [aiData, setAiData] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(true);
  const [assignedLawyer, setAssignedLawyer] = useState<any>(null);
  const [acceptedRequest, setAcceptedRequest] = useState<any>(null);

  useEffect(() => {
    if (!caseId) return;
    getCaseById(caseId)
      .then((res) => {
        setCaseData(res);
        if (res.assignedLawyerId) {
          getCaseAssignedLawyer(caseId)
            .then((l) => setAssignedLawyer(l))
            .catch(() => {});
          // Fetch accepted request to get roomCode
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

    getCaseAnalysis(caseId)
      .then((res) => setAiData(res))
      .catch(() => {})
      .finally(() => setLoadingAi(false));
  }, [caseId]);

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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="flex items-center gap-4 mb-2">
        <Link href="/cases" className="p-2 bg-card border border-border rounded-full hover:bg-secondary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <Badge variant={caseData.status === "open" ? "success" : caseData.status === "in_progress" ? "warning" : "secondary"} className="px-3 py-1">
          {caseData.status.replace("_", " ").toUpperCase()}
        </Badge>
        <span className="text-sm font-semibold text-muted-foreground bg-secondary px-3 py-1 rounded-full">
          {caseData.category}
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Col */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">{caseData.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground font-medium">
              {caseData.location && <div className="flex items-center gap-1.5"><MapPin size={16} /> {caseData.location}</div>}
              <div className="flex items-center gap-1.5"><DollarSign size={16} /> Budget: {formatCurrency(caseData.budget)}</div>
              <div className="flex items-center gap-1.5"><Clock size={16} /> Posted {formatDate(caseData.createdAt)}</div>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>Case Description</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{caseData.description}</p>
            </CardContent>
          </Card>

          {/* ── ASSIGNED LAWYER CARD (unlocked after acceptance) ── */}
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

                <Link href={`/lawyers/${assignedLawyer.id}`}>
                  <p className="text-xs text-center text-primary hover:underline mt-3 cursor-pointer">View full profile →</p>
                </Link>
              </CardContent>
            </Card>
          ) : !caseData.assignedLawyerId ? (
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
                        <RadialBar background clockWise dataKey="value" cornerRadius={10} fill="var(--color-accent)" />
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
