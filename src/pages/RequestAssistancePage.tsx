import React, { useState, useEffect } from 'react';
import { subscribeAssistanceRequests, createAssistanceRequest, updateAssistanceStatus } from '../services/db';
import { useAuth } from '../context/AuthContext';
import type { AssistanceRequest, AssistanceCategory, AssistancePriority } from '../types';
import {
  HandHeart,
  Accessibility,
  Flame,
  AlertCircle,
  MapPin,
  Clock,
  CheckCircle2,
  Shield,
  UserCheck,
  Send,
  XCircle,
  HelpCircle
} from 'lucide-react';

export const RequestAssistancePage: React.FC = () => {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Form fields
  const [category, setCategory] = useState<AssistanceCategory>(
    profile?.role === 'vulnerable_evacuee' ? 'wheelchair' : 'general'
  );
  const [priority, setPriority] = useState<AssistancePriority>('High');
  const [approximateLocation, setApproximateLocation] = useState<string>('Near Indiranagar Metro Station');
  const [notes, setNotes] = useState<string>('');
  const [locationConsent, setLocationConsent] = useState<boolean>(true);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>({
    lat: 12.9716,
    lng: 77.5946
  });

  useEffect(() => {
    const unsub = subscribeAssistanceRequests(setRequests);
    return () => unsub();
  }, []);

  const handleAcquireLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setApproximateLocation(`Coordinates: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        () => {
          setErrorMessage('Unable to get GPS location. Please type your nearest landmark manually.');
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      setErrorMessage('Please sign in or select a demo role to submit a request.');
      return;
    }
    if (!approximateLocation.trim()) {
      setErrorMessage('Please enter your approximate location or nearest landmark.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await createAssistanceRequest({
        requesterUid: profile.uid,
        requesterName: profile.name,
        requesterPhone: profile.phone || '+91 98450 00000',
        category,
        priority,
        locationSharingConsent: locationConsent,
        coordinates: locationConsent ? coordinates : undefined,
        approximateLocation,
        notes
      });

      setSuccessMessage('Assistance request dispatched! Nearby helpers and rescue dispatchers have been alerted.');
      setNotes('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (window.confirm('Are you sure you want to cancel this assistance request?')) {
      await updateAssistanceStatus(requestId, 'cancelled');
    }
  };

  // Filter user's own requests
  const myRequests = requests.filter((r) => r.requesterUid === profile?.uid);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-safe-border pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-safe-card border border-safe-border">
            <HandHeart className="w-6 h-6 text-safe-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Request Emergency Assistance</h1>
            <p className="text-sm text-gray-400">
              Direct dispatch to verified community helpers and rescue response units
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-safe-card border border-safe-border space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-safe-primary" />
              Dispatch Assistance Ticket
            </h2>

            {successMessage && (
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Assistance Category */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Assistance Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'elderly', label: 'Elderly Support', icon: UserCheck },
                  { id: 'mobility', label: 'Mobility Impaired', icon: Accessibility },
                  { id: 'wheelchair', label: 'Wheelchair / Bedridden', icon: Accessibility },
                  { id: 'injury', label: 'Trauma / Injury', icon: Flame },
                  { id: 'medical', label: 'Medical / Meds', icon: Shield },
                  { id: 'general', label: 'General Evac Aid', icon: HandHeart }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategory(item.id as AssistanceCategory)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col gap-1.5 ${
                        category === item.id
                          ? 'bg-safe-dark border-safe-primary text-white shadow-sm'
                          : 'bg-safe-dark/40 border-safe-border text-gray-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-safe-primary" />
                      <span className="text-xs font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Level */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Urgency / Priority
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { level: 'Normal', desc: 'Can wait 1-2 hours', color: 'border-blue-700 text-blue-400' },
                  { level: 'High', desc: 'Urgent evac required', color: 'border-amber-700 text-amber-400' },
                  { level: 'Critical', desc: 'Life safety risk', color: 'border-red-700 text-red-400' }
                ].map((item) => (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setPriority(item.level as AssistancePriority)}
                    className={`p-3 rounded-xl border text-center transition ${
                      priority === item.level
                        ? `bg-safe-dark ${item.color} font-bold shadow-md`
                        : 'bg-safe-dark/40 border-safe-border text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="text-sm font-bold">{item.level}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Location Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Location / Address / Landmark
                </label>
                <button
                  type="button"
                  onClick={handleAcquireLocation}
                  className="text-xs text-safe-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  Auto-detect GPS
                </button>
              </div>
              <input
                type="text"
                value={approximateLocation}
                onChange={(e) => setApproximateLocation(e.target.value)}
                placeholder="e.g. 2nd Floor, Apt 304, Opposite Trinity Church"
                className="w-full bg-safe-dark border border-safe-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-safe-primary"
                required
              />
            </div>

            {/* Additional details */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Specific Needs & Health Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Mention oxygen requirements, wheelchair size, children count, or water depth around house..."
                className="w-full bg-safe-dark border border-safe-border rounded-xl p-3 text-sm text-white focus:outline-none focus:border-safe-primary resize-none"
              />
            </div>

            {/* Location Consent Checkbox */}
            <div className="p-3.5 rounded-xl bg-safe-dark border border-safe-border space-y-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={locationConsent}
                  onChange={(e) => setLocationConsent(e.target.checked)}
                  className="mt-1 rounded border-gray-700 text-safe-primary focus:ring-0"
                />
                <div className="text-xs text-gray-300">
                  <span className="font-bold text-white">Location Sharing Consent:</span> I consent to sharing my approximate location with vetted community helpers and official rescue teams for evacuation coordination.
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-safe-primary hover:bg-red-700 transition shadow-lg shadow-red-950/30 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Broadcasting Request...' : 'Dispatch Assistance Request'}
            </button>
          </form>
        </div>

        {/* Right Panel: Active Requests Tracker (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-safe-card border border-safe-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-safe-primary" />
                My Active Requests
              </h3>
              <span className="text-xs font-mono text-gray-400">{myRequests.length} active</span>
            </div>

            {myRequests.length === 0 ? (
              <div className="text-center py-12 bg-safe-dark/40 rounded-xl border border-safe-border/50 text-xs text-gray-400 space-y-2">
                <HelpCircle className="w-8 h-8 text-gray-500 mx-auto" />
                <p>You have no pending requests.</p>
                <p className="text-[11px] text-gray-500">Fill the dispatch form on the left if you require assistance.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myRequests.map((req) => {
                  const isAssigned = req.status === 'assigned' || req.status === 'in_progress';
                  const isResolved = req.status === 'resolved';

                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl bg-safe-dark border border-safe-border space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              req.priority === 'Critical'
                                ? 'bg-red-950 text-red-400 border-red-800'
                                : 'bg-amber-950 text-amber-300 border-amber-800'
                            }`}>
                              {req.priority}
                            </span>
                            <span className="text-xs font-bold text-white capitalize">
                              {req.category} Assistance
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                            {req.approximateLocation}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full capitalize ${
                          req.status === 'pending'
                            ? 'bg-amber-950/70 text-amber-300 border border-amber-800 animate-pulse'
                            : isAssigned
                            ? 'bg-blue-950/70 text-blue-300 border border-blue-800'
                            : isResolved
                            ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800'
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                          {req.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Helper Info if Assigned */}
                      {isAssigned && req.assignedHelperName && (
                        <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-900/40 text-xs space-y-1">
                          <div className="text-blue-300 font-semibold flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-blue-400" />
                            Assigned Responder: {req.assignedHelperName}
                          </div>
                          <div className="text-gray-300">
                            Unit Type: <span className="capitalize">{req.assignedType || 'Community Helper'}</span>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {req.notes && (
                        <p className="text-xs text-gray-300 bg-safe-card/50 p-2.5 rounded-lg border border-safe-border/50 italic">
                          "{req.notes}"
                        </p>
                      )}

                      {/* Cancel Action */}
                      {req.status === 'pending' && (
                        <div className="pt-2 border-t border-safe-border/40 flex justify-end">
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancel Request
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
