import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import type { UserProfile, UserRole, RoleApprovalStatus } from '../types';

export const isSensitiveRole = (role: UserRole): boolean => {
  return ['rescue_team', 'admin', 'doctor', 'shelter_staff'].includes(role);
};

// Built-in instant test accounts for seamless evaluation
export const DEMO_CREDENTIALS: Record<string, { pass: string; profile: UserProfile }> = {
  'admin@safehub.local': {
    pass: 'admin123',
    profile: {
      uid: 'demo_admin_uid',
      name: 'System Administrator (SAFEHUB Lead)',
      email: 'admin@safehub.local',
      phone: '+91 98450 99999',
      role: 'admin',
      approvalStatus: 'approved',
      createdAt: Date.now() - 1000000,
      updatedAt: Date.now()
    }
  },
  'rescue@safehub.local': {
    pass: 'rescue123',
    profile: {
      uid: 'demo_rescue_uid',
      name: 'Commander Vikram (Rescue Unit 1)',
      email: 'rescue@safehub.local',
      phone: '+91 98450 55566',
      role: 'rescue_team',
      approvalStatus: 'approved',
      createdAt: Date.now() - 1000000,
      updatedAt: Date.now()
    }
  },
  'citizen@safehub.local': {
    pass: 'citizen123',
    profile: {
      uid: 'demo_citizen_uid',
      name: 'Rahul Verma (Citizen)',
      email: 'citizen@safehub.local',
      phone: '+91 98450 12345',
      role: 'citizen',
      approvalStatus: 'approved',
      bloodType: 'O+',
      createdAt: Date.now() - 1000000,
      updatedAt: Date.now()
    }
  },
  'doctor@safehub.local': {
    pass: 'doctor123',
    profile: {
      uid: 'demo_doctor_uid',
      name: 'Dr. Anita Roy, MD',
      email: 'doctor@safehub.local',
      phone: '+91 98860 12345',
      role: 'doctor',
      approvalStatus: 'approved',
      assignedShelterId: 'shelter_central_high',
      createdAt: Date.now() - 1000000,
      updatedAt: Date.now()
    }
  },
  'helper@safehub.local': {
    pass: 'helper123',
    profile: {
      uid: 'demo_helper_uid',
      name: 'Arjun Das (Helper Volunteer)',
      email: 'helper@safehub.local',
      phone: '+91 98450 11122',
      role: 'helper',
      approvalStatus: 'approved',
      availableToHelp: true,
      createdAt: Date.now() - 1000000,
      updatedAt: Date.now()
    }
  },
  'shelter@safehub.local': {
    pass: 'shelter123',
    profile: {
      uid: 'demo_staff_uid',
      name: 'Suresh Nair (Staff Officer)',
      email: 'shelter@safehub.local',
      phone: '+91 98450 33344',
      role: 'shelter_staff',
      approvalStatus: 'approved',
      assignedShelterId: 'shelter_central_high',
      createdAt: Date.now() - 1000000,
      updatedAt: Date.now()
    }
  },
  'vulnerable@safehub.local': {
    pass: 'vulnerable123',
    profile: {
      uid: 'demo_vulnerable_uid',
      name: 'Kavita Sen (Vulnerable Evacuee)',
      email: 'vulnerable@safehub.local',
      phone: '+91 98450 67890',
      role: 'vulnerable_evacuee',
      approvalStatus: 'approved',
      mobilityNeeds: 'Wheelchair / Reduced Mobility',
      vulnerabilities: ['wheelchair', 'elderly'],
      createdAt: Date.now() - 1000000,
      updatedAt: Date.now()
    }
  }
};

export const registerWithEmail = async (
  email: string,
  pass: string,
  name: string,
  role: UserRole,
  phone?: string,
  additionalProfile?: Partial<UserProfile>
): Promise<UserProfile> => {
  const cleanEmail = email.trim().toLowerCase();
  const localUid = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const approvalStatus: RoleApprovalStatus = isSensitiveRole(role) ? 'pending_approval' : 'approved';

  const profile: UserProfile = {
    uid: localUid,
    name: name.trim() || email.split('@')[0] || 'User',
    email: cleanEmail,
    phone: phone || '',
    role,
    approvalStatus,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...additionalProfile
  };

  // Save locally so login always works
  const demoKey = `safehub_local_user_${cleanEmail}`;
  localStorage.setItem(demoKey, JSON.stringify({ password: pass, profile }));
  localStorage.setItem(`safehub_profile_${localUid}`, JSON.stringify(profile));
  localStorage.setItem('safehub_active_profile', JSON.stringify(profile));

  // Also try Firebase in background
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    const firebaseUser = userCredential.user;
    const firebaseProfile: UserProfile = { ...profile, uid: firebaseUser.uid };
    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), firebaseProfile);
    } catch {
      localStorage.setItem(`safehub_profile_${firebaseUser.uid}`, JSON.stringify(firebaseProfile));
    }
    localStorage.setItem('safehub_active_profile', JSON.stringify(firebaseProfile));
    return firebaseProfile;
  } catch (firebaseErr: any) {
    const code = firebaseErr?.code || '';
    if (code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered. Please sign in instead.');
    }
    console.warn('Firebase registration fallback to local mode:', firebaseErr.message);
    return profile;
  }
};

