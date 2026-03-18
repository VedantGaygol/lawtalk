import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Plus, Clock, ChevronRight, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCases } from "@/services/api";
import { formatTimeAgo } from "@/lib/utils";

const CasesPage = () => {
  const [casesData, setCasesData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCases()
      .then((res) => setCasesData(res))
      .finally(() => setIsLoading(false));
  }, []);

  const cases = casesData?.cases || [];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">My Cases</h1>
          <p className="text-muted-foreground mt-1">Track and manage all your legal cases.</p>
        </div>
        <Link href="/cases/new">
          <Button className="rounded-xl gap-2">
            <Plus size={18} /> New Case
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse h-28 bg-secondary/30" />
          ))}
        </div>
      ) : cases.length > 0 ? (
        <div className="space-y-4">
          {cases.map((c: any) => (
            <Link key={c.id} href={`/cases/${c.id}`}>
              <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant={c.status === 'open' ? 'success' : c.status === 'in_progress' ? 'warning' : 'secondary'}>
                        {c.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-medium bg-secondary px-2 py-1 rounded-md">
                        {c.category}
                      </span>
                    </div>
                    <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors truncate">{c.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{c.description}</p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock size={13} /> Updated {formatTimeAgo(c.updatedAt)}
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed bg-secondary/30">
          <CardContent className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-muted-foreground mb-4 shadow-sm">
              <Briefcase size={24} />
            </div>
            <h4 className="font-bold text-lg">No cases yet</h4>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">Submit your first case to get matched with specialized lawyers.</p>
            <Link href="/cases/new">
              <Button className="mt-6 rounded-full" size="sm">Submit your first case</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CasesPage;
