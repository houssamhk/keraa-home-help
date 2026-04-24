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
  created_at?: string | null;
  settings: {
    theme: 'dark' | 'light';
    language: string;
    notifications: boolean;
    onboarding_completed?: boolean;
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
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const normalizeProfile = (data: any): Profile => {
    const settings = (data.settings as {
      theme?: string;
      language?: string;
      notifications?: boolean;
      onboarding_completed?: boolean;
    } | null) ?? null;

    return {
      id: data.id,
      user_id: data.user_id,
      full_name: data.full_name,
      phone: data.phone,
      avatar_url: data.avatar_url,
      role_type: (data.role_type as 'tenant' | 'provider' | 'owner' | 'handyman') || 'tenant',
      kyc_verified: data.kyc_verified || false,
      created_at: data.created_at ?? null,
      settings: {
        theme: settings?.theme === 'light' ? 'light' : 'dark',
        language: settings?.language || 'ar',
        notifications: settings?.notifications ?? true,
        onboarding_completed: settings?.onboarding_completed ?? false,
      }
    };
  };

  const fetchProfile = async (userId: string, authUser?: User | null) => {
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data && authUser) {
      const { error: createError } = await supabase
        .from('profiles')
        .upsert({
          user_id: authUser.id,
          full_name: authUser.user_metadata?.full_name ?? authUser.email?.split('@')[0] ?? null,
          phone: authUser.user_metadata?.phone ?? null,
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: true,
        });

      if (!createError) {
        const retry = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        data = retry.data;
        error = retry.error;
      }
    }

    if (error || !data) {
      setProfile(null);
      return null;
    }

    const profileData = normalizeProfile(data);

    setProfile(profileData);
    return profileData;
  };

  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        void fetchProfile(user.id);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setIsLoading(true);
        setTimeout(() => {
          void fetchProfile(nextSession.user.id, nextSession.user).finally(() => setIsLoading(false));
        }, 0);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    setIsLoading(true);
    void supabase.auth
      .getSession()
      .then(async ({ data: { session: currentSession } }) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id, currentSession.user);
        } else {
          setProfile(null);
        }
      })
      .finally(() => setIsLoading(false));

    return () => {
      subscription.unsubscribe();
    };
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

    const mergedSettings = updates.settings
      ? {
          ...(profile?.settings || { theme: 'dark' as const, language: 'ar', notifications: true }),
          ...updates.settings,
        }
      : undefined;

    const normalizedUpdates = mergedSettings
      ? { ...updates, settings: mergedSettings }
      : updates;

    const { error } = await supabase
      .from('profiles')
      .update(normalizedUpdates)
      .eq('user_id', user.id);

    if (!error) {
      setProfile(prev => prev ? {
        ...prev,
        ...normalizedUpdates,
        settings: mergedSettings ? { ...prev.settings, ...mergedSettings } : prev.settings,
      } : null);
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

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
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
      updateSettings,
      refreshProfile
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
