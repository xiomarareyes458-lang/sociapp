
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  currentUser: User | null;
  // Support both Supabase (email, password) and local mode (user object)
  login: (emailOrUser: string | User, password?: string) => Promise<void>;
  logout: () => void;
  updateCurrentUser: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (!isSupabaseConfigured) {
        const storedUser = localStorage.getItem('insta_clone_user');
        if (storedUser) setCurrentUser(JSON.parse(storedUser));
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) setCurrentUser(profile);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Updated login function to handle both User object (local/mock) and string credentials (Supabase)
  const login = async (emailOrUser: string | User, password?: string) => {
    // If a User object is passed directly, we use it for local login (mock mode)
    if (typeof emailOrUser !== 'string') {
      setCurrentUser(emailOrUser);
      localStorage.setItem('insta_clone_user', JSON.stringify(emailOrUser));
      return;
    }

    // Supabase mode: login with email and password
    if (!isSupabaseConfigured || !supabase) return;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailOrUser,
      password: password || ''
    });

    if (error) {
      console.error(error.message);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profile) {
        setCurrentUser(profile);
        localStorage.setItem('insta_clone_user', JSON.stringify(profile));
      }
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setCurrentUser(null);
    localStorage.removeItem('insta_clone_user');
  };

  const updateCurrentUser = async (userData: Partial<User>) => {
    if (currentUser) {
      const updated = { ...currentUser, ...userData };
      setCurrentUser(updated);
      localStorage.setItem('insta_clone_user', JSON.stringify(updated));
      
      if (isSupabaseConfigured) {
        await supabase.from('profiles').update(userData).eq('id', currentUser.id);
      }
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#2ECC71] font-bold">Cargando...</div>;

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, updateCurrentUser, isAuthenticated: !!currentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
