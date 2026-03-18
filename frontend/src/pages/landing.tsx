import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Scale, MessageSquare, ArrowRight, CheckCircle2, Users } from "lucide-react";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-lg border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Shield size={24} />
            </div>
            <span className="font-display font-bold text-2xl text-primary tracking-tight">LawTalk</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
              Log in
            </Link>
            <Link href="/signup/user" className="hidden sm:inline-flex px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-32">
          <div className="absolute inset-0 z-0">
            <img 
              src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
              alt="Professional law office background" 
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent font-semibold text-sm mb-8 border border-accent/20">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              AI-Powered Legal Assistance
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-extrabold text-foreground tracking-tight max-w-4xl mx-auto leading-[1.1]">
              Expert legal help, <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">just a tap away.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect with top-rated lawyers instantly. Get AI-driven case analysis, secure messaging, and professional guidance all in one platform.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup/user" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 hover:-translate-y-1 flex items-center justify-center gap-2">
                Find a Lawyer <ArrowRight size={20} />
              </Link>
              <Link href="/signup/lawyer" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white border-2 border-border text-foreground font-bold text-lg hover:border-primary hover:text-primary transition-all flex items-center justify-center">
                Join as Lawyer
              </Link>
            </div>
            
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500" /> Verified Professionals</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500" /> Secure Chat</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500" /> AI Case Analysis</div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-secondary/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">How LawTalk Works</h2>
              <p className="mt-4 text-lg text-muted-foreground">Everything you need to navigate legal challenges smoothly.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card p-8 rounded-3xl border border-border shadow-sm hover:shadow-xl transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Scale size={28} />
                </div>
                <h3 className="text-xl font-bold font-display mb-3">1. Submit Your Case</h3>
                <p className="text-muted-foreground">Describe your legal issue. Our AI analyzes the details to recommend the best legal strategy and matching experts.</p>
              </div>
              
              <div className="bg-card p-8 rounded-3xl border border-border shadow-sm hover:shadow-xl transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users size={28} />
                </div>
                <h3 className="text-xl font-bold font-display mb-3">2. Choose a Lawyer</h3>
                <p className="text-muted-foreground">Browse verified profiles, read reviews, and select a specialized lawyer that fits your budget and location.</p>
              </div>
              
              <div className="bg-card p-8 rounded-3xl border border-border shadow-sm hover:shadow-xl transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <MessageSquare size={28} />
                </div>
                <h3 className="text-xl font-bold font-display mb-3">3. Connect Securely</h3>
                <p className="text-muted-foreground">Chat in real-time, share documents securely, and get your legal issues resolved entirely within the app.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <Shield size={24} />
            <span className="font-display font-bold text-xl">LawTalk</span>
          </div>
          <p className="text-primary-foreground/60 text-sm">© 2025 LawTalk Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
export default LandingPage;
