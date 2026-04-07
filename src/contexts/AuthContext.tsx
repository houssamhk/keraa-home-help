import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role_type: 'tenant' | 'provider' | 'owner' | 'handyman';
  kyc_verified: boolean;
  settings: {
    theme: 'dark' | 'light';
    language: string;
    notifications: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string, phone?: string, birthDate?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  updateSettings: (settings: Partial<Profile['settings']>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!error && data) {
      const profileData: Profile = {
        id: data.id,
        user_id: data.user_id,
        full_name: data.full_name,
        phone: data.phone,
        avatar_url: data.avatar_url,
        role_type: (data.role_type as 'tenant' | 'provider' | 'owner' | 'handyman') || 'tenant',
        kyc_verified: data.kyc_verified || false,
        settings: {
          theme: (data.settings as { theme?: string })?.theme === 'light' ? 'light' : 'dark',
          language: (data.settings as { language?: string })?.language || 'ar',
          notifications: (data.settings as { notifications?: boolean })?.notifications ?? true
        }
      };
      setProfile(profileData);
    }
  };

  // Refetch profile when window regains focus (catches DB changes)
  useEffect(() => {
    const handleFocus = () => {
      if (user) fetchProfile(user.id);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setProfile(null);
      }
      
      setIsLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setIsLoading(false);
    });
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone?: string, birthDate?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone: phone,
          birth_date: birthDate
        }
      }
    });

    // Update profile with phone if signup successful
    if (!error && data.user) {
      setTimeout(async () => {
        await supabase
          .from('profiles')
          .update({ phone: phone })
          .eq('user_id', data.user!.id);
      }, 500);
    }
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);
    
    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }
    
    return { error: error as Error | null };
  };

  const updateSettings = async (settings: Partial<Profile['settings']>) => {
    if (!user || !profile) return;
    
    const newSettings = { ...profile.settings, ...settings };
    
    await supabase
      .from('profiles')
      .update({ settings: newSettings })
      .eq('user_id', user.id);
    
    setProfile(prev => prev ? { ...prev, settings: newSettings } : null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isLoading,
      signUp,
      signIn,
      signOut,
      updateProfile,
      updateSettings
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
