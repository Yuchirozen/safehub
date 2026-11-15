import React, { useState, useEffect } from 'react';
import { subscribeAlerts, acknowledgeAlert } from '../services/db';
import { useAuth } from '../context/AuthContext';
import type { Alert, AlertCategory, AlertSeverity } from '../types';
import {
  AlertTriangle,
  Flame,
  Droplets,
  HeartPulse,
  Home,
  ShieldAlert,
  CheckCircle2,
  Clock,
  MapPin,
  Filter,
  Volume2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const LiveAlerts: React.FC = () => {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeAlerts((data) => {
      setAlerts(data);
    });
    return () => unsub();
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    if (!profile) return;
    await acknowledgeAlert(alertId, profile.uid);
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filterCategory !== 'all' && alert.category !== filterCategory) return false;
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
    return true;
  });

  const getCategoryIcon = (category: AlertCategory) => {
    switch (category) {
      case 'flood':
        return <Droplets className="w-5 h-5 text-blue-400" />;
      case 'shelter_full':
        return <Home className="w-5 h-5 text-amber-400" />;
      case 'sos':
        return <Flame className="w-5 h-5 text-red-500" />;
      case 'medical':
        return <HeartPulse className="w-5 h-5 text-pink-400" />;
      case 'resource_critical':
        return <AlertTriangle className="w-5 h-5 text-orange-400" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-950/80 text-red-400 border border-red-800/80 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            CRITICAL
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/70 text-amber-300 border border-amber-800/60">
            HIGH
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
            NORMAL
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-safe-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-800/50">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Live Emergency Alerts</h1>
              <p className="text-sm text-gray-400">
                Real-time official broadcast bulletins, sensor triggers, and emergency warnings
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border transition ${
              soundEnabled
                ? 'bg-safe-card text-emerald-400 border-emerald-800'
                : 'bg-safe-card text-gray-400 border-safe-border hover:border-gray-600'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            {soundEnabled ? 'Alert Chime: ON' : 'Alert Chime: Muted'}
          </button>
          <div className="px-3 py-2 rounded-lg bg-safe-card border border-safe-border text-xs text-gray-400">
            Active Alerts: <span className="text-white font-bold">{filteredAlerts.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-safe-card border border-safe-border">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Filter By:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Pills */}
          <div className="flex items-center gap-1 bg-safe-dark p-1 rounded-lg border border-safe-border text-xs">
            {['all', 'flood', 'shelter_full', 'sos', 'medical', 'resource_critical'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  filterCategory === cat
                    ? 'bg-red-700 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-safe-card'
                }`}
              >
                {cat === 'all'
                  ? 'All Categories'
                  : cat === 'shelter_full'
                  ? 'Shelter Full'
                  : cat === 'resource_critical'
                  ? 'Resources'
                  : cat.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Severity Pills */}
          <div className="flex items-center gap-1 bg-safe-dark p-1 rounded-lg border border-safe-border text-xs">
            {['all', 'Critical', 'High', 'Normal'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  filterSeverity === sev
                    ? 'bg-amber-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-safe-card'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alert Feed */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-16 bg-safe-card rounded-2xl border border-safe-border">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white">No Active Alerts</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto mt-1">
              There are currently no active alerts matching your filters. Stay vigilant and monitor updates.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const hasAcknowledged = profile && alert.acknowledgedBy?.includes(profile.uid);
            const isCritical = alert.severity === 'Critical';

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isCritical
                    ? 'bg-red-950/20 border-red-900/60 shadow-lg shadow-red-950/20'
                    : 'bg-safe-card border-safe-border hover:border-gray-700'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl border ${
                        isCritical
                          ? 'bg-red-900/40 border-red-800 text-red-400'
                          : 'bg-safe-dark border-safe-border text-gray-300'
                      }`}
                    >
                      {getCategoryIcon(alert.category)}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {getSeverityBadge(alert.severity)}
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-mono">
                          {alert.category.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(alert.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-white tracking-tight">{alert.title}</h3>
                      <p className="text-sm text-gray-300 leading-relaxed">{alert.description}</p>

                      <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-gray-400">
                        {alert.affectedArea && (
                          <div className="flex items-center gap-1 text-gray-300">
                            <MapPin className="w-3.5 h-3.5 text-red-400" />
                            <span>{alert.affectedArea}</span>
                          </div>
                        )}
                        {alert.relatedShelterId && (
                          <Link
                            to={`/shelters/${alert.relatedShelterId}`}
                            className="text-safe-primary hover:underline font-medium"
                          >
                            View Affected Shelter →
                          </Link>
                        )}
                        {alert.acknowledgedBy && alert.acknowledgedBy.length > 0 && (
                          <span className="text-gray-500">
                            Acknowledged by {alert.acknowledgedBy.length} responder(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-safe-border">
                    {profile && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        disabled={hasAcknowledged}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                          hasAcknowledged
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800 cursor-default'
                            : 'bg-safe-dark hover:bg-safe-card text-gray-200 border border-safe-border hover:border-gray-600'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {hasAcknowledged ? 'Acknowledged' : 'Acknowledge'}
                      </button>
                    )}

                    <Link
                      to="/evacuation-guidance"
                      className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition"
                    >
                      Evacuation Advice →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Protocol Banner */}
      <div className="p-4 rounded-xl bg-safe-dark border border-safe-border text-xs text-gray-400 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-gray-200">Official Warning Protocol:</span> Alerts are generated automatically from certified IoT water-level sensors and authorized disaster operations officers. In case of life threat, press the SOS button or contact 112 immediately.
        </div>
      </div>
    </div>
  );
};
