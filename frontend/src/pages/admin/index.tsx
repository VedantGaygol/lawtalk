import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Users, Briefcase, FileText, MessageSquare, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { adminGetStats } from "@/services/api";

const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminGetStats()
      .then((res) => setStats(res))
      .finally(() => setIsLoading(false));
  }, []);

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Total Lawyers", value: stats?.totalLawyers, icon: Briefcase, color: "text-purple-600 bg-purple-50" },
    { label: "Pending Approvals", value: stats?.pendingApprovals, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "Total Cases", value: stats?.totalCases, icon: FileText, color: "text-emerald-600 bg-emerald-50" },
    { label: "Active Cases", value: stats?.activeCases, icon: FileText, color: "text-primary bg-primary/10" },
    { label: "Total Messages", value: stats?.totalMessages, icon: MessageSquare, color: "text-rose-600 bg-rose-50" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold">Admin Overview</h1>
        <p className="text-muted-foreground mt-1">Platform statistics and management.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${s.color}`}>
                <s.icon size={20} />
              </div>
              {isLoading ? (
                <div className="h-8 w-16 bg-secondary animate-pulse rounded mb-1" />
              ) : (
                <h4 className="text-3xl font-bold font-display">{s.value ?? '—'}</h4>
              )}
              <p className="text-sm text-muted-foreground font-medium mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-amber-200 bg-amber-50/30">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Pending Lawyer Approvals</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {isLoading ? "Loading..." : `${stats?.pendingApprovals || 0} lawyer${stats?.pendingApprovals !== 1 ? 's' : ''} waiting for review`}
            </p>
          </div>
          <Link href="/admin/lawyers">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
              Review Now <ChevronRight size={16} />
            </button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
