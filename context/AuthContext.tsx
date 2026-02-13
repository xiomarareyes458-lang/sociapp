import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { DEFAULT_AVATAR } from '../constants';
import { supabase } from '../lib/supabase';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isNetworkBlocked, setIsNetworkBlocked] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
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
            setCurrentUser(profile as User);
          }
        }
      } catch (err) {
        console.error("Error recuperando sesión Supabase:", err);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profile) setCurrentUser(profile as User);
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (email: string, password: string, username: string, fullName: string) => {
    const { data, error: signUpError } = await supabase.auth.signUp({ 
      email, 
      password 
    });

    if (signUpError) throw signUpError;
    if (!data.user) throw new Error('Error al crear usuario');

    const newUserProfile = {
      id: data.user.id,
      username: username.toLowerCase().trim(),
      email: email.trim(),
      fullName: fullName.trim(),
      avatar: DEFAULT_AVATAR,
      bio: '',
      joinedAt: Date.now(),
      followers: [],
      following: []
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([newUserProfile]);

    if (profileError) throw profileError;
    
    setCurrentUser(newUserProfile as User);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const enterDemoMode = () => {
    const mockUser: User = {
      id: 'demo-user',
      username: 'invitado',
      email: 'demo@socialapp.com',
      fullName: 'Usuario Invitado',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky',
      bio: 'Modo Demo Activo',
      joinedAt: Date.now(),
      followers: [],
      following: []
    };
    setCurrentUser(mockUser);
    setIsDemoMode(true);
  };

  const updateCurrentUser = async (userData: Partial<User>) => {
    if (!currentUser || isDemoMode) {
      if (isDemoMode) setCurrentUser({ ...currentUser!, ...userData });
      return;
    }
    
    const { error } = await supabase
      .from('profiles')
      .update(userData)
      .eq('id', currentUser.id);

    if (error) throw error;
    setCurrentUser({ ...currentUser, ...userData });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-4 border-[#2ECC71] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#2ECC71] text-xs font-black uppercase animate-pulse">Iniciando SocialApp...</p>
      </div>
    );
  }

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
