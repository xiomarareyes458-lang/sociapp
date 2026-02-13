import React, { createContext, useContext, useState, useEffect } from 'react';
import { Post, User, AppState, Notification, Message, Story } from '../types';
import { INITIAL_DATA } from '../constants';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface SocialContextType {
  posts: Post[];
  users: User[];
  stories: Story[];
  notifications: Notification[];
  messages: Message[];
  addPost: (imageUrl: string, caption: string, type: 'image' | 'video') => Promise<void>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

const mapDbPostToApp = (p: any): Post => ({
  id: p.id,
  userId: p.user_id,
  username: p.username,
  userAvatar: p.user_avatar,
  imageUrl: p.image_url,
  type: p.type,
  caption: p.caption,
  likes: p.likes || [],
  comments: p.comments || [],
  createdAt: new Date(p.created_at).getTime()
});

const mapDbProfileToApp = (p: any): User => ({
  id: p.id,
  username: p.username,
  email: p.email,
  fullName: p.full_name,
  avatar: p.avatar_url,
  bio: p.bio || '',
  joinedAt: p.joined_at ? Number(p.joined_at) : Date.now(),
  coverPhoto: p.cover_photo,
  followers: p.followers || [],
  following: p.following || []
});

export const SocialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isDemoMode } = useAuth();
  const [state, setState] = useState<AppState>(INITIAL_DATA);

  useEffect(() => {
    if (isDemoMode || !supabase) return;

    const loadData = async () => {
      try {
        const [postsRes, profilesRes] = await Promise.all([
          supabase.from('posts').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('*')
        ]);

        setState(prev => ({
          ...prev,
          posts: postsRes.data ? postsRes.data.map(mapDbPostToApp) : [],
          users: profilesRes.data ? profilesRes.data.map(mapDbProfileToApp) : []
        }));
      } catch (e) {
        console.error("Error cargando SocialData:", e);
      }
    };

    loadData();
  }, [isDemoMode, currentUser?.id]);

  const addPost = async (imageUrl: string, caption: string, type: 'image' | 'video' = 'image') => {
    if (!currentUser || !supabase) return;

    const newPostData = {
      user_id: currentUser.id,
      username: currentUser.username,
      user_avatar: currentUser.avatar,
      image_url: imageUrl,
      type,
      caption,
      likes: [],
      comments: [],
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('posts')
      .insert([newPostData])
      .select()
      .single();

    if (error) throw error;

    setState(prev => ({
      ...prev,
      posts: [mapDbPostToApp(data), ...prev.posts]
    }));
  };

  return (
    <SocialContext.Provider value={{ ...state, addPost }}>
      {children}
    </SocialContext.Provider>
  );
};

export const useSocial = () => {
  const context = useContext(SocialContext);
  if (!context) throw new Error('useSocial debe usarse dentro de SocialProvider');
  return context;
};
