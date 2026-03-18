import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Briefcase, Mail, Lock, Shield, Link as LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerUser } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const signupSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignupForm = z.infer<typeof signupSchema>;

const LawyerSignup = () => {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema)
  });

  const [isPending, setIsPending] = useState(false);

  const onSubmit = async (data: SignupForm) => {
    setIsPending(true);
    try {
      const res = await registerUser({ ...data, role: "lawyer" });
      login(res.token);
      toast({ title: "Application submitted!", description: "Please complete your profile to get approved." });
      setLocation("/lawyer/profile");
    } catch (error: any) {
      toast({ title: "Registration failed", description: error.response?.data?.message || error.message, variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
      
      <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border/10 overflow-hidden relative z-10">
        <div className="p-8 sm:p-10">
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-4 shadow-lg">
              <Briefcase size={28} />
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground text-center">Join as a Lawyer</h1>
            <p className="text-muted-foreground mt-2 text-center text-sm">Grow your practice with verified clients</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input 
              {...register("name")}
              placeholder="Full Name (with Title)"
              icon={<Briefcase size={18} />}
              error={errors.name?.message}
            />
            <Input 
              {...register("email")}
              type="email"
              placeholder="Professional Email"
              icon={<Mail size={18} />}
              error={errors.email?.message}
            />
            <Input 
              {...register("password")}
              type="password"
              placeholder="Create Password"
              icon={<Lock size={18} />}
              error={errors.password?.message}
            />

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mt-4">
              <p className="text-xs text-amber-800 flex items-start gap-2">
                <Shield size={16} className="shrink-0 mt-0.5" />
                Note: After registration, you will need to upload your Bar License document for verification before your profile becomes public.
              </p>
            </div>

            <Button type="submit" className="w-full h-12 text-base mt-2" isLoading={isPending}>
              Submit Application
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
export default LawyerSignup;
