import { useEffect, useState } from "react";
import { Bell, CheckCheck, Info, ShieldCheck, MessageSquare, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getNotifications, markNotificationRead } from "@/services/api";
import { formatTimeAgo } from "@/lib/utils";

const iconMap: Record<string, any> = {
  approval: ShieldCheck,
  message: MessageSquare,
  case: FileText,
  default: Info,
};

const NotificationsPage = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = () => {
    getNotifications()
      .then((res) => setData(res))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkRead = async (id: number) => {
    await markNotificationRead(id);
    fetchNotifications();
  };

  const notifications = data?.notifications || [];
  const unread = notifications.filter((n: any) => !n.isRead);

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unread.length > 0 ? `${unread.length} unread notification${unread.length > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={async () => {
            await Promise.all(unread.map((n: any) => markNotificationRead(n.id)));
            fetchNotifications();
          }}>
            <CheckCheck size={16} /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Card key={i} className="h-20 animate-pulse bg-secondary/30" />)}
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((n: any) => {
            const Icon = iconMap[n.type] || iconMap.default;
            return (
              <Card
                key={n.id}
                className={`transition-all ${!n.isRead ? 'border-primary/30 bg-primary/5' : ''}`}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!n.isRead ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-semibold text-sm ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTimeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="shrink-0 w-2 h-2 rounded-full bg-primary mt-2"
                      title="Mark as read"
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
            <Bell size={32} />
          </div>
          <h3 className="text-xl font-bold font-display">No notifications</h3>
          <p className="text-muted-foreground mt-2 max-w-xs">You're all caught up. Notifications about your cases and requests will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