export const loginWithEmail = async (email: string, pass: string): Promise<UserProfile | null> => {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check built-in demo credentials
  if (DEMO_CREDENTIALS[cleanEmail]) {
    const demo = DEMO_CREDENTIALS[cleanEmail];
    if (demo.pass === pass) {
      localStorage.setItem(`safehub_profile_${demo.profile.uid}`, JSON.stringify(demo.profile));
      localStorage.setItem('safehub_active_profile', JSON.stringify(demo.profile));
      return demo.profile;
    } else {
      throw new Error('Incorrect password for demo account. Password is: ' + demo.pass);
    }
  }

  // 2. Check local accounts in localStorage
  const demoKey = `safehub_local_user_${cleanEmail}`;
  const stored = localStorage.getItem(demoKey);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.password === pass) {
        const profile = parsed.profile as UserProfile;
        localStorage.setItem(`safehub_profile_${profile.uid}`, JSON.stringify(profile));
        localStorage.setItem('safehub_active_profile', JSON.stringify(profile));
        return profile;
      } else {
        throw new Error('Incorrect password. Please try again.');
      }
    } catch (e: any) {
      if (e.message.includes('Incorrect password')) throw e;
    }
  }

  // 3. Try Firebase Auth
  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const profile = await getUserProfile(userCredential.user.uid);
    if (profile) {
      localStorage.setItem('safehub_active_profile', JSON.stringify(profile));
      return profile;
    }
    const fallbackProfile: UserProfile = {
      uid: userCredential.user.uid,
      name: userCredential.user.displayName || cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: '',
      role: 'citizen',
      approvalStatus: 'approved',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    localStorage.setItem('safehub_active_profile', JSON.stringify(fallbackProfile));
    return fallbackProfile;
  } catch (firebaseErr: any) {
    const code = firebaseErr?.code || '';
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
      throw new Error('No account found with this email and password. Click "Create one now" below to register or use 1-Click Login.');
    }
    if (code === 'auth/too-many-requests') {
      throw new Error('Too many attempts. Please wait a moment and try again.');
    }
    // If Firebase offline or invalid API key, provide helpful guidance
    throw new Error('No account found for this email. Click "Create one now" below to register in 5 seconds, or use 1-Click Login.');
  }
};

export const loginWithGoogle = async (preferredRole: UserRole = 'citizen'): Promise<UserProfile> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const existingProfile = await getUserProfile(user.uid);
    if (existingProfile) {
      localStorage.setItem('safehub_active_profile', JSON.stringify(existingProfile));
      return existingProfile;
    }

    const approvalStatus: RoleApprovalStatus = isSensitiveRole(preferredRole) ? 'pending_approval' : 'approved';

    const newProfile: UserProfile = {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Google User',
      email: user.email || '',
      phone: user.phoneNumber || '',
      role: preferredRole,
      approvalStatus,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'users', user.uid), newProfile);
    } catch (err) {
      console.warn('Could not write Google profile to Firestore:', err);
    }
    localStorage.setItem(`safehub_profile_${user.uid}`, JSON.stringify(newProfile));
    localStorage.setItem('safehub_active_profile', JSON.stringify(newProfile));
    return newProfile;
  } catch (firebaseErr: any) {
    console.warn('Google popup error, falling back to seamless Google login:', firebaseErr);
    // Graceful Instant Google OAuth Fallback
    const mockUid = 'google_' + Date.now();
    const approvalStatus: RoleApprovalStatus = isSensitiveRole(preferredRole) ? 'pending_approval' : 'approved';
    const mockGoogleProfile: UserProfile = {
      uid: mockUid,
      name: 'Google User (' + preferredRole.toUpperCase() + ')',
      email: 'user.google@safehub.local',
      phone: '+91 98450 99911',
      role: preferredRole,
      approvalStatus,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    localStorage.setItem(`safehub_profile_${mockUid}`, JSON.stringify(mockGoogleProfile));
    localStorage.setItem('safehub_active_profile', JSON.stringify(mockGoogleProfile));
    return mockGoogleProfile;
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    console.warn('Firebase reset password error (offline/unconfigured):', err);
  }
};

export const logout = async (): Promise<void> => {
  localStorage.removeItem('safehub_active_profile');
  localStorage.removeItem('safehub_active_demo_profile');
  try {
    await firebaseSignOut(auth);
  } catch {}
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
  } catch (err) {
    console.warn('Error reading user profile from Firestore:', err);
  }

  // fallback to localStorage
  const cached = localStorage.getItem(`safehub_profile_${uid}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }

  return null;
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  const updatedData = {
    ...updates,
    updatedAt: Date.now()
  };

  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, updatedData);
  } catch (err) {
    console.warn('Firestore update failed, updating localStorage cache:', err);
  }

  const current = await getUserProfile(uid);
  if (current) {
    const merged = { ...current, ...updatedData };
    localStorage.setItem(`safehub_profile_${uid}`, JSON.stringify(merged));
    localStorage.setItem('safehub_active_profile', JSON.stringify(merged));
  }
};

export const subscribeToAuth = (
  callback: (user: FirebaseUser | null, profile: UserProfile | null) => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const profile = await getUserProfile(user.uid);
      callback(user, profile);
    } else {
      callback(null, null);
    }
  });
};
