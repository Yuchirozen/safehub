import React, { useState, useEffect } from 'react';
import { subscribeAssistanceRequests, acceptAssistanceRequest, updateAssistanceStatus } from '../services/db';
import { useAuth } from '../context/AuthContext';
import type { AssistanceRequest, AssistanceCategory } from '../types';
import {
  Users,
  CheckCircle,
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  AlertTriangle,
  Play,
  CheckCheck,
  Flame,
  Accessibility,
  HeartHandshake,
  Filter
} from 'lucide-react';

export const HelpersPage: React.FC = () => {
  const { profile, updateProfileData } = useAuth();
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'my_active' | 'all'>('pending');
  const [isAvailable, setIsAvailable] = useState<boolean>(profile?.availableToHelp ?? true);
  const [actionSuccess, setActionSuccess] = useState<string>('');

  useEffect(() => {
    const unsub = subscribeAssistanceRequests(setRequests);
    return () => unsub();
  }, []);

  const handleToggleAvailability = async () => {
    const newVal = !isAvailable;
    setIsAvailable(newVal);
    await updateProfileData({ availableToHelp: newVal });
  };

  const handleAccept = async (request: AssistanceRequest) => {
    if (!profile) return;
    try {
      await acceptAssistanceRequest(request.id, profile.uid, profile.name, 'helper');
      setActionSuccess(`Accepted request for ${request.requesterName}!`);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to accept request');
    }
  };

  const handleUpdateStatus = async (requestId: string, status: AssistanceRequest['status']) => {
    try {
      await updateAssistanceStatus(requestId, status);
      setActionSuccess(`Ticket marked as ${status.replace('_', ' ')}!`);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;

    if (statusFilter === 'pending') {
      return r.status === 'pending';
    } else if (statusFilter === 'my_active') {
      return r.assignedHelperUid === profile?.uid && r.status !== 'resolved' && r.status !== 'cancelled';
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-safe-border pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/50">
            <HeartHandshake className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Community Helpers Hub</h1>
            <p className="text-sm text-gray-400">
              Coordinate citizen aid, assist vulnerable evacuees, and respond to neighborhood calls
            </p>
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="flex items-center gap-3 bg-safe-card p-2 rounded-xl border border-safe-border">
          <span className="text-xs font-semibold text-gray-300">Status:</span>
          <button
            onClick={handleToggleAvailability}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              isAvailable
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
            {isAvailable ? 'Active & Ready to Assist' : 'Currently Off-Duty'}
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter and Tab Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-safe-card border border-safe-border">
        {/* Status Mode Tabs */}
        <div className="flex items-center gap-2">
          {[
            { id: 'pending', label: 'Unassigned Dispatch Queue' },
            { id: 'my_active', label: 'My Accepted Missions' },
            { id: 'all', label: 'All History' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === tab.id
                  ? 'bg-safe-primary text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-safe-dark'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          {['all', 'elderly', 'mobility', 'wheelchair', 'injury', 'medical', 'general'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition ${
                filterCategory === cat
                  ? 'bg-safe-dark text-white border border-safe-border'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRequests.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-safe-card rounded-2xl border border-safe-border">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white">No Requests Pending</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto mt-1">
              There are no pending assistance requests in this category. Stay on-duty for new neighborhood alerts.
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isMine = req.assignedHelperUid === profile?.uid;
            const isCritical = req.priority === 'Critical';

            return (
              <div
                key={req.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition ${
                  isMine
                    ? 'bg-blue-950/20 border-blue-800'
                    : isCritical
                    ? 'bg-red-950/20 border-red-900/60'
                    : 'bg-safe-card border-safe-border hover:border-gray-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase border ${
                      isCritical
                        ? 'bg-red-950 text-red-400 border-red-800'
                        : req.priority === 'High'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-blue-950 text-blue-400 border-blue-800'
                    }`}>
                      {req.priority}
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      req.status === 'pending'
                        ? 'bg-amber-950/60 text-amber-400 border border-amber-800 animate-pulse'
                        : req.status === 'in_progress'
                        ? 'bg-blue-950/60 text-blue-400 border border-blue-800'
                        : req.status === 'resolved'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                        : 'bg-gray-800 text-gray-400'
                    }`}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white capitalize flex items-center gap-2">
                      {req.category === 'wheelchair' || req.category === 'mobility' ? (
                        <Accessibility className="w-4 h-4 text-purple-400" />
                      ) : req.category === 'injury' ? (
                        <Flame className="w-4 h-4 text-red-400" />
                      ) : (
                        <Users className="w-4 h-4 text-emerald-400" />
                      )}
                      {req.category} Assistance
                    </h3>
                    <div className="text-xs text-gray-400 mt-1">
                      Requester: <strong className="text-gray-200">{req.requesterName}</strong>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-300 bg-safe-dark/60 p-3 rounded-xl border border-safe-border/50">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{req.approximateLocation}</span>
                    </div>
                    {req.requesterPhone && isMine && (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-mono pt-1">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <a href={`tel:${req.requesterPhone}`} className="hover:underline">
                          {req.requesterPhone}
                        </a>
                      </div>
                    )}
                  </div>

                  {req.notes && (
                    <p className="text-xs text-gray-300 italic bg-safe-dark/30 p-2.5 rounded-lg border border-safe-border/30">
                      "{req.notes}"
                    </p>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-safe-border">
                  {req.status === 'pending' ? (
                    <button
                      onClick={() => handleAccept(req)}
                      disabled={!isAvailable}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md shadow-emerald-950/30 flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Accept & Respond
                    </button>
                  ) : isMine && req.status === 'assigned' ? (
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'in_progress')}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center justify-center gap-2 text-xs"
                    >
                      <Play className="w-4 h-4" />
                      Start Responding (En Route)
                    </button>
                  ) : isMine && req.status === 'in_progress' ? (
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'resolved')}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center justify-center gap-2 text-xs"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Mark Mission Resolved
                    </button>
                  ) : (
                    <div className="text-center text-xs text-gray-500 font-medium">
                      Assigned to {req.assignedHelperName || 'Another Responder'}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Helper Safety Guidelines */}
      <div className="p-6 rounded-2xl bg-safe-card border border-safe-border space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Community Helper Field Safety Protocol
        </h3>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-400">
          <li className="bg-safe-dark p-3 rounded-xl border border-safe-border">
            <strong className="text-white block mb-1">1. Never Enter Fast Water</strong>
            Do not wade into fast-flowing water deeper than 15 cm. Flash currents carry debris and wash out ground.
          </li>
          <li className="bg-safe-dark p-3 rounded-xl border border-safe-border">
            <strong className="text-white block mb-1">2. Keep Rescue Informed</strong>
            If an evacuee requires medical stretcher extraction or boat transport, escalate to Rescue Teams immediately.
          </li>
          <li className="bg-safe-dark p-3 rounded-xl border border-safe-border">
            <strong className="text-white block mb-1">3. Buddy System</strong>
            Always respond in pairs when assisting bedridden or wheelchair evacuees in multi-story residential blocks.
          </li>
        </ul>
      </div>
    </div>
  );
};
