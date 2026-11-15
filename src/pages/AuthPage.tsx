import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { resetPassword } from '../services/auth';
import type { UserRole } from '../types';
import {
  ShieldAlert,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Shield,
  KeyRound
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// @ts-ignore — PatternWaves is a JS component (no type declarations)
import PatternWaves from '../components/PatternWaves';

export const AuthPage: React.FC = () => {
  const { login, register, signInGoogle, switchDemoRole } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [role, setRole] = useState<UserRole>('citizen');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/');
      } else if (mode === 'register') {
        await register(email, password, name, role, phone);
        navigate('/');
      } else if (mode === 'reset') {
        await resetPassword(email);
        setSuccessMessage(`Password reset link dispatched to ${email}. Check your inbox.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await signInGoogle(role);
      navigate('/');
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = (r: UserRole) => {
    switchDemoRole(r);
    navigate('/');
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* ── PatternWaves animated background — AuthPage only ── */}
      <div className="absolute inset-0 z-0">
        <PatternWaves
          preset="silk"
          color="#ffffff"
          backgroundColor="#000000"
          fade="edges"
          interactive
          cursorSize={50}
          cursorStrength={0.6}
        />
      </div>

      {/* ── Auth content layered on top ── */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12 pointer-events-none">
        <div className="max-w-md w-full space-y-6 pointer-events-auto">
        {/* Quick Demo Role Switcher Card */}
        <div className="p-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 space-y-2.5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-safe-primary" />
              Instant Role Testing
            </span>
            <span className="text-[10px] text-gray-500 font-mono">1-Click Login</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
            <button
              onClick={() => handleDemoSelect('citizen')}
              className="p-1.5 rounded-lg bg-safe-dark hover:bg-gray-800 text-gray-200 border border-safe-border font-medium transition"
            >
              Citizen
            </button>
            <button
              onClick={() => handleDemoSelect('vulnerable_evacuee')}
              className="p-1.5 rounded-lg bg-safe-dark hover:bg-gray-800 text-purple-300 border border-purple-900/50 font-medium transition"
            >
              Vulnerable
            </button>
            <button
              onClick={() => handleDemoSelect('helper')}
              className="p-1.5 rounded-lg bg-safe-dark hover:bg-gray-800 text-emerald-300 border border-emerald-900/50 font-medium transition"
            >
              Helper
            </button>
            <button
              onClick={() => handleDemoSelect('doctor')}
              className="p-1.5 rounded-lg bg-safe-dark hover:bg-gray-800 text-pink-300 border border-pink-900/50 font-medium transition"
            >
              Doctor
            </button>
            <button
              onClick={() => handleDemoSelect('shelter_staff')}
              className="p-1.5 rounded-lg bg-safe-dark hover:bg-gray-800 text-amber-300 border border-amber-900/50 font-medium transition"
            >
              Shelter Staff
            </button>
            <button
              onClick={() => handleDemoSelect('rescue_team')}
              className="p-1.5 rounded-lg bg-safe-dark hover:bg-gray-800 text-red-300 border border-red-900/50 font-medium transition"
            >
              Rescue Team
            </button>
            <button
              onClick={() => handleDemoSelect('admin')}
              className="col-span-2 p-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-800 font-bold transition"
            >
              Administrator
            </button>
          </div>
        </div>

        {/* Main Authentication Card */}
        <div className="p-8 rounded-3xl bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-red-950/60 border border-red-800/60 text-red-500 mb-1">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {mode === 'login'
                ? 'Sign in to SAFEHUB'
                : mode === 'register'
                ? 'Create Verified Account'
                : 'Reset Password'}
            </h2>
            <p className="text-xs text-gray-400">
              Emergency Shelter & Disaster Response Network
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Google Sign In Button */}
          {mode !== 'reset' && (
            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs transition flex items-center justify-center gap-3 shadow-md disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-safe-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-gray-400 font-mono">
                    Or continue with email
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-safe-dark border border-safe-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-safe-primary"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98450 12345"
                      className="w-full bg-safe-dark border border-safe-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-safe-primary font-mono"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Account Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-safe-dark border border-safe-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-safe-primary"
                  >
                    <option value="citizen">Citizen / Evacuee</option>
                    <option value="vulnerable_evacuee">Vulnerable Evacuee (Elderly/Mobility)</option>
                    <option value="helper">Community Helper</option>
                    <option value="doctor">Doctor / Medical Volunteer (Requires Approval)</option>
                    <option value="shelter_staff">Shelter Staff (Requires Approval)</option>
                    <option value="rescue_team">Rescue Team (Requires Approval)</option>
                    <option value="admin">Administrator (Requires Approval)</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-safe-dark border border-safe-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-safe-primary"
                  required
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-400">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('reset')}
                      className="text-xs text-safe-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-safe-dark border border-safe-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-safe-primary font-mono"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-safe-primary hover:bg-red-700 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                'Processing...'
              ) : mode === 'login' ? (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'register' ? (
                <>
                  Create Account <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>

            {mode === 'login' && (
              <div className="text-[11px] text-gray-400 text-center bg-white/5 py-1.5 px-3 rounded-lg border border-white/5 font-mono">
                💡 Demo: <span className="text-white font-semibold">admin@safehub.local</span> / <span className="text-white font-semibold">admin123</span>
              </div>
            )}
          </form>

          {/* Toggle Login / Register */}
          <div className="text-center text-xs text-gray-400 pt-2 border-t border-white/10">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-safe-primary font-bold hover:underline"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-safe-primary font-bold hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
