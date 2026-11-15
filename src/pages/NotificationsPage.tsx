import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeNotifications, markNotificationRead } from '../services/db';
import type { AppNotification } from '../types';
import {
  Bell,
  BellOff,
  AlertTriangle,
  Droplets,
  Building2,
  HeartPulse,
  HandHelping,
  Check,
  CheckCheck,
  Filter,
  Inbox,
  Clock,
  ShieldAlert
} from 'lucide-react';

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  flood_alert: {
    icon: <Droplets className="w-4 h-4" />,
    color: 'text-blue-400 bg-blue-950 border-blue-800',
    label: 'Flood Alert'
  },
  sos_alert: {
    icon: <ShieldAlert className="w-4 h-4" />,
    color: 'text-red-400 bg-red-950 border-red-800',
    label: 'SOS Alert'
  },
  shelter_full: {
    icon: <Building2 className="w-4 h-4" />,
    color: 'text-amber-400 bg-amber-950 border-amber-800',
    label: 'Shelter Full'
  },
  assistance_accepted: {
    icon: <HandHelping className="w-4 h-4" />,
    color: 'text-emerald-400 bg-emerald-950 border-emerald-800',
    label: 'Help Assigned'
  },
  request_assigned: {
    icon: <HandHelping className="w-4 h-4" />,
    color: 'text-cyan-400 bg-cyan-950 border-cyan-800',
    label: 'Request Update'
  },
  resource_low: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-orange-400 bg-orange-950 border-orange-800',
    label: 'Resource Low'
  }
};

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type FilterType = 'all' | 'unread' | 'flood_alert' | 'sos_alert' | 'shelter_full' | 'assistance_accepted';

export const NotificationsPage: React.FC = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeNotifications(
      profile.uid,
      profile.role,
      setNotifications
    );
    return () => unsub();
  }, [profile]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await markNotificationRead(n.id);
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-safe-card border border-safe-border">
            <Bell className="w-6 h-6 text-safe-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Notifications</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'All caught up'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-safe-card border border-safe-border text-xs text-gray-300 hover:text-white hover:border-safe-primary/50 transition"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { key: 'all', label: 'All' },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'flood_alert', label: 'Flood' },
          { key: 'sos_alert', label: 'SOS' },
          { key: 'shelter_full', label: 'Shelter' },
          { key: 'assistance_accepted', label: 'Help' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as FilterType)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
              filter === f.key
                ? 'bg-safe-primary/20 border-safe-primary text-safe-primary'
                : 'bg-safe-card border-safe-border text-gray-400 hover:text-white hover:border-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="inline-flex p-4 rounded-full bg-safe-card border border-safe-border">
            {filter === 'unread' ? (
              <CheckCheck className="w-8 h-8 text-emerald-500" />
            ) : (
              <Inbox className="w-8 h-8 text-gray-500" />
            )}
          </div>
          <p className="text-sm text-gray-400">
            {filter === 'unread'
              ? 'No unread notifications'
              : `No ${filter === 'all' ? '' : filter.replace('_', ' ') + ' '}notifications`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(notif => {
            const config = typeConfig[notif.type] || typeConfig.sos_alert;
            return (
              <div
                key={notif.id}
                className={`group p-4 rounded-xl border transition ${
                  notif.read
                    ? 'bg-safe-card/50 border-safe-border/50'
                    : 'bg-safe-card border-safe-border shadow-lg shadow-black/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg border shrink-0 ${config.color}`}>
                    {config.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${config.color}`}
                      >
                        {config.label}
                      </span>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-safe-primary animate-pulse" />
                      )}
                    </div>
                    <h3 className={`text-sm font-bold ${notif.read ? 'text-gray-400' : 'text-white'}`}>
                      {notif.title}
                    </h3>
                    <p className={`text-xs mt-1 leading-relaxed ${notif.read ? 'text-gray-500' : 'text-gray-300'}`}>
                      {notif.body}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  {!notif.read && (
                    <button
                      onClick={() => handleMarkRead(notif.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-emerald-950/50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
