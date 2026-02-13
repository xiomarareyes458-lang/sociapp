
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

/**
 * SAFE MAPPER: Profiles (Database snake_case -> App camelCase)
 */
export const mapDbProfileToUser = (p: any): User => {
  if (!p) return null as any;
  return {
    id: p.id || '',
    username: p.username || 'usuario',
    email: p.email || '',
    fullName: p.full_name || 'Usuaria',
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
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, username, full_name, avatar_url, bio, joined_at, cover_photo, followers, following')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile && isMounted.current) {
            setCurrentUser(mapDbProfileToUser(profile));
          }
        }
      } catch (err) {
        console.warn("Error en inicialización de Auth:", err);
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
            .select('id, email, username, full_name, avatar_url, bio, joined_at, cover_photo, followers, following')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile && isMounted.current) {
            setCurrentUser(mapDbProfileToUser(profile));
          }
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setIsDemoMode(false);
        }
      } catch (err) {
        console.warn("Error en cambio de estado de Auth:", err);
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
    
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) throw signUpError;
    if (!data.user) throw new Error('No se pudo crear el usuario');

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: data.user.id,
        username: username.toLowerCase().trim(),
        email: email.trim(),
        full_name: fullName.trim(),
        avatar_url: DEFAULT_AVATAR,
        joined_at: Date.now(),
        followers: [],
        following: []
      }]);

    if (profileError) throw profileError;
  };

  const logout = async () => {
    try {
      if (supabase) await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    } finally {
      setCurrentUser(null);
      setIsDemoMode(false);
    }
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    setCurrentUser({
      id: 'demo-user',
      username: 'invitado',
      email: 'demo@socialapp.com',
      fullName: 'Usuario Invitado',
      avatar: DEFAULT_AVATAR,
      bio: 'Modo Demo',
      joinedAt: Date.now(),
      coverPhoto: null,
      followers: [],
      following: []
    });
  };

  const updateCurrentUser = async (userData: any) => {
    if (!currentUser) return;
    
    // Normalizar datos para estado local (camelCase)
    const normalizedData: any = { ...userData };
    if (userData.avatar_url) normalizedData.avatar = userData.avatar_url;
    if (userData.cover_photo) normalizedData.coverPhoto = userData.cover_photo;
    if (userData.full_name) normalizedData.fullName = userData.full_name;

    if (isDemoMode) {
      setCurrentUser({ ...currentUser, ...normalizedData });
      return;
    }

    if (supabase) {
      const dbUpdates: any = {};
      if (userData.username) dbUpdates.username = userData.username.toLowerCase().trim();
      if (userData.fullName || userData.full_name) dbUpdates.full_name = userData.fullName || userData.full_name;
      if (userData.avatar || userData.avatar_url) dbUpdates.avatar_url = userData.avatar || userData.avatar_url;
      if (userData.bio !== undefined) dbUpdates.bio = userData.bio;
      if (userData.coverPhoto !== undefined || userData.cover_photo !== undefined) 
        dbUpdates.cover_photo = userData.coverPhoto !== undefined ? userData.coverPhoto : userData.cover_photo;
      if (userData.followers) dbUpdates.followers = userData.followers;
      if (userData.following) dbUpdates.following = userData.following;

      try {
        const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', currentUser.id);
        if (error) throw error;
        setCurrentUser({ ...currentUser, ...normalizedData });
      } catch (err: any) {
        console.error("Error al actualizar perfil:", err);
        throw err;
      }
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
