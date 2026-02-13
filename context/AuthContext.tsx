
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
  const [isNetworkBlocked] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // Escuchar cambios de sesión (login, logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted.current) return;

      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (isMounted.current) {
            setCurrentUser(profile ? mapDbProfileToUser(profile) : null);
          }
        } catch (err) {
          console.warn('Error cargando perfil:', err);
        }
      } else {
        if (isMounted.current) {
          setCurrentUser(null);
          setIsDemoMode(false);
        }
      }

      // Terminar loading después del primer evento
      if (isMounted.current) setLoading(false);
    });

    // Timeout de seguridad: si en 5s no hay respuesta, dejar de cargar
    const timeout = setTimeout(() => {
      if (isMounted.current && loading) setLoading(false);
    }, 5000);

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const login = async (email: string, password: string) => {
    if (!supabase) throw new Error('Sin conexión al servidor');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Traducir errores comunes al español
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Correo o contraseña incorrectos');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Debes confirmar tu correo antes de iniciar sesión');
      }
      throw new Error(error.message);
    }
    // El onAuthStateChange se encarga de setCurrentUser automáticamente
  };

  const register = async (email: string, password: string, username: string, fullName: string) => {
    if (!supabase) throw new Error('Sin conexión al servidor');

    // 1. Crear usuario en Auth
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) throw new Error(signUpError.message);
    if (!data.user) throw new Error('No se pudo crear el usuario');

    // 2. Crear perfil en profiles
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

    if (profileError) throw new Error(profileError.message);
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
    if (isDemoMode) {
      setCurrentUser({ ...currentUser, ...userData });
      return;
    }
    if (supabase) {
      const dbUpdates: any = {};
      if (userData.username) dbUpdates.username = userData.username.toLowerCase().trim();
      if (userData.fullName) dbUpdates.full_name = userData.fullName;
      if (userData.avatar) dbUpdates.avatar_url = userData.avatar;
      if (userData.bio !== undefined) dbUpdates.bio = userData.bio;
      if (userData.coverPhoto !== undefined) dbUpdates.cover_photo = userData.coverPhoto;
      if (userData.followers) dbUpdates.followers = userData.followers;
      if (userData.following) dbUpdates.following = userData.following;

      const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', currentUser.id);
      if (error) throw new Error(error.message);
      setCurrentUser({ ...currentUser, ...userData });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#2ECC71] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#2ECC71] text-xs font-bold tracking-widest uppercase animate-pulse">
          Cargando...
        </p>
      </div>
    );
  }

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
