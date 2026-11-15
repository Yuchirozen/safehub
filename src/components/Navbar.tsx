import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  Bell,
  Home,
  MapPin,
  LifeBuoy,
  HeartHandshake,
  Stethoscope,
  Building2,
  Radio,
  Sliders,
  LogOut,
  LogIn,
  UserCheck,
  AlertTriangle,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface NavbarProps {
  alertsCount?: number;
  onOpenSosModal: () => void;
  onToggleSimulator: () => void;
  isSimulatorOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  alertsCount = 0,
  onOpenSosModal,
  onToggleSimulator,
  isSimulatorOpen
}) => {
  const { profile, logout, switchDemoRole } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const role = profile?.role || 'citizen';
  const isApproved = profile?.approvalStatus === 'approved';

  const roleLabels: Record<UserRole, string> = {
    citizen: 'Citizen / Evacuee',
    vulnerable_evacuee: 'Vulnerable Evacuee',
    helper: 'Helper Volunteer',
    doctor: 'Doctor / Medical Volunteer',
    shelter_staff: 'Shelter Staff',
    rescue_team: 'Rescue Team Officer',
    admin: 'Administrator'
  };

  const navLinks = [
    { to: '/', label: 'Emergency Home', icon: Home, show: true },
    { to: '/alerts', label: 'Live Alerts', icon: Bell, count: alertsCount, show: true },
    { to: '/shelters', label: 'Shelters & Map', icon: MapPin, show: true },
    { to: '/evacuation', label: 'Evac Guidance', icon: Radio, show: true },
    { to: '/request-help', label: 'Request Help', icon: LifeBuoy, show: true },
    { to: '/helpers', label: 'Helpers Feed', icon: HeartHandshake, show: true },
    { to: '/medical', label: 'Medical Help', icon: Stethoscope, show: true },
    { to: '/shelter-management', label: 'Shelter Staff', icon: Building2, show: role === 'shelter_staff' || role === 'admin' },
    { to: '/rescue', label: 'Rescue Command', icon: ShieldAlert, show: role === 'rescue_team' || role === 'admin' },
    { to: '/admin', label: 'Admin Portal', icon: UserCheck, show: role === 'admin' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-slate-800 text-slate-100">
      {/* Top emergency strip */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-b border-red-900/30 px-4 py-1 text-xs flex justify-between items-center text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-semibold text-slate-200">SAFEHUB System Active</span>
          <span className="hidden sm:inline text-slate-400">| Flood Monitoring & Shelter Coordination</span>
        </div>

        {/* Demo Fast Role Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-amber-400 font-semibold hidden md:inline">Demo Switcher:</span>
          <select
            value={role}
            onChange={(e) => switchDemoRole(e.target.value as UserRole)}
            className="bg-slate-900 text-amber-300 border border-amber-500/30 text-[11px] rounded px-2 py-0.5 focus:outline-none"
          >
            <option value="citizen">Role: Citizen</option>
            <option value="vulnerable_evacuee">Role: Vulnerable Evacuee</option>
            <option value="helper">Role: Helper</option>
            <option value="doctor">Role: Doctor (Medical)</option>
            <option value="shelter_staff">Role: Shelter Staff</option>
            <option value="rescue_team">Role: Rescue Team</option>
            <option value="admin">Role: Administrator</option>
          </select>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-white group">
          <div className="p-2 bg-red-600 rounded-lg shadow-md shadow-red-950/50 group-hover:bg-red-500 transition">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold tracking-wider">SAFE<span className="text-red-500">HUB</span></span>
            <span className="block text-[9px] uppercase tracking-widest text-slate-400 -mt-1">Disaster Response</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navLinks.filter(l => l.show).map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                  active
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 text-slate-400" />
                <span>{item.label}</span>
                {Boolean(item.count && item.count > 0) && (
                  <span className="ml-1 px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-bold rounded-full">
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* IoT Hardware Simulator Toggle */}
          <button
            onClick={onToggleSimulator}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              isSimulatorOpen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-amber-400 hover:border-amber-500/40'
            }`}
            title="Toggle ESP32 Hardware Simulator"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">ESP32 Sim</span>
          </button>

          {/* Emergency SOS Button */}
          <button
            onClick={onOpenSosModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold uppercase tracking-wide rounded-lg shadow-md shadow-red-950 active:scale-95 transition"
          >
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            <span>SOS</span>
          </button>

          {/* User profile / Auth status */}
          {profile ? (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-200 truncate max-w-[120px]">{profile.name}</div>
                <div className="flex items-center justify-end gap-1">
                  <span className="text-[10px] text-slate-400">{roleLabels[role] || role}</span>
                  {!isApproved && (
                    <span className="px-1 text-[9px] bg-amber-950 text-amber-400 rounded">Pending</span>
                  )}
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          {navLinks.filter(l => l.show).map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                  active ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span>{item.label}</span>
                </div>
                {Boolean(item.count && item.count > 0) && (
                  <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
            {profile ? (
              <>
                <span className="text-slate-300">{profile.name} ({role})</span>
                <button onClick={logout} className="text-red-400 hover:underline">Sign out</button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="text-blue-400 hover:underline">
                Sign in to SAFEHUB
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
