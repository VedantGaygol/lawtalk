import { Link } from "wouter";
import { Plus, Clock, CheckCircle2, ChevronRight, Scale, Users, Activity, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { getCases, getLawyers } from "@/services/api";
import { formatTimeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const UserDashboard = () => {
  const { user } = useAuth();
  const [casesData, setCasesData] = useState<any>(null);
  const [loadingCases, setLoadingCases] = useState(true);
  const [lawyersData, setLawyersData] = useState<any>(null);
  const [loadingLawyers, setLoadingLawyers] = useState(true);

  useEffect(() => {
    getCases()
      .then((res) => setCasesData(res))
      .finally(() => setLoadingCases(false));
    getLawyers({ limit: 3, minRating: 4.5 })
      .then((res) => setLawyersData(res))
      .finally(() => setLoadingLawyers(false));
  }, []);

  const activeCases = casesData?.cases.filter(c => c.status !== 'closed') || [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Welcome Hero */}
      <div className="bg-gradient-to-br from-primary to-slate-800 rounded-3xl p-6 md:p-10 text-white relative overflow-hidden shadow-xl shadow-primary/20">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4">
          <Scale size={300} />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold">Hello, {user?.name.split(' ')[0]}</h2>
          <p className="mt-2 text-primary-foreground/80 max-w-xl text-lg">
            Let's get your legal matters sorted. Our AI and expert lawyers are ready to assist you.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/cases/new">
              <Button className="bg-white text-primary hover:bg-slate-100 font-bold rounded-xl px-6 h-12">
                <Plus size={20} className="mr-2" />
                Submit New Case
              </Button>
            </Link>
            <Link href="/lawyers">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl px-6 h-12 backdrop-blur-sm">
                Browse Lawyers
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Active Cases */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold font-display flex items-center gap-2">
              <Activity className="text-accent" /> Your Active Cases
            </h3>
            <Link href="/cases" className="text-sm font-semibold text-primary flex items-center hover:underline">
              View All <ChevronRight size={16} />
            </Link>
          </div>

          {loadingCases ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <Card key={i} className="animate-pulse bg-card/50">
                  <CardContent className="h-32" />
                </Card>
              ))}
            </div>
          ) : activeCases.length > 0 ? (
            <div className="space-y-4">
              {activeCases.slice(0, 3).map(caseItem => (
                <Link key={caseItem.id} href={`/cases/${caseItem.id}`}>
                  <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                    <CardContent className="p-5 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant={caseItem.status === 'open' ? 'success' : 'secondary'}>
                            {caseItem.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium bg-secondary px-2 py-1 rounded-md">
                            {caseItem.category}
                          </span>
                        </div>
                        <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{caseItem.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{caseItem.description}</p>
                        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                          <Clock size={14} /> Updated {formatTimeAgo(caseItem.updatedAt)}
                        </p>
                      </div>
                      <ChevronRight className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity translate-y-4" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-dashed bg-secondary/30">
              <CardContent className="p-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-muted-foreground mb-4 shadow-sm">
                  <Briefcase size={24} />
                </div>
                <h4 className="font-bold text-lg">No active cases</h4>
                <p className="text-muted-foreground text-sm max-w-sm mt-1">Submit a case describing your legal issue to get matched with specialized lawyers.</p>
                <Link href="/cases/new">
                  <Button className="mt-6 rounded-full" size="sm">Submit your first case</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Recommended Lawyers */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold font-display flex items-center gap-2">
              <Users className="text-accent" /> Recommended
            </h3>
            <Link href="/lawyers" className="text-sm font-semibold text-primary hover:underline">
              See All
            </Link>
          </div>

          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
            {loadingLawyers ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-secondary/50 rounded-xl animate-pulse" />)}
              </div>
            ) : lawyersData?.lawyers.map(lawyer => (
              <Link key={lawyer.id} href={`/lawyers/${lawyer.id}`}>
                <div className="flex items-center gap-4 p-3 hover:bg-secondary/50 rounded-xl transition-colors group">
                  <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden border border-border flex-shrink-0">
                    {lawyer.profileImage ? (
                      <img src={lawyer.profileImage} alt={lawyer.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary text-white font-bold">
                        {lawyer.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">{lawyer.name}</h5>
                    <p className="text-xs text-muted-foreground truncate">{lawyer.specialization}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs font-medium text-amber-500">
                      ★ {lawyer.rating?.toFixed(1) || 'New'} <span className="text-muted-foreground font-normal">({lawyer.reviewCount} reviews)</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
export default UserDashboard;
