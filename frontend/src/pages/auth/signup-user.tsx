import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Mail, Lock, Shield } from "lucide-react";
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

const UserSignup = () => {
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
      const res = await registerUser({ ...data, role: "user" });
      login(res.token);
      toast({ title: "Account created!", description: "Welcome to LawTalk." });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({ title: "Registration failed", description: error.response?.data?.message || error.message, variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-xl border border-border overflow-hidden">
        <div className="p-8 sm:p-10">
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
              <User size={28} />
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground text-center">Create Client Account</h1>
            <p className="text-muted-foreground mt-2 text-center">Get instant access to top legal professionals</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input 
              {...register("name")}
              placeholder="Full Name"
              icon={<User size={18} />}
              error={errors.name?.message}
            />
            <Input 
              {...register("email")}
              type="email"
              placeholder="Email Address"
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

            <Button type="submit" className="w-full h-12 text-base" isLoading={isPending}>
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Log in</Link>
            </p>
            <div className="mt-4 pt-4 border-t border-border">
              <Link href="/signup/lawyer" className="text-muted-foreground font-medium hover:text-foreground transition-colors flex items-center justify-center gap-2">
                <Shield size={16} /> Are you a lawyer? Join here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default UserSignup;
