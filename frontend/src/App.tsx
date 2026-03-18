import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/AppLayout";

// Public pages
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/auth/login";
import SignupUserPage from "@/pages/auth/signup-user";
import SignupLawyerPage from "@/pages/auth/signup-lawyer";

// User pages
import UserDashboard from "@/pages/user/dashboard";
import CasesPage from "@/pages/user/cases";
import NewCasePage from "@/pages/user/new-case";
import CaseDetailPage from "@/pages/user/case-detail";
import LawyersPage from "@/pages/user/lawyers";
import LawyerDetailPage from "@/pages/user/lawyer-detail";
import UserProfile from "@/pages/user/profile";

// Chat
import ChatListPage from "@/pages/chat/index";
import ChatRoomPage from "@/pages/chat/room";

// Lawyer pages
import LawyerDashboard from "@/pages/lawyer/dashboard";
import LawyerProfile from "@/pages/lawyer/profile";
import LawyerRequests from "@/pages/lawyer/requests";

// Admin pages
import AdminDashboard from "@/pages/admin/index";
import AdminLawyers from "@/pages/admin/lawyers";

// Shared
import NotificationsPage from "@/pages/notifications";

import VideoRoom from "@/pages/video-room";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000 },
  },
});

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found</p>
        <a href="/" className="mt-4 inline-block text-primary underline">Go home</a>
      </div>
    </div>
  );
}

// Wraps a page in AppLayout only when authenticated
function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  return <AppLayout>{children}</AppLayout>;
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup/user" component={SignupUserPage} />
      <Route path="/signup/lawyer" component={SignupLawyerPage} />

      {/* User */}
      <Route path="/dashboard">
        <ProtectedLayout><UserDashboard /></ProtectedLayout>
      </Route>
      <Route path="/cases">
        <ProtectedLayout><CasesPage /></ProtectedLayout>
      </Route>
      <Route path="/cases/new">
        <ProtectedLayout><NewCasePage /></ProtectedLayout>
      </Route>
      <Route path="/cases/:id">
        <ProtectedLayout><CaseDetailPage /></ProtectedLayout>
      </Route>
      <Route path="/lawyers">
        <ProtectedLayout><LawyersPage /></ProtectedLayout>
      </Route>
      <Route path="/lawyers/:id">
        <ProtectedLayout><LawyerDetailPage /></ProtectedLayout>
      </Route>
      <Route path="/profile">
        <ProtectedLayout><UserProfile /></ProtectedLayout>
      </Route>

      {/* Chat */}
      <Route path="/chat">
        <ProtectedLayout><ChatListPage /></ProtectedLayout>
      </Route>
      <Route path="/chat/:conversationId">
        <ProtectedLayout><ChatRoomPage /></ProtectedLayout>
      </Route>

      {/* Lawyer */}
      <Route path="/lawyer/dashboard">
        <ProtectedLayout><LawyerDashboard /></ProtectedLayout>
      </Route>
      <Route path="/lawyer/requests">
        <ProtectedLayout><LawyerRequests /></ProtectedLayout>
      </Route>
      <Route path="/lawyer/profile">
        <ProtectedLayout><LawyerProfile /></ProtectedLayout>
      </Route>

      {/* Admin */}
      <Route path="/admin">
        <ProtectedLayout><AdminDashboard /></ProtectedLayout>
      </Route>
      <Route path="/admin/lawyers">
        <ProtectedLayout><AdminLawyers /></ProtectedLayout>
      </Route>

      {/* Video Room - full screen, no layout chrome */}
      <Route path="/video/:roomCode">
        <ProtectedLayout><VideoRoom /></ProtectedLayout>
      </Route>
      <Route path="/video">
        <ProtectedLayout><VideoRoom /></ProtectedLayout>
      </Route>

      {/* Shared */}
      <Route path="/notifications">
        <ProtectedLayout><NotificationsPage /></ProtectedLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
