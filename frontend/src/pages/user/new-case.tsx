import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Sparkles, Scale, FileText, MapPin, DollarSign, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createCase } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const CATEGORIES = [
  "Criminal Law", "Family Law", "Civil Law", "Corporate Law", 
  "Property Law", "Labour Law", "Tax Law", "Intellectual Property", 
  "Immigration Law", "Constitutional Law"
];

const newCaseSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Please provide more details (min 20 characters)"),
  category: z.string().min(1, "Please select a category"),
  location: z.string().optional(),
  budget: z.coerce.number().optional().nullable(),
});

type NewCaseForm = z.infer<typeof newCaseSchema>;

const NewCasePage = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors } } = useForm<NewCaseForm>({
    resolver: zodResolver(newCaseSchema)
  });

  const [isPending, setIsPending] = useState(false);

  const onSubmit = async (data: NewCaseForm) => {
    setIsPending(true);
    try {
      const res = await createCase(data);
      toast({ title: "Case submitted!", description: "Your case is now being analyzed by AI." });
      setLocation(`/cases/${res.id}`);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || error.message, variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="mb-6 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 bg-card border border-border rounded-full hover:bg-secondary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-display">Submit a New Case</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Sparkles size={14} className="text-accent" /> Powered by AI Analysis
          </p>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-black/5 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <FileText size={16} className="text-primary" /> Case Title
              </label>
              <Input 
                {...register("title")}
                placeholder="e.g. Property Dispute with Landlord"
                className="bg-white"
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Scale size={16} className="text-primary" /> Category
                </label>
                <div className="relative">
                  <select 
                    {...register("category")}
                    className={`w-full h-12 rounded-xl border-2 px-4 py-2 text-sm bg-white appearance-none focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all ${errors.category ? 'border-destructive' : 'border-border'}`}
                  >
                    <option value="">Select legal category</option>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
                    <ChevronRight size={16} className="rotate-90" />
                  </div>
                </div>
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <MapPin size={16} className="text-primary" /> Location (City/State)
                </label>
                <Input 
                  {...register("location")}
                  placeholder="Optional"
                  className="bg-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <FileText size={16} className="text-primary" /> Detailed Description
              </label>
              <textarea 
                {...register("description")}
                rows={6}
                placeholder="Provide as much detail as possible. Our AI will analyze this to determine the winning probability and recommend strategy..."
                className={`w-full rounded-xl border-2 px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none ${errors.description ? 'border-destructive' : 'border-border'}`}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <DollarSign size={16} className="text-primary" /> Estimated Budget (USD)
              </label>
              <Input 
                {...register("budget")}
                type="number"
                placeholder="Leave blank if negotiable"
                className="bg-white md:w-1/3"
              />
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground max-w-xs">
                Your details are completely confidential and protected.
              </p>
              <Button type="submit" size="lg" className="rounded-full shadow-lg shadow-primary/20" disabled={isPending}>
                {isPending ? "Submitting..." : "Analyze & Submit Case"}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewCasePage;