import { useEffect, useState } from "react";
import { ShieldCheck, XCircle, FileText, Clock, CheckCircle2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminGetLawyers, adminApproveLawyer } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { formatTimeAgo } from "@/lib/utils";

const statusVariant: Record<string, any> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
};

const AdminLawyers = () => {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchLawyers = () => {
    adminGetLawyers()
      .then((res) => setData(res))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchLawyers(); }, []);

  const handleAction = async (id: number, status: "approved" | "rejected", reason?: string) => {
    setProcessingId(id);
    try {
      await adminApproveLawyer(id, { status, reason });
      toast({ title: `Lawyer ${status}`, description: `The lawyer has been ${status} successfully.` });
      fetchLawyers();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const lawyers = (data?.lawyers || []).filter((l: any) =>
    filter === "all" ? true : l.approvalStatus === filter
  );

  const counts = (data?.lawyers || []).reduce((acc: any, l: any) => {
    acc[l.approvalStatus] = (acc[l.approvalStatus] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold">Lawyer Applications</h1>
        <p className="text-muted-foreground mt-1">Review and approve lawyer registrations.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
              filter === f
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-card border border-border text-muted-foreground hover:bg-secondary'
            }`}
          >
            {f} {f !== 'all' && counts[f] ? `(${counts[f]})` : ''}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Card key={i} className="h-32 animate-pulse bg-secondary/30" />)}
        </div>
      ) : lawyers.length > 0 ? (
        <div className="space-y-4">
          {lawyers.map((lawyer: any) => (
            <Card key={lawyer.id} className="border-border shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden border border-border shrink-0">
                      {lawyer.profileImage ? (
                        <img src={lawyer.profileImage} alt={lawyer.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary text-white font-bold">
                          {lawyer.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-lg">{lawyer.name}</h4>
                        <Badge variant={statusVariant[lawyer.approvalStatus] || 'secondary'} className="capitalize">
                          {lawyer.approvalStatus}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{lawyer.email}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        {lawyer.specialization && <span className="bg-secondary px-2 py-0.5 rounded-md">{lawyer.specialization}</span>}
                        {lawyer.location && <span>{lawyer.location}</span>}
                        {lawyer.experience != null && <span>{lawyer.experience} yrs exp</span>}
                        <span className="flex items-center gap-1"><Clock size={12} /> {formatTimeAgo(lawyer.createdAt)}</span>
                      </div>
                      {lawyer.licenseDocument && (
                        <a
                          href={lawyer.licenseDocument}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                        >
                          <FileText size={13} /> View License <ExternalLink size={11} />
                        </a>
                      )}
                      {!lawyer.licenseDocument && (
                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                          <FileText size={13} /> No license uploaded yet
                        </p>
                      )}
                    </div>
                  </div>

                  {lawyer.approvalStatus === 'pending' && (
                    <div className="flex gap-3 w-full md:w-auto">
                      <Button
                        variant="outline"
                        className="flex-1 md:w-auto border-destructive text-destructive hover:bg-destructive hover:text-white"
                        onClick={() => handleAction(lawyer.id, 'rejected', 'Application does not meet requirements')}
                        isLoading={processingId === lawyer.id}
                      >
                        <XCircle size={16} className="mr-2" /> Reject
                      </Button>
                      <Button
                        className="flex-1 md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleAction(lawyer.id, 'approved')}
                        isLoading={processingId === lawyer.id}
                      >
                        <CheckCircle2 size={16} className="mr-2" /> Approve
                      </Button>
                    </div>
                  )}

                  {lawyer.approvalStatus === 'approved' && (
                    <Button
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                      onClick={() => handleAction(lawyer.id, 'rejected', 'Approval revoked')}
                      isLoading={processingId === lawyer.id}
                    >
                      <XCircle size={16} className="mr-2" /> Revoke
                    </Button>
                  )}

                  {lawyer.approvalStatus === 'rejected' && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleAction(lawyer.id, 'approved')}
                      isLoading={processingId === lawyer.id}
                    >
                      <ShieldCheck size={16} className="mr-2" /> Re-approve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-bold font-display">No {filter !== 'all' ? filter : ''} lawyers</h3>
          <p className="text-muted-foreground mt-2">Nothing to show for this filter.</p>
        </div>
      )}
    </div>
  );
};

export default AdminLawyers;
