
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
  
  const postComments = (comments || [])
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

  const postLikes = (likes || [])
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

  // Limpiar mensajes al cerrar sesión
  useEffect(() => {
    if (!currentUser) {
      setState(INITIAL_DATA);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isDemoMode || !isSupabaseConfigured || !supabase || !currentUser) {
      if (!currentUser) setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const [postsRes, profilesRes, commentsRes, likesRes, notifsRes] = await Promise.all([
          supabase.from('posts').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('*'),
          supabase.from('comments').select('*').order('created_at', { ascending: true }),
          supabase.from('likes').select('*'),
          supabase.from('notifications').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false })
        ]);

        if (profilesRes.data) {
          const appUsers = profilesRes.data.map(mapDbProfileToUser);
          const allComments = commentsRes.data || [];
          const allLikes = likesRes.data || [];
          const appPosts = (postsRes.data || []).map(p => mapDbPostToApp(p, appUsers, allComments, allLikes));
          
          setState(prev => ({
            ...prev,
            users: appUsers,
            posts: appPosts,
            notifications: (notifsRes.data || []).map(n => ({
              id: n.id,
              type: n.type as NotificationType,
              senderId: n.sender_id,
              senderUsername: appUsers.find(u => u.id === n.sender_id)?.username || 'alguien',
              senderAvatar: appUsers.find(u => u.id === n.sender_id)?.avatar || '',
              receiverId: n.user_id,
              referenceId: n.reference_id,
              createdAt: new Date(n.created_at).getTime(),
              read: n.read,
              status: n.status
            }))
          }));
        }
      } catch (e) {
        console.error("Error cargando datos:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // SUSCRIPCIONES REAL-TIME (Solo interacciones sociales)
    const likesChannel = supabase.channel('likes-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, (payload: any) => {
        const { eventType, new: newLike, old: oldLike } = payload;
        setState(prev => ({
          ...prev,
          posts: prev.posts.map(p => {
            if (eventType === 'INSERT' && p.id === newLike.post_id) {
              return { ...p, likes: [...new Set([...p.likes, newLike.user_id])] };
            }
            if (eventType === 'DELETE' && p.id === oldLike.post_id) {
              return { ...p, likes: p.likes.filter(id => id !== oldLike.user_id) };
            }
            return p;
          })
        }));
      }).subscribe();

    const commentsChannel = supabase.channel('comments-sync')
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
          posts: prev.posts.map(p => p.id === c.post_id ? { ...p, comments: [...p.comments, newComment] } : p)
        }));
      }).subscribe();

    const notifChannel = supabase.channel(`notifs-${currentUser.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${currentUser.id}` 
      }, async (payload: any) => {
        const n = payload.new;
        if (n.type === 'MESSAGE') return; // Ignoramos mensajes de DB para mantener modo local
        
        const sender = state.users.find(u => u.id === n.sender_id);
        const newNotif: Notification = {
          id: n.id,
          type: n.type as NotificationType,
          senderId: n.sender_id,
          senderUsername: sender?.username || 'alguien',
          senderAvatar: sender?.avatar || '',
          receiverId: n.user_id,
          referenceId: n.reference_id,
          createdAt: new Date(n.created_at).getTime(),
          read: n.read,
          status: n.status
        };
        setState(prev => ({ ...prev, notifications: [newNotif, ...prev.notifications] }));
      }).subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(notifChannel);
    };
  }, [currentUser?.id]);

  const toggleLike = async (postId: string) => {
    if (!currentUser || isDemoMode) return;
    try {
      const { data: existing } = await supabase.from('likes').select('id').eq('post_id', postId).eq('user_id', currentUser.id).maybeSingle();
      if (existing) {
        await supabase.from('likes').delete().eq('id', existing.id);
      } else {
        await supabase.from('likes').insert([{ post_id: postId, user_id: currentUser.id }]);
        const post = state.posts.find(p => p.id === postId);
        if (post && post.userId !== currentUser.id) {
          await supabase.from('notifications').insert([{ user_id: post.userId, sender_id: currentUser.id, type: 'LIKE', reference_id: postId }]);
        }
      }
    } catch (e) { console.error(e); }
  };

  const addComment = async (postId: string, text: string) => {
    if (!currentUser || isDemoMode) return;
    try {
      await supabase.from('comments').insert([{ post_id: postId, user_id: currentUser.id, content: text }]);
      const post = state.posts.find(p => p.id === postId);
      if (post && post.userId !== currentUser.id) {
        await supabase.from('notifications').insert([{ user_id: post.userId, sender_id: currentUser.id, type: 'COMMENT', reference_id: postId }]);
      }
    } catch (e) { console.error(e); }
  };

  // MENSAJERÍA LOCAL CON AUTO-RESPUESTA
  const sendMessage = async (rid: string, t: string) => {
    if (!currentUser) return;
    
    const messageId = 'local-msg-' + Date.now();
    const newMessage: Message = { 
      id: messageId, 
      senderId: currentUser.id, 
      receiverId: rid, 
      text: t, 
      timestamp: Date.now() 
    };

    // 1. Añadimos el mensaje que nosotros enviamos
    setState(p => ({ ...p, messages: [...p.messages, newMessage] }));

    // 2. Simular respuesta del otro usuario (para ver que funciona el chat)
    setTimeout(() => {
      const replyId = 'reply-' + Date.now();
      const replyMsg: Message = {
        id: replyId,
        senderId: rid,
        receiverId: currentUser.id,
        text: `¡Hola! Recibí tu mensaje: "${t}"`,
        timestamp: Date.now()
      };

      const sender = state.users.find(u => u.id === rid);
      const localNotif: Notification = {
        id: 'local-notif-' + Date.now(),
        type: NotificationType.MESSAGE,
        senderId: rid,
        senderUsername: sender?.username || 'usuario',
        senderAvatar: sender?.avatar || '',
        receiverId: currentUser.id,
        referenceId: replyId,
        createdAt: Date.now(),
        read: false
      };

      setState(p => ({ 
        ...p, 
        messages: [...p.messages, replyMsg],
        notifications: [localNotif, ...p.notifications]
      }));
    }, 1500);
  };

  const markMessagesAsRead = async (sid: string) => {
    setState(p => ({
      ...p,
      notifications: p.notifications.map(n => 
        n.senderId === sid && n.type === NotificationType.MESSAGE ? { ...n, read: true } : n
      )
    }));
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!currentUser || isDemoMode) return;
    try {
      if (!currentUser.following.includes(targetUserId)) {
        const { data: req, error } = await supabase.from('friend_requests').insert([{ 
          sender_id: currentUser.id, 
          receiver_id: targetUserId,
          status: 'pending'
        }]).select().single();
        if (error) throw error;
        if (req) {
          await supabase.from('notifications').insert([{ 
            user_id: targetUserId, 
            sender_id: currentUser.id, 
            type: 'FRIEND_REQUEST', 
            reference_id: req.id 
          }]);
        }
      }
    } catch (e) { console.warn("Solicitud ya existe:", e); }
  };

  const respondToFriendRequest = async (notificationId: string, status: 'accepted' | 'rejected') => {
    const notif = state.notifications.find(n => n.id === notificationId);
    if (!notif || !currentUser || isDemoMode) return;
    const senderId = notif.senderId;
    try {
      if (status === 'accepted') {
        await supabase.from('friend_requests').update({ status: 'accepted' }).match({ sender_id: senderId, receiver_id: currentUser.id });
        await supabase.from('friends').insert([{ user_id: currentUser.id, friend_id: senderId }, { user_id: senderId, friend_id: currentUser.id }]);
        await supabase.from('notifications').insert([{ user_id: senderId, sender_id: currentUser.id, type: 'FRIEND_ACCEPTED' }]);

        const sender = state.users.find(u => u.id === senderId);
        if (sender) {
          const myNewFol = [...new Set([...currentUser.following, senderId])];
          const myNewFers = [...new Set([...currentUser.followers, senderId])];
          const sndNewFol = [...new Set([...sender.following, currentUser.id])];
          const sndNewFers = [...new Set([...sender.followers, currentUser.id])];

          await updateCurrentUser({ following: myNewFol, followers: myNewFers });
          await supabase.from('profiles').update({ following: sndNewFol, followers: sndNewFers }).eq('id', senderId);

          setState(p => ({
            ...p,
            users: p.users.map(u => {
              if (u.id === senderId) return { ...u, following: sndNewFol, followers: sndNewFers };
              if (u.id === currentUser.id) return { ...u, following: myNewFol, followers: myNewFers };
              return u;
            })
          }));
        }
      } else {
        await supabase.from('friend_requests').delete().match({ sender_id: senderId, receiver_id: currentUser.id });
      }
      await supabase.from('notifications').update({ read: true, status }).eq('id', notificationId);
      setState(p => ({ ...p, notifications: p.notifications.map(n => n.id === notificationId ? { ...n, status, read: true } : n) }));
    } catch (e) { console.error(e); }
  };

  const addPost = async (imageUrl: string, content: string, type: 'image' | 'video' = 'image') => {
    if (!currentUser || isDemoMode) return;
    try {
      const { data } = await supabase.from('posts').insert([{ user_id: currentUser.id, content, image_url: imageUrl, type }]).select().single();
      if (data) setState(prev => ({ ...prev, posts: [mapDbPostToApp(data, prev.users), ...prev.posts] }));
    } catch (e) { console.error(e); }
  };

  const deletePost = async (id: string) => {
    setState(p => ({ ...p, posts: p.posts.filter(x => x.id !== id) }));
    if (!isDemoMode) await supabase.from('posts').delete().eq('id', id);
  };

  const deleteComment = async (pid: string, cid: string) => {
    setState(p => ({ ...p, posts: p.posts.map(x => x.id === pid ? { ...x, comments: x.comments.filter(c => c.id !== cid) } : x) }));
    if (!isDemoMode) await supabase.from('comments').delete().eq('id', cid);
  };

  const repostPost = async (id: string) => {
    const p = state.posts.find(x => x.id === id);
    if (p && currentUser) await addPost(p.imageUrl, `RT @${p.username}: ${p.content}`, p.type);
  };

  const addStory = async (url: string, type: any) => {
    if (currentUser) setState(p => ({ ...p, stories: [{ id: Date.now().toString(), userId: currentUser.id, username: currentUser.username, userAvatar: currentUser.avatar, imageUrl: url, type, createdAt: Date.now() }, ...p.stories] }));
  };

  const deleteStory = async (id: string) => setState(p => ({ ...p, stories: p.stories.filter(x => x.id !== id) }));
  
  const updateUser = async (id: string, d: any) => {
    setState(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, ...d } : u) }));
    if (currentUser?.id === id) await updateCurrentUser(d);
  };

  const markNotificationsAsRead = async () => {
    if (!currentUser || isDemoMode) return;
    setState(p => ({ ...p, notifications: p.notifications.map(n => ({ ...n, read: true })) }));
    await supabase.from('notifications').update({ read: true }).eq('user_id', currentUser.id);
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
