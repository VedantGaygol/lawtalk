import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield, Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginUser } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

const Login = () => {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const [isPending, setIsPending] = useState(false);

  const onSubmit = async (data: LoginForm) => {
    setIsPending(true);
    try {
      const res = await loginUser(data);
      login(res.token);
      toast({ title: "Welcome back!", description: "Successfully logged in." });
      if (res.user.role === 'admin') setLocation("/admin");
      else if (res.user.role === 'lawyer') setLocation("/lawyer/dashboard");
      else setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.response?.data?.message || "Invalid credentials",
        variant: "destructive",
      });
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
              <Shield size={28} />
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground text-center">Welcome back</h1>
            <p className="text-muted-foreground mt-2 text-center">Enter your details to access your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input 
              {...register("email")}
              type="email"
              placeholder="name@example.com"
              icon={<Mail size={18} />}
              error={errors.email?.message}
            />
            
            <div className="space-y-1">
              <Input 
                {...register("password")}
                type="password"
                placeholder="••••••••"
                icon={<Lock size={18} />}
                error={errors.password?.message}
              />
              <div className="flex justify-end">
                <a href="#" className="text-xs font-semibold text-primary hover:underline">Forgot password?</a>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base" isLoading={isPending}>
              Sign In
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center text-sm">
            <p className="text-muted-foreground">
              Don't have an account?{" "}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-4">
              <Link href="/signup/user" className="font-semibold text-primary hover:underline">Register as Client</Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/signup/lawyer" className="font-semibold text-primary hover:underline">Join as Lawyer</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Login;
