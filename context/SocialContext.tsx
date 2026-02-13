import React, { createContext, useContext, useState, useEffect } from 'react';
import { Post, User, AppState, Notification, NotificationType, Message, Story } from '../types';
import { INITIAL_DATA } from '../constants';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface SocialContextType {
  posts: Post[];
  users: User[];
  stories: Story[];
  notifications: Notification[];
  messages: Message[];
  addPost: (imageUrl: string, caption: string, type: 'image' | 'video') => void;
  repostPost: (postId: string) => void;
  addStory: (imageUrl: string, type: 'image' | 'video') => void;
  deletePost: (postId: string) => void;
  deleteStory: (storyId: string) => void;
  toggleLike: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  deleteComment: (postId: string, commentId: string) => void;
  toggleFollow: (targetUserId: string) => void;
  respondToFriendRequest: (notificationId: string, status: 'accepted' | 'rejected') => void;
  sendMessage: (receiverId: string, text: string) => void;
  markNotificationsAsRead: () => void;
  markMessagesAsRead: (senderId: string) => void;
  registerUser: (user: User) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export const SocialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, updateCurrentUser } = useAuth();
  
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('insta_clone_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_DATA;
      }
    }
    return INITIAL_DATA;
  });

  // Efecto para cargar datos desde Supabase si está configurado
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const fetchData = async () => {
        const { data: posts } = await supabase.from('posts').select('*').order('createdAt', { ascending: false });
        const { data: users } = await supabase.from('profiles').select('*');
        if (posts || users) {
          setState(prev => ({
            ...prev,
            posts: posts || prev.posts,
            users: users || prev.users
          }));
        }
      };
      fetchData();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('insta_clone_data', JSON.stringify(state));
  }, [state]);

  const registerUser = async (user: User) => {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('profiles').insert(user);
    }
    setState(prev => ({ ...prev, users: [...prev.users, user] }));
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('profiles').update(updates).eq('id', userId);
    }
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, ...updates } : u)
    }));
    if (currentUser && userId === currentUser.id) updateCurrentUser(updates);
  };

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

    if (isSupabaseConfigured && supabase) {
      await supabase.from('posts').insert(newPost);
    }
    
    setState(prev => ({ ...prev, posts: [newPost, ...prev.posts] }));
  };

  const repostPost = (postId: string) => {
    if (!currentUser) return;
    const originalPost = state.posts.find(p => p.id === postId);
    if (!originalPost) return;

    const newRepost: Post = {
      ...originalPost,
      id: 'repost-' + Date.now(),
      userId: currentUser.id,
      username: currentUser.username,
      userAvatar: currentUser.avatar,
      createdAt: Date.now(),
      repostOf: originalPost.id,
      repostedBy: currentUser.fullName,
      likes: [],
      comments: []
    };

    setState(prev => ({ ...prev, posts: [newRepost, ...prev.posts] }));
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

  const deletePost = async (postId: string) => {
    if (isSupabaseConfigured && supabase) await supabase.from('posts').delete().eq('id', postId);
    setState(prev => ({ ...prev, posts: prev.posts.filter(p => p.id !== postId) }));
  };

  const deleteStory = (storyId: string) => {
    setState(prev => ({ ...prev, stories: prev.stories.filter(s => s.id !== storyId) }));
  };

  const toggleLike = async (postId: string) => {
    if (!currentUser) return;
    setState(prev => {
      const posts = prev.posts.map(p => {
        if (p.id === postId) {
          const isLiked = p.likes.includes(currentUser.id);
          const newLikes = isLiked 
            ? p.likes.filter(id => id !== currentUser.id)
            : [...p.likes, currentUser.id];
          
          if (isSupabaseConfigured && supabase) {
            supabase.from('posts').update({ likes: newLikes }).eq('id', postId);
          }
          return { ...p, likes: newLikes };
        }
        return p;
      });
      return { ...prev, posts };
    });
  };

  const addComment = (postId: string, text: string) => {
    if (!currentUser) return;
    setState(prev => {
      const posts = prev.posts.map(p => {
        if (p.id === postId) {
          const newComments = [...p.comments, {
            id: 'c-' + Date.now(),
            userId: currentUser.id,
            username: currentUser.username,
            text,
            createdAt: Date.now()
          }];
          if (isSupabaseConfigured && supabase) {
            supabase.from('posts').update({ comments: newComments }).eq('id', postId);
          }
          return { ...p, comments: newComments };
        }
        return p;
      });
      return { ...prev, posts };
    });
  };

  const deleteComment = (postId: string, commentId: string) => {
    setState(prev => ({
      ...prev,
      posts: prev.posts.map(p => {
        if (p.id === postId) {
          const newComments = p.comments.filter(c => c.id !== commentId);
          if (isSupabaseConfigured && supabase) {
            supabase.from('posts').update({ comments: newComments }).eq('id', postId);
          }
          return { ...p, comments: newComments };
        }
        return p;
      })
    }));
  };

  const toggleFollow = (targetUserId: string) => {
    if (!currentUser) return;
    setState(prev => {
      const isFriend = currentUser.following.includes(targetUserId);
      const newFollowing = isFriend 
        ? currentUser.following.filter(id => id !== targetUserId)
        : [...currentUser.following, targetUserId];
      
      updateCurrentUser({ following: newFollowing });
      return { ...prev };
    });
  };

  const respondToFriendRequest = (notificationId: string, status: 'accepted' | 'rejected') => {
    setState(prev => ({ ...prev }));
  };

  const sendMessage = (receiverId: string, text: string) => {
    if (!currentUser) return;
    const newMessage: Message = {
      id: 'm-' + Date.now(),
      senderId: currentUser.id,
      receiverId,
      text,
      timestamp: Date.now()
    };
    setState(prev => ({ ...prev, messages: [...prev.messages, newMessage] }));
  };

  const markNotificationsAsRead = () => {};
  const markMessagesAsRead = (senderId: string) => {};

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
      registerUser,
      updateUser
    }}>
      {children}
    </SocialContext.Provider>
  );
};

export const useSocial = () => {
  const context = useContext(SocialContext);
  if (!context) throw new Error('useSocial must be used within SocialProvider');
  return context;
};