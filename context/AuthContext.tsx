import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { DEFAULT_AVATAR } from '../constants';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentUser: (userData: Partial<User>) => Promise<void>;
  enterDemoMode: () => void;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isNetworkBlocked: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapProfileToUser = (profile: any): User => ({
  id: profile.id,
  username: profile.username,
  email: profile.email,
  fullName: profile.full_name,
  avatar: profile.avatar_url || DEFAULT_AVATAR,
  bio: profile.bio || '',
  joinedAt: profile.joined_at ? Number(profile.joined_at) : Date.now(),
  coverPhoto: profile.cover_photo,
  followers: profile.followers || [],
  following: profile.following || []
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isNetworkBlocked] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile && isMounted.current) {
            setCurrentUser(mapProfileToUser(profile));
          }
        }
      } catch (err) {
        console.error("Error recuperando sesión:", err);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) setCurrentUser(mapProfileToUser(profile));
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setIsDemoMode(false);
        }
      } catch (e) {
        console.error("Error en cambio de estado de auth:", e);
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    if (!supabase) throw new Error('Servicio no disponible');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  // 🔥 IMPORTANTE: ya NO insertamos perfil manualmente
  const register = async (email: string, password: string) => {
    if (!supabase) throw new Error('Servicio no disponible');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setCurrentUser(null);
    setIsDemoMode(false);
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    setCurrentUser({
      id: 'demo-user',
      username: 'invitado',
      email: 'demo@socialapp.com',
      fullName: 'Usuario Invitado',
      avatar: DEFAULT_AVATAR,
      bio: 'Modo Demo Activo',
      joinedAt: Date.now(),
      followers: [],
      following: []
    });
  };

  const updateCurrentUser = async (userData: Partial<User>) => {
    if (!currentUser || !supabase) return;

    const dbUpdates: any = {};
    if (userData.fullName) dbUpdates.full_name = userData.fullName;
    if (userData.avatar) dbUpdates.avatar_url = userData.avatar;
    if (userData.bio !== undefined) dbUpdates.bio = userData.bio;
    if (userData.coverPhoto !== undefined) dbUpdates.cover_photo = userData.coverPhoto;
    if (userData.following) dbUpdates.following = userData.following;
    if (userData.followers) dbUpdates.followers = userData.followers;

    await supabase.from('profiles').update(dbUpdates).eq('id', currentUser.id);
    setCurrentUser({ ...currentUser, ...userData });
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{
      currentUser,
      login,
      register,
      logout,
      updateCurrentUser,
      enterDemoMode,
      isAuthenticated: !!currentUser,
      isDemoMode,
      isNetworkBlocked
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
