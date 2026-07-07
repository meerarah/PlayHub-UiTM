import { useEffect, useState } from "react";
import { X, Bell, Calendar, Info, CheckCircle2, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import { api } from "../lib/api";

export default function NotificationsSheet({ isOpen, onClose }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !isOpen) return;

    const loadNotifications = async () => {
      setLoading(true);
      try {
        const data = await api.getNotifications(user.uid);
        setNotifications(data);
      } catch (error) {
        console.error("Error loading notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [user, isOpen]);

  const markAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    
    try {
      await api.markAllNotificationsRead(user.uid);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'booking': return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'event': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      default: return <Info className="w-5 h-5 text-purple-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="relative w-screen max-w-md animate-in slide-in-from-right duration-300 ease-out">
          <div className="h-full flex flex-col bg-white shadow-2xl rounded-l-[40px] overflow-hidden">
            
            {/* Header */}
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Notifications</h2>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Updates & Alerts</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:bg-white hover:text-slate-600 rounded-xl transition-all shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Actions Bar */}
            {notifications.length > 0 && (
              <div className="px-8 py-3 bg-white border-b border-slate-50 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">
                  {notifications.filter(n => !n.isRead).length} Unread
                </span>
                <button 
                  onClick={markAllAsRead}
                  className="text-xs font-black text-blue-600 hover:underline"
                >
                  Mark all as read
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-slate-400 font-bold text-sm">Loading your updates...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-8">
                  <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-300">
                    <Bell className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">All caught up!</h3>
                    <p className="text-sm text-slate-400 mt-2">No new notifications at the moment. We'll alert you when something happens.</p>
                  </div>
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id}
                    className={cn(
                      "group relative p-5 rounded-3xl border transition-all duration-300",
                      n.isRead 
                        ? "bg-white border-slate-50 opacity-75" 
                        : "bg-blue-50/30 border-blue-100 shadow-sm ring-1 ring-blue-500/5"
                    )}
                    onClick={() => !n.isRead && markAsRead(n.id)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={cn(
                        "p-3 rounded-2xl flex-shrink-0 transition-transform group-hover:scale-110",
                        n.isRead ? "bg-slate-50 text-slate-400" : "bg-white text-blue-600 shadow-sm"
                      )}>
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex justify-between items-start">
                          <h4 className={cn(
                            "font-bold text-sm leading-tight",
                            n.isRead ? "text-slate-600" : "text-slate-900"
                          )}>
                            {n.title}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {n.message}
                        </p>
                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-2 block">
                          {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                    
                    {/* Unread Dot */}
                    {!n.isRead && (
                      <div className="absolute top-5 right-5 w-2 h-2 bg-blue-600 rounded-full shadow-sm shadow-blue-500/50" />
                    )}

                    {/* Delete Icon - only show on hover or for read messages */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                      className="absolute top-12 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-8 bg-slate-50/50 border-t border-slate-50">
              <button 
                onClick={onClose}
                className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
