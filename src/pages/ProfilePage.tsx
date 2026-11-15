import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Shield,
  HeartPulse,
  Phone,
  Mail,
  Save,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Building,
  KeyRound
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const { profile, updateProfileData, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState<string>(profile?.name || '');
  const [phone, setPhone] = useState<string>(profile?.phone || '');
  const [bloodType, setBloodType] = useState<string>(profile?.bloodType || 'O+');
  const [medicalConditions, setMedicalConditions] = useState<string>(profile?.medicalConditions || '');
  const [mobilityNeeds, setMobilityNeeds] = useState<string>(profile?.mobilityNeeds || '');
  const [emergencyContactName, setEmergencyContactName] = useState<string>(profile?.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>(profile?.emergencyContactPhone || '');

  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback('');

    try {
      await updateProfileData({
        name,
        phone,
        bloodType,
        medicalConditions,
        mobilityNeeds,
        emergencyContactName,
        emergencyContactPhone
      });
      setFeedback('Emergency profile updated successfully.');
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-gray-400">Please sign in to view your profile.</p>
        <button
          onClick={() => navigate('/auth')}
          className="px-6 py-2.5 bg-safe-primary text-white font-bold text-xs rounded-xl"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-safe-border pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-safe-card border border-safe-border">
            <User className="w-6 h-6 text-safe-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Profile & Medical Directives</h1>
            <p className="text-sm text-gray-400">
              Manage personal identity, emergency contacts, and vital medical requirements
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-safe-card hover:bg-safe-dark border border-safe-border text-red-400 text-xs font-bold rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Account Status Card */}
      <div className="p-6 rounded-2xl bg-safe-card border border-safe-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Role</span>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white capitalize">{profile.role.replace('_', ' ')}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border ${
              profile.approvalStatus === 'approved'
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : 'bg-amber-950 text-amber-300 border-amber-800'
            }`}>
              {profile.approvalStatus.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-mono">UID: {profile.uid}</p>
        </div>

        {profile.approvalStatus === 'pending_approval' && (
          <div className="p-3 bg-amber-950/40 border border-amber-900/60 rounded-xl text-xs text-amber-300 max-w-sm">
            <AlertTriangle className="w-4 h-4 text-amber-400 inline mr-1" />
            Sensitive role pending verification by disaster network administrator.
          </div>
        )}
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="p-6 sm:p-8 rounded-2xl bg-safe-card border border-safe-border space-y-6">
        <div className="border-b border-safe-border pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-safe-primary" />
            Basic Information
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-safe-dark border border-safe-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-safe-primary"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400">Email Address (Read Only)</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full bg-safe-dark/50 border border-safe-border/50 rounded-xl px-3.5 py-2.5 text-sm text-gray-400 cursor-not-allowed font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400">Primary Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98450 00000"
              className="w-full bg-safe-dark border border-safe-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-safe-primary font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400">Blood Type</label>
            <select
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              className="w-full bg-safe-dark border border-safe-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-safe-primary"
            >
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Medical & Accessibility Needs */}
        <div className="border-t border-safe-border pt-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-pink-400" />
            Medical & Accessibility Directives
          </h3>
          <p className="text-xs text-gray-400">
            This information is only visible to verified medical officers and first responders during active evacuations.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Mobility & Accessibility Needs</label>
              <input
                type="text"
                value={mobilityNeeds}
                onChange={(e) => setMobilityNeeds(e.target.value)}
                placeholder="e.g. Wheelchair user, Walker, Visual impairment"
                className="w-full bg-safe-dark border border-safe-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-safe-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Chronic Medical Conditions / Allergies</label>
              <input
                type="text"
                value={medicalConditions}
                onChange={(e) => setMedicalConditions(e.target.value)}
                placeholder="e.g. Type-1 Diabetes, Asthma, Penicillin allergy"
                className="w-full bg-safe-dark border border-safe-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-safe-primary"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="border-t border-safe-border pt-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-400" />
            Next of Kin Emergency Contact
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Contact Name</label>
              <input
                type="text"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="e.g. Priya Verma (Spouse)"
                className="w-full bg-safe-dark border border-safe-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-safe-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Contact Phone</label>
              <input
                type="tel"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="+91 98450 99999"
                className="w-full bg-safe-dark border border-safe-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-safe-primary font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-safe-border flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-safe-primary hover:bg-red-700 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
