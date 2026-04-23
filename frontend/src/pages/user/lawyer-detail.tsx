import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { 
  ArrowLeft, Star, MapPin, Briefcase, Award, MessageSquare, 
  ShieldCheck, Clock, FileText, ChevronRight
} from "lucide-react";
import { getLawyerById, getLawyerReviews, getCases, createRequest } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

const LawyerDetail = () => {
  const params = useParams();
  const lawyerId = parseInt(params.id || "0");
  const { toast } = useToast();

  const [lawyer, setLawyer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reviewsData, setReviewsData] = useState<any>(null);
  const [casesData, setCasesData] = useState<any>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<number | "">("");
  const [requestMessage, setRequestMessage] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!lawyerId) return;
    getLawyerById(lawyerId)
      .then((res) => setLawyer(res))
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
    getLawyerReviews(lawyerId).then((res) => setReviewsData(res)).catch(() => {});
    getCases().then((res) => setCasesData(res)).catch(() => {});
  }, [lawyerId]);

  const handleSendRequest = async () => {
    if (!selectedCaseId) {
      toast({ title: "Select a case", description: "You must select a case to send a request.", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      await createRequest({ lawyerId, caseId: Number(selectedCaseId), message: requestMessage });
      toast({ title: "Request Sent!", description: "The lawyer will review your case shortly." });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (error || !lawyer) return <div className="p-8 text-center"><h2 className="text-2xl font-bold">Lawyer not found</h2></div>;

  return (
    <div className="bg-background min-h-screen pb-20">
      {/* Cover Header */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-slate-900 via-primary to-slate-800 relative">
        <Link href="/lawyers" className="absolute top-4 left-4 md:top-8 md:left-8 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors z-10">
          <ArrowLeft size={20} />
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-20 z-10">
        <div className="bg-card rounded-3xl shadow-xl border border-border p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl border-4 border-card bg-slate-200 overflow-hidden shrink-0 shadow-lg -mt-16 md:-mt-20 relative">
              {lawyer.profileImage ? (
                <img src={lawyer.profileImage} alt={lawyer.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary text-white text-5xl font-bold">
                  {lawyer.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-2">
                    {lawyer.name}
                    {lawyer.approvalStatus === 'approved' && (
                      <ShieldCheck size={24} className="text-emerald-500" />
                    )}
                  </h1>
                  <p className="text-xl font-medium text-accent mt-1">{lawyer.specialization || "General Practice"}</p>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="w-full md:w-auto rounded-full shadow-lg shadow-primary/20">
                      Request Consultation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-2xl p-6">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-display">Send Request to {lawyer.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Select Case</label>
                        <select 
                          value={selectedCaseId} 
                          onChange={e => setSelectedCaseId(e.target.value as any)}
                          className="w-full h-12 rounded-xl border-2 border-border px-4 bg-card focus:outline-none focus:border-primary"
                        >
                          <option value="">-- Choose a case --</option>
                          {casesData?.cases.filter(c => !c.assignedLawyerId).map(c => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Initial Message (Optional)</label>
                        <textarea 
                          rows={4}
                          value={requestMessage}
                          onChange={e => setRequestMessage(e.target.value)}
                          placeholder="Briefly explain why you're reaching out..."
                          className="w-full rounded-xl border-2 border-border px-4 py-3 text-sm bg-card focus:outline-none focus:border-primary resize-none"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSendRequest} isLoading={isSending} className="w-full h-12">
                        Send Request
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-3 mt-6 text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-2"><MapPin size={18} className="text-primary"/> {lawyer.location || 'Location not specified'}</div>
                <div className="flex items-center gap-2"><Briefcase size={18} className="text-primary"/> {lawyer.experience || 0} Years Experience</div>
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-amber-500 fill-amber-500"/> 
                  <span className="text-foreground">{lawyer.rating?.toFixed(1) || 'New'}</span> 
                  ({lawyer.reviewCount} reviews)
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <section>
                <h3 className="text-xl font-bold font-display mb-3">About</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {lawyer.bio || "This lawyer hasn't provided a biography yet."}
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold font-display mb-4">Client Reviews</h3>
                {reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviewsData.reviews.map(review => (
                      <div key={review.id} className="p-4 bg-secondary/30 rounded-2xl border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-foreground">{review.user?.name || 'Anonymous Client'}</span>
                          <div className="flex text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={14} className={i < review.rating ? "fill-amber-500" : "text-slate-300"} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">No reviews yet.</p>
                )}
              </section>
            </div>

            <div className="space-y-6">
              <Card className="bg-secondary/20 shadow-none">
                <CardContent className="p-6 space-y-4">
                  <h4 className="font-bold text-lg mb-2">Details</h4>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground text-sm flex items-center gap-2"><Award size={16}/> Hourly Rate</span>
                    <span className="font-bold">₹{lawyer.pricing || '150'}/hr</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground text-sm flex items-center gap-2"><Clock size={16}/> Response Time</span>
                    <span className="font-bold">&lt; 24 hrs</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground text-sm flex items-center gap-2"><FileText size={16}/> Active Cases</span>
                    <span className="font-bold">12</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default LawyerDetail;
