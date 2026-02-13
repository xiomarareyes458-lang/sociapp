
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Post, User, AppState, Notification, Message, Story, NotificationType, Comment } from './types';
import { INITIAL_DATA } from './constants';
import { useAuth, mapDbProfileToUser } from './context/AuthContext';
import { supabase, isSupabaseConfigured } from './lib/supabase';

interface SocialContextType {
  posts: Post[];
  users: User[];
  stories: Story[];
  notifications: Notification[];
  messages: Message[];
  isLoading: boolean;
  addPost: (imageUrl: string, content: string, type: 'image' | 'video') => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  repostPost: (postId: string) => Promise<void>;
  toggleFollow: (targetUserId: string) => Promise<void>;
  addStory: (imageUrl: string, type: 'image' | 'video') => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;
  updateUser: (userId: string, data: Partial<User>) => Promise<void>;
  markNotificationsAsRead: () => Promise<void>;
  respondToFriendRequest: (notificationId: string, status: 'accepted' | 'rejected') => Promise<void>;
  sendMessage: (receiverId: string, text: string) => Promise<void>;
  markMessagesAsRead: (senderId: string) => Promise<void>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

const mapDbPostToApp = (p: any, users: User[], comments: any[] = [], likes: any[] = []): Post => {
  const author = users.find(u => u.id === p.user_id);
  
  const postComments = comments
    .filter(c => c.post_id === p.id)
    .map(c => {
      const cAuthor = users.find(u => u.id === c.user_id);
      return {
        id: c.id,
        userId: c.user_id,
        username: cAuthor?.username || 'usuario',
        text: c.content || c.text,
        createdAt: new Date(c.created_at).getTime()
      };
    })
    .sort((a, b) => a.createdAt - b.createdAt);

  const postLikes = likes
    .filter(l => l.post_id === p.id)
    .map(l => l.user_id);

  return {
    id: p.id || '',
    userId: p.user_id || '',
    username: author?.username || 'usuario',
    userAvatar: author?.avatar || '',
    imageUrl: p.image_url || '',
    type: p.type || 'image',
    content: p.content || '',
    likes: postLikes,
    comments: postComments,
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now()
  };
};

export const SocialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isDemoMode, updateCurrentUser } = useAuth();
  const [state, setState] = useState<AppState>(INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode || !isSupabaseConfigured || !supabase || !currentUser) {
      if (!currentUser) setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const [postsRes, profilesRes, commentsRes, likesRes, notifsRes, msgsRes] = await Promise.all([
          supabase.from('posts').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('*'),
          supabase.from('comments').select('*').order('created_at', { ascending: true }),
          supabase.from('likes').select('*'),
          supabase.from('notifications').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }),
          supabase.from('messages').select('*').or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        ]);

        if (profilesRes.data) {
          const appUsers = profilesRes.data.map(mapDbProfileToUser);
          const allComments = commentsRes.data || [];
          const allLikes = likesRes.data || [];
          const appPosts = (postsRes.data || []).map(p => mapDbPostToApp(p, appUsers, allComments, allLikes));
          
          const appMsgs = (msgsRes.data || []).map((m: any) => ({
            id: m.id,
            senderId: m.sender_id,
            receiverId: m.receiver_id,
            text: m.text,
            timestamp: new Date(m.created_at).getTime()
          }));
          
          const appNotifs = (notifsRes.data || []).map((n: any) => {
            const sender = appUsers.find(u => u.id === n.sender_id);
            return {
              id: n.id,
              type: n.type as NotificationType,
              senderId: n.sender_id,
              senderUsername: sender?.username || 'usuario',
              senderAvatar: sender?.avatar || '',
              receiverId: n.user_id,
              referenceId: n.reference_id,
              createdAt: new Date(n.created_at).getTime(),
              read: n.read,
              status: n.type === 'FRIEND_REQUEST' ? n.status : undefined
            };
          });

          setState(prev => ({
            ...prev,
            users: appUsers,
            posts: appPosts,
            notifications: appNotifs,
            messages: appMsgs
          }));
        }
      } catch (e) {
        console.error("Error inicial:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // SUSCRIPCIONES REAL-TIME MEJORADAS
    
    // 1. Likes Real-time (Sincronización global)
    const likesChannel = supabase
      .channel('public_likes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, (payload: any) => {
        const { eventType, new: newLike, old: oldLike } = payload;
        setState(prev => ({
          ...prev,
          posts: prev.posts.map(p => {
            if (eventType === 'INSERT' && p.id === newLike.post_id) {
              return { ...p, likes: Array.from(new Set([...(p.likes || []), newLike.user_id])) };
            }
            if (eventType === 'DELETE' && p.id === oldLike.post_id) {
              return { ...p, likes: (p.likes || []).filter(id => id !== oldLike.user_id) };
            }
            return p;
          })
        }));
      })
      .subscribe();

    // 2. Comentarios Real-time
    const commentsChannel = supabase
      .channel('public_comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload: any) => {
        const c = payload.new;
        const author = state.users.find(u => u.id === c.user_id);
        const newComment: Comment = {
          id: c.id,
          userId: c.user_id,
          username: author?.username || 'usuario',
          text: c.content || c.text,
          createdAt: new Date(c.created_at).getTime()
        };
        setState(prev => ({
          ...prev,
          posts: prev.posts.map(p => p.id === c.post_id ? { ...p, comments: [...(p.comments || []), newComment] } : p)
        }));
      })
      .subscribe();

    // 3. Notificaciones Propias Real-time
    const notifChannel = supabase
      .channel(`notifs_${currentUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` }, async (payload: any) => {
        const n = payload.new;
        const sender = state.users.find(u => u.id === n.sender_id);
        const notification: Notification = {
          id: n.id,
          type: n.type as NotificationType,
          senderId: n.sender_id,
          senderUsername: sender?.username || 'usuario',
          senderAvatar: sender?.avatar || '',
          receiverId: n.user_id,
          referenceId: n.reference_id,
          createdAt: new Date(n.created_at).getTime(),
          read: n.read,
          status: n.status
        };
        setState(prev => ({ ...prev, notifications: [notification, ...prev.notifications] }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(notifChannel);
    };
  }, [currentUser?.id]);

  const toggleLike = async (postId: string) => {
    if (!currentUser || isDemoMode) return;
    try {
      const post = state.posts.find(p => p.id === postId);
      const { data: existingLike } = await supabase.from('likes').select('id').eq('post_id', postId).eq('user_id', currentUser.id).maybeSingle();

      if (existingLike) {
        await supabase.from('likes').delete().eq('id', existingLike.id);
      } else {
        await supabase.from('likes').insert([{ post_id: postId, user_id: currentUser.id }]);
        if (post && post.userId !== currentUser.id) {
          await supabase.from('notifications').insert([{ user_id: post.userId, sender_id: currentUser.id, type: 'LIKE', reference_id: postId }]);
        }
      }
    } catch (e) { console.error("Error toggleLike:", e); }
  };

  const addComment = async (postId: string, text: string) => {
    if (!currentUser || isDemoMode) return;
    try {
      const { data: comment, error } = await supabase.from('comments').insert([{ post_id: postId, user_id: currentUser.id, content: text }]).select().single();
      if (error) throw error;
      
      const post = state.posts.find(p => p.id === postId);
      if (post && post.userId !== currentUser.id) {
        await supabase.from('notifications').insert([{ user_id: post.userId, sender_id: currentUser.id, type: 'COMMENT', reference_id: postId }]);
      }
    } catch (e) { console.error("Error addComment:", e); }
  };

  const respondToFriendRequest = async (notificationId: string, status: 'accepted' | 'rejected') => {
    const notif = state.notifications.find(n => n.id === notificationId);
    if (!notif || !currentUser || isDemoMode) return;
    const senderId = notif.senderId;
    const receiverId = currentUser.id;

    if (status === 'accepted') {
      try {
        // Amistad mutua
        await supabase.from('friends').insert([
          { user_id: receiverId, friend_id: senderId },
          { user_id: senderId, friend_id: receiverId }
        ]);
        // Eliminar solicitud
        await supabase.from('friend_requests').delete().or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`);
        // Notificar aceptación
        await supabase.from('notifications').insert([{ user_id: senderId, sender_id: receiverId, type: 'FRIEND_ACCEPTED' }]);
        
        // Actualizar UI local
        const sender = state.users.find(u => u.id === senderId);
        if (sender) {
          const newSenderFol = Array.from(new Set([...(sender.following || []), receiverId]));
          const newSenderFers = Array.from(new Set([...(sender.followers || []), receiverId]));
          const newMyFol = Array.from(new Set([...(currentUser.following || []), senderId]));
          const newMyFers = Array.from(new Set([...(currentUser.followers || []), senderId]));

          setState(prev => ({
            ...prev,
            users: prev.users.map(u => {
              if (u.id === senderId) return { ...u, following: newSenderFol, followers: newSenderFers };
              if (u.id === receiverId) return { ...u, following: newMyFol, followers: newMyFers };
              return u;
            }),
            notifications: prev.notifications.map(n => n.id === notificationId ? { ...n, status: 'accepted', read: true } : n)
          }));
          await updateCurrentUser({ following: newMyFol, followers: newMyFers });
          await supabase.from('profiles').update({ following: newSenderFol, followers: newSenderFers }).eq('id', senderId);
        }
      } catch (e) { console.error(e); }
    } else {
      await supabase.from('friend_requests').delete().eq('sender_id', senderId).eq('receiver_id', receiverId);
      setState(prev => ({ ...prev, notifications: prev.notifications.map(n => n.id === notificationId ? { ...n, status: 'rejected', read: true } : n) }));
    }
  };

  const addPost = async (imageUrl: string, content: string, type: 'image' | 'video' = 'image') => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase.from('posts').insert([{ user_id: currentUser.id, content, image_url: imageUrl, type }]).select().single();
      if (error) throw error;
      setState(prev => ({ ...prev, posts: [mapDbPostToApp(data, prev.users), ...prev.posts] }));
    } catch (e) { console.error(e); }
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!currentUser || isDemoMode) return;
    if (currentUser.following.includes(targetUserId)) {
        // Unfollow simple
        const newFol = currentUser.following.filter(id => id !== targetUserId);
        await updateCurrentUser({ following: newFol });
        const target = state.users.find(u => u.id === targetUserId);
        const newTargetFers = (target?.followers || []).filter(id => id !== currentUser.id);
        await supabase.from('profiles').update({ followers: newTargetFers }).eq('id', targetUserId);
        setState(prev => ({
            ...prev,
            users: prev.users.map(u => u.id === targetUserId ? { ...u, followers: newTargetFers } : u)
        }));
    } else {
      try {
        const { data: request } = await supabase.from('friend_requests').insert([{ sender_id: currentUser.id, receiver_id: targetUserId }]).select().single();
        await supabase.from('notifications').insert([{ user_id: targetUserId, sender_id: currentUser.id, type: 'FRIEND_REQUEST', reference_id: request.id }]);
      } catch (e) { console.warn("Ya existe una solicitud"); }
    }
  };

  const deletePost = async (postId: string) => {
    setState(prev => ({ ...prev, posts: prev.posts.filter(p => p.id !== postId) }));
    if (!isDemoMode) await supabase.from('posts').delete().eq('id', postId);
  };

  const deleteComment = async (postId: string, commentId: string) => {
    setState(prev => ({ ...prev, posts: prev.posts.map(p => p.id === postId ? { ...p, comments: (p.comments || []).filter(c => c.id !== commentId) } : p) }));
    if (!isDemoMode) await supabase.from('comments').delete().eq('id', commentId);
  };

  const repostPost = async (postId: string) => {
    if (!currentUser) return;
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;
    const newPost: Post = { ...post, id: 'repost-' + Date.now(), userId: currentUser.id, username: currentUser.username, userAvatar: currentUser.avatar, createdAt: Date.now(), repostOf: post.id, repostedBy: currentUser.username, likes: [], comments: [] };
    setState(prev => ({ ...prev, posts: [newPost, ...prev.posts] }));
  };

  const addStory = async (imageUrl: string, type: 'image' | 'video') => {
    if (!currentUser) return;
    const story: Story = { id: 'story-' + Date.now(), userId: currentUser.id, username: currentUser.username, userAvatar: currentUser.avatar, imageUrl, type, createdAt: Date.now() };
    setState(prev => ({ ...prev, stories: [story, ...prev.stories] }));
  };

  // Fixed: Changed deleteStory to be an async function to return Promise<void>
  const deleteStory = async (id: string) => {
    setState(p => ({ ...p, stories: p.stories.filter(s => s.id !== id) }));
  };

  const updateUser = async (id: string, d: any) => {
    setState(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, ...d } : u) }));
    if (currentUser?.id === id) await updateCurrentUser(d);
  };

  const markNotificationsAsRead = async () => {
    setState(p => ({ ...p, notifications: p.notifications.map(n => ({ ...n, read: true })) }));
    if (!isDemoMode && currentUser) await supabase.from('notifications').update({ read: true }).eq('user_id', currentUser.id);
  };

  const sendMessage = async (rid: string, t: string) => {
    if (!currentUser) return;
    const { data: m } = await supabase.from('messages').insert([{ sender_id: currentUser.id, receiver_id: rid, text: t }]).select().single();
    await supabase.from('notifications').insert([{ user_id: rid, sender_id: currentUser.id, type: 'MESSAGE', reference_id: m.id }]);
    setState(p => ({ ...p, messages: [...p.messages, { id: m.id, senderId: currentUser.id, receiverId: rid, text: t, timestamp: Date.now() }] }));
  };

  const markMessagesAsRead = async (sid: string) => {
    setState(p => ({ ...p, notifications: p.notifications.map(n => n.senderId === sid && n.type === 'MESSAGE' ? { ...n, read: true } : n) }));
    if (!isDemoMode && currentUser) await supabase.from('notifications').update({ read: true }).eq('user_id', currentUser.id).eq('sender_id', sid).eq('type', 'MESSAGE');
  };

  return (
    <SocialContext.Provider value={{ 
      ...state, isLoading, addPost, toggleLike, addComment, deletePost, deleteComment, repostPost, 
      toggleFollow, addStory, deleteStory, updateUser, markNotificationsAsRead, respondToFriendRequest, 
      sendMessage, markMessagesAsRead 
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
