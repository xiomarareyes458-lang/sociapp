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
  repostPost: (postId: string) => void;
  addStory: (imageUrl: string, type: 'image' | 'video') => void;
  deletePost: (postId: string) => Promise<void>;
  deleteStory: (storyId: string) => void;
  toggleLike: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => void;
  deleteComment: (postId: string, commentId: string) => void;
  toggleFollow: (targetUserId: string) => void;
  respondToFriendRequest: (notificationId: string, status: 'accepted' | 'rejected') => void;
  sendMessage: (receiverId: string, text: string) => void;
  markNotificationsAsRead: () => void;
  markMessagesAsRead: (senderId: string) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export const SocialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, updateCurrentUser, isDemoMode } = useAuth();
  const [state, setState] = useState<AppState>(INITIAL_DATA);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. Carga inicial desde Supabase
  useEffect(() => {
    if (isDemoMode || !isSupabaseConfigured || !supabase) {
      setIsInitialized(true);
      return;
    }

    const loadData = async () => {
      try {
        const [postsRes, profilesRes] = await Promise.all([
          supabase.from('posts').select('*').order('createdAt', { ascending: false }),
          supabase.from('profiles').select('*')
        ]);

        if (!postsRes.error && !profilesRes.error) {
          setState(prev => ({
            ...prev,
            posts: postsRes.data.length > 0 ? (postsRes.data as Post[]) : prev.posts,
            users: profilesRes.data.length > 0 ? (profilesRes.data as User[]) : prev.users
          }));
        }
      } catch (e) {
        console.error("Error cargando datos de Supabase:", e);
      } finally {
        setIsInitialized(true);
      }
    };

    loadData();
  }, [isDemoMode]);

  // Sincronizar currentUser local con lista global de usuarios
  useEffect(() => {
    if (!currentUser) return;
    setState(prev => {
      const exists = prev.users.some(u => u.id === currentUser.id);
      if (!exists) return { ...prev, users: [...prev.users, currentUser] };
      return {
        ...prev,
        users: prev.users.map(u => u.id === currentUser.id ? { ...u, ...currentUser } : u)
      };
    });
  }, [currentUser]);

  const addPost = async (imageUrl: string, caption: string, type: 'image' | 'video' = 'image') => {
    if (!currentUser) return;

    const newPost: Post = {
      id: 'post-' + Date.now(),
      userId: currentUser.id,
      username: currentUser.username,
      userAvatar: currentUser.avatar,
      imageUrl,
      type,
      caption,
      likes: [],
      comments: [],
      createdAt: Date.now()
    };
    
    if (!isDemoMode && isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('posts').insert([newPost]);
      if (error) throw error;
    } else if (!isDemoMode) {
      throw new Error('Sin conexión al servidor');
    }

    setState(prev => ({ ...prev, posts: [newPost, ...prev.posts] }));
  };

  const deletePost = async (postId: string) => {
    if (!isDemoMode && isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
    } else if (!isDemoMode) {
      throw new Error('Sin conexión al servidor');
    }
    setState(prev => ({ ...prev, posts: prev.posts.filter(p => p.id !== postId) }));
  };

  const toggleLike = async (postId: string) => {
    if (!currentUser) return;
    
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    const isLiked = post.likes.includes(currentUser.id);
    const newLikes = isLiked 
      ? post.likes.filter(id => id !== currentUser.id)
      : [...post.likes, currentUser.id];

    if (!isDemoMode && isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('posts').update({ likes: newLikes }).eq('id', postId);
      if (error) throw error;
    } else if (!isDemoMode) {
      throw new Error('Sin conexión al servidor');
    }

    setState(prev => ({
      ...prev,
      posts: prev.posts.map(p => p.id === postId ? { ...p, likes: newLikes } : p)
    }));
  };

  const addComment = async (postId: string, text: string) => {
    if (!currentUser) return;
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    const newComment = {
      id: 'c-' + Date.now(),
      userId: currentUser.id,
      username: currentUser.username,
      text,
      createdAt: Date.now()
    };

    const newComments = [...post.comments, newComment];

    if (!isDemoMode && isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('posts').update({ comments: newComments }).eq('id', postId);
      if (error) throw error;
    } else if (!isDemoMode) {
      throw new Error('Sin conexión al servidor');
    }

    setState(prev => ({
      ...prev,
      posts: prev.posts.map(p => p.id === postId ? { ...p, comments: newComments } : p)
    }));
  };

  const addStory = (imageUrl: string, type: 'image' | 'video' = 'image') => {
    if (!currentUser) return;
    const newStory: Story = {
      id: 'story-' + Date.now(),
      userId: currentUser.id,
      username: currentUser.username,
      userAvatar: currentUser.avatar,
      imageUrl,
      type,
      createdAt: Date.now()
    };
    setState(prev => ({ ...prev, stories: [newStory, ...prev.stories] }));
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!currentUser) return;
    const isFollowing = currentUser.following.includes(targetUserId);
    const newFollowing = isFollowing 
      ? currentUser.following.filter(id => id !== targetUserId)
      : [...currentUser.following, targetUserId];
    
    await updateCurrentUser({ following: newFollowing });
  };

  const deleteComment = (postId: string, commentId: string) => {
    setState(prev => ({
      ...prev,
      posts: prev.posts.map(p => p.id === postId ? { ...p, comments: p.comments.filter(c => c.id !== commentId) } : p)
    }));
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, ...updates } : u)
    }));
  };

  const repostPost = (postId: string) => {};
  const deleteStory = (storyId: string) => {};
  const respondToFriendRequest = () => {};
  const sendMessage = () => {};
  const markNotificationsAsRead = () => {};
  const markMessagesAsRead = () => {};

  return (
    <SocialContext.Provider value={{ 
      ...state, 
      addPost, 
      repostPost,
      addStory,
      deletePost, 
      deleteStory,
      toggleLike, 
      addComment, 
      deleteComment,
      toggleFollow, 
      respondToFriendRequest,
      sendMessage,
      markNotificationsAsRead,
      markMessagesAsRead,
      updateUser
    }}>
      {children}
    </SocialContext.Provider>
  );
};

export const useSocial = () => {
  const context = useContext(SocialContext);
  if (!context) throw new Error('useSocial debe usarse dentro de SocialProvider');
  return context;
};