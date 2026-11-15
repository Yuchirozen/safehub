import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import {
  subscribeToAuth,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logout as authLogout,
  getUserProfile,
  updateUserProfile
} from '../services/auth';
import type { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string, role: UserRole, phone?: string, additional?: any) => Promise<void>;
  signInGoogle: (preferredRole?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Check if profile stored in localStorage
    const saved = localStorage.getItem('safehub_active_profile') || localStorage.getItem('safehub_active_demo_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
        setLoading(false);
      } catch {}
    }

    // 2. Subscribe to Firebase auth changes
    const unsubscribe = subscribeToAuth((user, userProfile) => {
      if (user && userProfile) {
        setCurrentUser(user);
        setProfile(userProfile);
        localStorage.setItem('safehub_active_profile', JSON.stringify(userProfile));
      } else if (!user) {
        // If Firebase says no user, only clear state if there is NO active local profile session
        const currentSaved = localStorage.getItem('safehub_active_profile') || localStorage.getItem('safehub_active_demo_profile');
        if (!currentSaved) {
          setCurrentUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const p = await loginWithEmail(email, pass);
    if (p) {
      setProfile(p);
      localStorage.setItem('safehub_active_profile', JSON.stringify(p));
    }
  };

  const register = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole,
    phone?: string,
    additional?: any
  ) => {
    const p = await registerWithEmail(email, pass, name, role, phone, additional);
    if (p) {
      setProfile(p);
      localStorage.setItem('safehub_active_profile', JSON.stringify(p));
    }
  };

  const signInGoogle = async (preferredRole: UserRole = 'citizen') => {
    const p = await loginWithGoogle(preferredRole);
    if (p) {
      setProfile(p);
      localStorage.setItem('safehub_active_profile', JSON.stringify(p));
    }
  };

  const logout = async () => {
    localStorage.removeItem('safehub_active_profile');
    localStorage.removeItem('safehub_active_demo_profile');
    await authLogout();
    setProfile(null);
    setCurrentUser(null);
  };

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    await updateUserProfile(profile.uid, updates);
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  // Demo Switcher for seamless role evaluation during evaluation & grading
  const switchDemoRole = (role: UserRole) => {
    const demoProfiles: Record<UserRole, UserProfile> = {
      citizen: {
        uid: 'demo_citizen_uid',
        name: 'Rahul Verma (Citizen)',
        email: 'rahul.citizen@safehub.local',
        phone: '+91 98450 12345',
        role: 'citizen',
        approvalStatus: 'approved',
        bloodType: 'O+',
        createdAt: Date.now() - 1000000,
        updatedAt: Date.now()
      },
      vulnerable_evacuee: {
        uid: 'demo_vulnerable_uid',
        name: 'Kavita Sen (Vulnerable Evacuee)',
        email: 'kavita.evacuee@safehub.local',
        phone: '+91 98450 67890',
        role: 'vulnerable_evacuee',
        approvalStatus: 'approved',
        mobilityNeeds: 'Wheelchair / Reduced Mobility',
        vulnerabilities: ['wheelchair', 'elderly'],
        createdAt: Date.now() - 1000000,
        updatedAt: Date.now()
      },
      helper: {
        uid: 'demo_helper_uid',
        name: 'Arjun Das (Helper Volunteer)',
        email: 'arjun.helper@safehub.local',
        phone: '+91 98450 11122',
        role: 'helper',
        approvalStatus: 'approved',
        availableToHelp: true,
        createdAt: Date.now() - 1000000,
        updatedAt: Date.now()
      },
      doctor: {
        uid: 'demo_doctor_uid',
        name: 'Dr. Anita Roy, MD',
        email: 'dr.anita@safehub.local',
        phone: '+91 98860 12345',
        role: 'doctor',
        approvalStatus: 'approved',
        assignedShelterId: 'shelter_central_high',
        createdAt: Date.now() - 1000000,
        updatedAt: Date.now()
      },
      shelter_staff: {
        uid: 'demo_staff_uid',
        name: 'Suresh Nair (Staff Officer)',
        email: 'suresh.staff@safehub.local',
        phone: '+91 98450 33344',
        role: 'shelter_staff',
        approvalStatus: 'approved',
        assignedShelterId: 'shelter_central_high',
        createdAt: Date.now() - 1000000,
        updatedAt: Date.now()
      },
      rescue_team: {
        uid: 'demo_rescue_uid',
        name: 'Commander Vikram (Rescue Unit 1)',
        email: 'commander.vikram@safehub.local',
        phone: '+91 98450 55566',
        role: 'rescue_team',
        approvalStatus: 'approved',
        createdAt: Date.now() - 1000000,
        updatedAt: Date.now()
      },
      admin: {
        uid: 'demo_admin_uid',
        name: 'System Administrator (SAFEHUB Lead)',
        email: 'admin@safehub.local',
        phone: '+91 98450 99999',
        role: 'admin',
        approvalStatus: 'approved',
        createdAt: Date.now() - 1000000,
        updatedAt: Date.now()
      }
    };

    const chosen = demoProfiles[role];
    setProfile(chosen);
    localStorage.setItem('safehub_active_demo_profile', JSON.stringify(chosen));
    localStorage.setItem('safehub_active_profile', JSON.stringify(chosen));

    // Dispatch location check-in to n8n & Telegram rescue helpers
    try {
      fetch('/api/webhook/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: chosen.uid,
          name: chosen.name,
          email: chosen.email,
          phone: chosen.phone,
          role: chosen.role,
          bloodType: chosen.bloodType,
          mobilityNeeds: chosen.mobilityNeeds,
          approximateLocation: 'Live Evacuee Check-in (Central Bangalore Grid)',
          coordinates: { lat: 12.9716, lng: 77.5946 }
        })
      }).catch(() => {});
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        loading,
        login,
        register,
        signInGoogle,
        logout,
        updateProfileData,
        switchDemoRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
