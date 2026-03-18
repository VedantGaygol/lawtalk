import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Search, MapPin, Star, Filter, ShieldCheck, Briefcase } from "lucide-react";
import { getLawyers } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  "All", "Criminal Law", "Family Law", "Civil Law", "Corporate Law", "Property Law"
];

const LawyersList = () => {
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const params: any = {};
    if (category !== "All") params.category = category;
    getLawyers(params)
      .then((res) => setData(res))
      .finally(() => setIsLoading(false));
  }, [category]);

  // Client-side search filter as fallback since api doesn't have strict search text param
  const filteredLawyers = data?.lawyers?.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    (l.specialization && l.specialization.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col h-full animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Find a Lawyer</h1>
        <p className="text-muted-foreground mt-2">Connect with verified legal professionals tailored to your case.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <Input 
            placeholder="Search by name or specialization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={18} />}
            className="bg-card shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                category === cat 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'bg-card text-muted-foreground border border-border hover:bg-secondary'
              }`}
            >
              {cat}
            </button>
          ))}
          <Button variant="outline" className="shrink-0 h-11 ml-2 bg-card">
            <Filter size={16} className="mr-2" /> More Filters
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i} className="animate-pulse h-[300px] bg-secondary/30" />
          ))}
        </div>
      ) : filteredLawyers.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLawyers.map(lawyer => (
            <Link key={lawyer.id} href={`/lawyers/${lawyer.id}`}>
              <Card className="group hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full">
                <div className="h-24 bg-gradient-to-r from-slate-800 to-primary w-full relative">
                  <div className="absolute -bottom-10 left-6">
                    <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-lg">
                      <div className="w-full h-full rounded-xl bg-slate-200 overflow-hidden relative">
                        {lawyer.profileImage ? (
                          <img src={lawyer.profileImage} alt={lawyer.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary text-white text-2xl font-bold">
                            {lawyer.name.charAt(0)}
                          </div>
                        )}
                        {lawyer.approvalStatus === 'approved' && (
                          <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                            <ShieldCheck size={10} className="text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <CardContent className="pt-12 pb-5 px-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold font-display text-lg text-foreground group-hover:text-primary transition-colors leading-tight">
                        {lawyer.name}
                      </h3>
                      <p className="text-sm font-medium text-accent mt-0.5">{lawyer.specialization || "General Practice"}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                      <Star size={14} className="text-amber-500 fill-amber-500" />
                      <span className="text-xs font-bold text-amber-700">{lawyer.rating?.toFixed(1) || '5.0'}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4 text-sm text-muted-foreground">
                    {lawyer.location && (
                      <div className="flex items-center gap-2">
                        <MapPin size={16} /> {lawyer.location}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} /> {lawyer.experience || 0} years experience
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-6">
                    <Button variant="outline" className="w-full rounded-xl border-border/60 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors">
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
            <Search size={32} />
          </div>
          <h3 className="text-xl font-bold font-display text-foreground">No lawyers found</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">Try adjusting your filters or search criteria to find the right legal professional.</p>
          <Button variant="outline" onClick={() => {setCategory("All"); setSearch("");}} className="mt-6">
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
export default LawyersList;
