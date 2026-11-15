import React, { useState, useEffect } from 'react';
import {
  subscribeMedicalVolunteers,
  subscribeShelters,
  subscribeAssistanceRequests,
  registerMedicalVolunteer,
  updateMedicalAvailability,
  acceptAssistanceRequest,
  updateAssistanceStatus
} from '../services/db';
import { useAuth } from '../context/AuthContext';
import type { MedicalVolunteer, Shelter, AssistanceRequest } from '../types';
import {
  HeartPulse,
  Stethoscope,
  ShieldCheck,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Calendar,
  Building,
  User,
  Activity,
  Flame,
  Phone
} from 'lucide-react';

export const MedicalHelpPage: React.FC = () => {
  const { profile } = useAuth();
  const [volunteers, setVolunteers] = useState<MedicalVolunteer[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);

  // Doctor state
  const isDoctor = profile?.role === 'doctor';
  const myVolunteerProfile = volunteers.find((v) => v.id === profile?.uid);

  const [licenseNumber, setLicenseNumber] = useState<string>('KMC-2018-84729');
  const [specialty, setSpecialty] = useState<string>('Emergency Medicine & Trauma');
  const [selectedShelterId, setSelectedShelterId] = useState<string>('shelter_koramangala');
  const [isOnDuty, setIsOnDuty] = useState<boolean>(myVolunteerProfile?.isAvailable ?? true);
  const [dutyExpiresInMinutes, setDutyExpiresInMinutes] = useState<number>(240); // 4 hours
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    const unsubVols = subscribeMedicalVolunteers(setVolunteers);
    const unsubShelters = subscribeShelters(setShelters);
    const unsubReqs = subscribeAssistanceRequests(setRequests);

    return () => {
      unsubVols();
      unsubShelters();
      unsubReqs();
    };
  }, []);

  // Update countdown timer for 4h auto expiration
  useEffect(() => {
    if (!myVolunteerProfile || !myVolunteerProfile.isAvailable) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const leftMs = Math.max(0, myVolunteerProfile.availabilityExpiresAt - now);
      setDutyExpiresInMinutes(Math.round(leftMs / (60 * 1000)));
    }, 60000);
    return () => clearInterval(interval);
  }, [myVolunteerProfile]);

  const handleRegisterDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      await registerMedicalVolunteer({
        id: profile.uid,
        name: profile.name,
        email: profile.email,
        medicalLicenseNumber: licenseNumber,
        specialty,
        shelterId: selectedShelterId,
        isAvailable: true,
        verificationStatus: 'verified',
        lastConfirmedAt: Date.now(),
        availabilityExpiresAt: Date.now() + 4 * 60 * 60 * 1000,
        contactPhone: profile.phone || '+91 98450 11223'
      });
      setSuccessMsg('Medical Volunteer Profile submitted & activated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    }
  };

  const handleToggleDuty = async () => {
    if (!profile) return;
    const nextVal = !isOnDuty;
    setIsOnDuty(nextVal);
    await updateMedicalAvailability(profile.uid, nextVal, selectedShelterId);
  };

  // Filter urgent medical & injury requests
  const medicalRequests = requests.filter(
    (r) => r.category === 'medical' || r.category === 'injury'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-safe-border pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-pink-950/50 border border-pink-800/50">
            <HeartPulse className="w-6 h-6 text-pink-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Medical Volunteer Network</h1>
            <p className="text-sm text-gray-400">
              Verified clinical support, emergency triage stations, and on-duty doctors at relief shelters
            </p>
          </div>
        </div>

        {isDoctor && (
          <div className="flex items-center gap-3 bg-safe-card p-2 rounded-xl border border-safe-border">
            <button
              onClick={handleToggleDuty}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                isOnDuty
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
              {isOnDuty ? 'On-Duty at Shelter' : 'Off-Duty'}
            </button>
            {isOnDuty && (
              <span className="text-[11px] font-mono text-gray-400">
                Expires in {dutyExpiresInMinutes}m
              </span>
            )}
          </div>
        )}
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Doctor Operations Section (Visible when user has Doctor role) */}
      {isDoctor && (
        <div className="p-6 rounded-2xl bg-safe-card border border-pink-900/40 space-y-6">
          <div className="flex items-center justify-between border-b border-safe-border pb-4">
            <div className="flex items-center gap-2.5">
              <Stethoscope className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-bold text-white">Medical Officer Command</h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-pink-950/80 text-pink-300 border border-pink-800">
              Verified Clinician
            </span>
          </div>

          <form onSubmit={handleRegisterDoctor} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Medical License #
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full bg-safe-dark border border-safe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-safe-primary font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Specialty / Department
              </label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full bg-safe-dark border border-safe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-safe-primary"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Assigned Shelter Clinic
              </label>
              <select
                value={selectedShelterId}
                onChange={(e) => setSelectedShelterId(e.target.value)}
                className="w-full bg-safe-dark border border-safe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-safe-primary"
              >
                {shelters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-pink-700 hover:bg-pink-600 text-white font-bold text-xs rounded-xl transition shadow-md"
              >
                Update Clinical Deployment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Live Medical Triage Queue (For Doctors & Rescue Personnel) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-400" />
            <h3 className="text-base font-bold text-white">Emergency Medical & Trauma Triage Queue</h3>
          </div>
          <span className="text-xs font-mono text-gray-400">{medicalRequests.length} active tickets</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medicalRequests.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-safe-card rounded-2xl border border-safe-border text-xs text-gray-400">
              No active medical emergency requests reported at this time.
            </div>
          ) : (
            medicalRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-2xl bg-safe-card border border-red-950/60 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-950 text-red-400 border border-red-800">
                      {req.priority} PRIORITY
                    </span>
                    <span className="text-xs font-semibold text-gray-400 capitalize">
                      {req.category}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white">{req.requesterName}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>{req.approximateLocation}</span>
                  </div>

                  {req.notes && (
                    <p className="text-xs text-gray-300 italic bg-safe-dark p-2.5 rounded-lg border border-safe-border">
                      "{req.notes}"
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-safe-border">
                  {req.status === 'pending' ? (
                    <button
                      onClick={() => acceptAssistanceRequest(req.id, profile?.uid || 'doctor_guest', profile?.name || 'Dr. On Duty', 'helper')}
                      className="w-full py-2 bg-pink-700 hover:bg-pink-600 text-white font-bold text-xs rounded-xl transition"
                    >
                      Accept Medical Ticket
                    </button>
                  ) : (
                    <div className="text-xs text-emerald-400 font-semibold flex items-center justify-between">
                      <span>Status: {req.status}</span>
                      {req.assignedHelperName && <span>Responder: {req.assignedHelperName}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Directory of Verified Doctors & Shelter Medical Posts */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-emerald-400" />
          On-Duty Medical Officers & Shelter Clinics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {volunteers.map((vol) => {
            const assignedShelter = shelters.find((s) => s.id === vol.shelterId);

            return (
              <div
                key={vol.id}
                className="p-5 rounded-2xl bg-safe-card border border-safe-border space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{vol.name}</h4>
                      <p className="text-xs text-gray-400">{vol.specialty}</p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    vol.isAvailable
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-gray-800 text-gray-400'
                  }`}>
                    {vol.isAvailable ? 'ON DUTY' : 'STANDBY'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-300 bg-safe-dark p-3 rounded-xl border border-safe-border">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-safe-primary" />
                    <span>Station: <strong>{assignedShelter?.name || 'Unassigned Mobile Unit'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>License: <strong className="font-mono text-gray-300">{vol.medicalLicenseNumber}</strong></span>
                  </div>
                  {vol.contactPhone && (
                    <div className="flex items-center gap-1.5 text-emerald-400 pt-1 font-mono">
                      <Phone className="w-3.5 h-3.5" />
                      <a href={`tel:${vol.contactPhone}`} className="hover:underline">
                        {vol.contactPhone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
