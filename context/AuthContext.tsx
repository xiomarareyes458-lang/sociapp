
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { DEFAULT_AVATAR } from '../constants';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentUser: (userData: Partial<User> | any) => Promise<void>;
  enterDemoMode: () => void;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isNetworkBlocked: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const mapDbProfileToUser = (p: any): User => {
  if (!p) return null as any;
  return {
    id: p.id || '',
    username: p.username || 'usuario',
    email: p.email || '',
    fullName: p.full_name || 'Usuario',
    avatar: p.avatar_url || DEFAULT_AVATAR,
    bio: p.bio || '',
    joinedAt: p.joined_at ? Number(p.joined_at) : Date.now(),
    coverPhoto: p.cover_photo || null,
    followers: Array.isArray(p.followers) ? p.followers : [],
    following: Array.isArray(p.following) ? p.following : []
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isNetworkBlocked, setIsNetworkBlocked] = useState(false);
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
            .maybeSingle();

          if (profile && isMounted.current) {
            setCurrentUser(mapDbProfileToUser(profile));
          }
        }
      } catch (err) {
        console.warn("Auth init error:", err);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        if (profile && isMounted.current) setCurrentUser(mapDbProfileToUser(profile));
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsDemoMode(false);
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase no configurado');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (email: string, password: string, username: string, fullName: string) => {
    if (!supabase) throw new Error('Supabase no configurado');
    
    // 1. Crear usuario en Auth
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) throw signUpError;
    if (!data.user) throw new Error('No se pudo crear el usuario');

    // 2. Crear perfil en la tabla profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: data.user.id,
        username: username.toLowerCase().trim(),
        full_name: fullName.trim(),
        avatar_url: DEFAULT_AVATAR,
        joined_at: Date.now(),
        followers: [],
        following: []
      }]);

    if (profileError) throw profileError;
  };

  const logout = async () => {
    if (isDemoMode) {
      setCurrentUser(null);
      setIsDemoMode(false);
      return;
    }
    if (supabase) await supabase.auth.signOut();
    setCurrentUser(null);
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
      coverPhoto: null,
      followers: [],
      following: []
    });
  };

  const updateCurrentUser = async (userData: any) => {
    if (!currentUser) return;
    const normalizedData = { ...userData };
    if (isDemoMode) {
      setCurrentUser({ ...currentUser, ...normalizedData });
      return;
    }
    if (supabase) {
      const dbUpdates: any = {};
      if (userData.username) dbUpdates.username = userData.username.toLowerCase().trim();
      if (userData.fullName) dbUpdates.full_name = userData.fullName;
      if (userData.avatar) dbUpdates.avatar_url = userData.avatar;
      if (userData.bio !== undefined) dbUpdates.bio = userData.bio;
      if (userData.followers) dbUpdates.followers = userData.followers;
      if (userData.following) dbUpdates.following = userData.following;

      const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', currentUser.id);
      if (error) throw error;
      setCurrentUser({ ...currentUser, ...normalizedData });
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser, login, register, logout, updateCurrentUser, enterDemoMode,
      isAuthenticated: !!currentUser, isDemoMode, isNetworkBlocked
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};
