import React, { useState } from 'react';
import { AlertTriangle, Phone, MapPin, X, CheckCircle, ShieldAlert, Send } from 'lucide-react';
import { createAssistanceRequest, createAlert } from '../services/db';
import { useAuth } from '../context/AuthContext';
import type { AssistanceCategory } from '../types';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  shelterId?: string;
}

export const SosModal: React.FC<SosModalProps> = ({ isOpen, onClose, shelterId }) => {
  const { profile } = useAuth();
  const [category, setCategory] = useState<AssistanceCategory>('general');
  const [notes, setNotes] = useState<string>('');
  const [shareLocation, setShareLocation] = useState<boolean>(true);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [approxLocation, setApproxLocation] = useState<string>('Near Current GPS Location');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setApproxLocation(`GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        },
        (err) => {
          console.warn('Geolocation denied or failed:', err);
          // Fallback to reference coordinates
          setCoordinates({ lat: 12.9716, lng: 77.5946 });
          setApproxLocation('Sector 4, Central District (Default Coordinates)');
        }
      );
    }
  };

  const handleSubmitSos = async () => {
    setIsSubmitting(true);
    try {
      const requesterUid = profile?.uid || 'anonymous_evacuee_' + Date.now();
      const requesterName = profile?.name || 'Emergency Evacuee';
      const requesterPhone = profile?.phone || '+91 98450 12345';
      const targetCoords = shareLocation && coordinates ? coordinates : { lat: 12.9716, lng: 77.5946 };
      const locationText = approxLocation && approxLocation !== 'Detecting location...'
        ? approxLocation
        : 'Indiranagar / MG Road Metro Grid, Bangalore';

      // 1. DISPATCH TO TELEGRAM BOT & N8N FIRST (High Priority Fast Path)
      try {
        await fetch('/api/webhook/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requesterName,
            requesterPhone,
            category,
            priority: 'Critical',
            approximateLocation: locationText,
            coordinates: targetCoords,
            notes: notes || 'EMERGENCY SOS: Evacuee urgently requires immediate rescue team dispatch',
            shelterId
          })
        });
      } catch (webhookErr) {
        console.warn('Telegram webhook dispatch error:', webhookErr);
      }

      // 2. Broadcast to In-App Local & Remote Firestore Storage (Non-blocking)
      createAssistanceRequest({
        requesterUid,
        requesterName,
        requesterPhone,
        category,
        priority: 'Critical',
        locationSharingConsent: shareLocation,
        coordinates: targetCoords,
        approximateLocation: locationText,
        notes: notes || 'EMERGENCY SOS: Evacuee urgently requires immediate rescue team dispatch'
      }).catch(console.warn);

      createAlert({
        category: 'sos',
        severity: 'Critical',
        title: `EMERGENCY SOS DISPATCHED: ${category.toUpperCase()}`,
        description: `Urgent rescue needed for ${requesterName} at ${locationText}. ${notes ? `Notes: ${notes}` : ''}`,
        affectedArea: locationText,
        relatedShelterId: shelterId,
        recipients: ['rescue_team', 'all']
      }).catch(console.warn);

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2500);
    } catch (err) {
      console.error('Error submitting SOS:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-red-600 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl shadow-red-950/70 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-red-600/20 text-red-500 border border-red-500/40 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white">EMERGENCY SOS DISPATCHED</h3>
            <p className="text-sm text-slate-300">
              Rescue teams and local emergency helpers have been alerted with your coordinates and status.
            </p>
            <p className="text-xs text-amber-400 font-semibold">
              Please stay in a safe high location and keep your phone line open.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-600 text-white rounded-xl">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">EMERGENCY SOS DISPATCH</h3>
                <p className="text-xs text-red-400 font-medium">Connects directly to active rescue teams</p>
              </div>
            </div>

            {/* Direct 112 Phone Call banner */}
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-red-200">Immediate Life Threat?</div>
                <div className="text-[11px] text-red-300">Call national emergency services directly</div>
              </div>
              <a
                href="tel:112"
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow"
              >
                <Phone className="w-3.5 h-3.5" /> Call 112
              </a>
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Emergency Situation Type:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'general', label: 'Flood Trapped / Rising Water' },
                  { id: 'injury', label: 'Critical Injury / Trauma' },
                  { id: 'elderly', label: 'Elderly Evacuation' },
                  { id: 'wheelchair', label: 'Wheelchair / Bedridden' },
                  { id: 'medical', label: 'Medical Emergency' },
                  { id: 'mobility', label: 'Unable to Walk' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id as AssistanceCategory)}
                    className={`p-2 rounded-lg border text-left font-medium transition ${
                      category === item.id
                        ? 'bg-red-600/20 border-red-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes / Details */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Describe your exact location or situation:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 2nd floor, water entering ground level, 2 adults, 1 senior"
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Location Sharing Consent */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-200">
                <input
                  type="checkbox"
                  checked={shareLocation}
                  onChange={(e) => {
                    setShareLocation(e.target.checked);
                    if (e.target.checked && !coordinates) handleFetchLocation();
                  }}
                  className="rounded border-slate-700 text-red-600 focus:ring-red-500"
                />
                Share my GPS coordinates with rescue units
              </label>

              {shareLocation && (
                <div className="flex items-center justify-between text-[11px] text-slate-400 pl-5">
                  <span className="truncate">{approxLocation}</span>
                  <button
                    type="button"
                    onClick={handleFetchLocation}
                    className="text-sky-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <MapPin className="w-3 h-3" /> Update GPS
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmitSos}
              disabled={isSubmitting}
              className="w-full py-3 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-950/80 border border-red-400"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'DISPATCHING TO RESCUE TEAMS...' : 'SEND EMERGENCY SOS NOW'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
