import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Home, Briefcase, Users, MessageSquare, User,
  LogOut, Bell, Shield, LayoutDashboard, Gavel, FileText, Video, CheckCircle2, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getNotifications } from "@/services/api";
import { useVideoCallQueue } from "@/hooks/use-video-call-queue";
import { useRealtimeEvent } from "@/hooks/use-realtime";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const videoQueue = useVideoCallQueue();

  useEffect(() => {
    if (!user) return;
    getNotifications()
      .then((res) => setUnreadCount(res?.unreadCount || 0))
      .catch(() => {});
  }, [user, location]);
  useRealtimeEvent("new_notification", () => {
    getNotifications().then((res) => setUnreadCount(res?.unreadCount || 0)).catch(() => {});
  });

  let navItems: NavItem[] = [];

  if (user?.role === 'user') {
    navItems = [
      { label: 'Dashboard', href: '/dashboard', icon: Home },
      { label: 'My Cases', href: '/cases', icon: Briefcase },
      { label: 'Find Lawyers', href: '/lawyers', icon: Users },
      { label: 'Messages', href: '/chat', icon: MessageSquare },
      { label: 'Profile', href: '/profile', icon: User },
    ];
  } else if (user?.role === 'lawyer') {
    navItems = [
      { label: 'Dashboard', href: '/lawyer/dashboard', icon: Home },
      { label: 'Requests', href: '/lawyer/requests', icon: FileText },
      { label: 'Messages', href: '/chat', icon: MessageSquare },
      { label: 'Profile', href: '/lawyer/profile', icon: User },
    ];
  } else if (user?.role === 'admin') {
    navItems = [
      { label: 'Overview', href: '/admin', icon: LayoutDashboard },
      { label: 'Lawyers', href: '/admin/lawyers', icon: Gavel },
    ];
  }

  const isActive = (href: string) =>
    href === '/dashboard' || href === '/admin' || href === '/lawyer/dashboard'
      ? location === href
      : location === href || location.startsWith(href + '/');

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-full bg-card border-r border-border z-20 shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Shield size={18} />
          </div>
          <span className="font-display font-bold text-xl text-primary">LawTalk</span>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <Link
            href="/notifications"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 relative",
              isActive('/notifications')
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            )}
          >
            <Bell size={20} />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-auto bg-destructive text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-xl font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-background/80 backdrop-blur-md border-b border-border/50 z-10 shrink-0">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 md:hidden">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Shield size={18} />
            </div>
            <span className="font-display font-bold text-lg text-primary">LawTalk</span>
          </div>

          {/* Desktop page title */}
          <div className="hidden md:block">
            <h1 className="font-display font-bold text-lg capitalize">
              {navItems.find(n => isActive(n.href))?.label || 'LawTalk'}
            </h1>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <Link href="/notifications" className="relative p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
              )}
            </Link>
            <button
              onClick={logout}
              className="md:hidden p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
            <div className="flex items-center gap-3 pl-3 border-l border-border">
              <div className="w-9 h-9 rounded-full bg-secondary overflow-hidden border border-border shrink-0">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground font-bold text-sm">
                    {user?.name?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="hidden sm:block text-sm">
                <p className="font-semibold text-foreground leading-none">{user?.name}</p>
                <p className="text-muted-foreground text-xs capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Video Call Request Popup — persists across all pages for lawyers */}
      {user?.role === "lawyer" && videoQueue.videoRequests.length > 0 && (() => {
        const req = videoQueue.videoRequests[0]!;
        return (
          <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[100] w-80 shadow-2xl">
            <div className="bg-card border-2 border-amber-300 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-amber-50 px-4 py-3 flex items-center gap-2 border-b border-amber-200">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <Video size={15} className="text-amber-600" />
                <span className="text-sm font-bold text-amber-800">Incoming Video Request</span>
                {videoQueue.videoRequests.length > 1 && (
                  <span className="ml-auto text-xs bg-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                    +{videoQueue.videoRequests.length - 1} more
                  </span>
                )}
              </div>
              {/* Body */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                    {req.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{req.userName}</p>
                    <p className="text-xs text-muted-foreground">wants to join a video conference</p>
                  </div>
                </div>
                <textarea
                  rows={2}
                  placeholder='Reply (e.g. "We will reschedule to 5pm today")'
                  value={videoQueue.replyMessages[req.socketId] || ""}
                  onChange={e =>
                    videoQueue.setReplyMessages(prev => ({ ...prev, [req.socketId]: e.target.value }))
                  }
                  className="w-full rounded-xl border border-border px-3 py-2 text-xs bg-background focus:outline-none focus:border-primary resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => videoQueue.respond(req.socketId, false)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-destructive/40 text-destructive hover:bg-destructive hover:text-white text-xs font-semibold transition-colors"
                  >
                    <XCircle size={13} /> Decline
                  </button>
                  <Link href={`/video/${videoQueue.lawyerCode}`}>
                    <button
                      onClick={() => videoQueue.respond(req.socketId, true)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                    >
                      <CheckCircle2 size={13} /> Accept & Join
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around items-center h-16 px-2 z-50">
        {[...navItems.slice(0, 4), { label: 'Alerts', href: '/notifications', icon: Bell }].map((item) => {
          const active = isActive(item.href);
          const isBell = item.href === '/notifications';
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors relative",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn("p-1 rounded-xl transition-all duration-300 relative", active ? "bg-primary/10" : "")}>
                <item.icon size={22} />
                {isBell && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full border border-card" />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
