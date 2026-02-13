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
            })),
            messages: (msgsRes.data || []).map(m => ({
              id: m.id,
              senderId: m.sender_id,
              receiverId: m.receiver_id,
              text: m.text,
              timestamp: new Date(m.created_at).getTime()
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

    // Suscripciones Real-time
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

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
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

  const addPost = async (imageUrl: string, content: string, type: 'image' | 'video' = 'image') => {
    if (!currentUser) return;
    try {
      const { data } = await supabase.from('posts').insert([{ user_id: currentUser.id, content, image_url: imageUrl, type }]).select().single();
      if (data) setState(prev => ({ ...prev, posts: [mapDbPostToApp(data, prev.users), ...prev.posts] }));
    } catch (e) { console.error(e); }
  };

  const respondToFriendRequest = async (notificationId: string, status: 'accepted' | 'rejected') => {
    const notif = state.notifications.find(n => n.id === notificationId);
    if (!notif || !currentUser) return;
    const senderId = notif.senderId;
    if (status === 'accepted') {
      await supabase.from('friends').insert([{ user_id: currentUser.id, friend_id: senderId }, { user_id: senderId, friend_id: currentUser.id }]);
      await supabase.from('friend_requests').delete().match({ sender_id: senderId, receiver_id: currentUser.id });
      await supabase.from('notifications').insert([{ user_id: senderId, sender_id: currentUser.id, type: 'FRIEND_ACCEPTED' }]);
    } else {
      await supabase.from('friend_requests').delete().match({ sender_id: senderId, receiver_id: currentUser.id });
    }
    setState(prev => ({ ...prev, notifications: prev.notifications.map(n => n.id === notificationId ? { ...n, status, read: true } : n) }));
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!currentUser || isDemoMode) return;
    if (!currentUser.following.includes(targetUserId)) {
      const { data: req } = await supabase.from('friend_requests').insert([{ sender_id: currentUser.id, receiver_id: targetUserId }]).select().single();
      if (req) await supabase.from('notifications').insert([{ user_id: targetUserId, sender_id: currentUser.id, type: 'FRIEND_REQUEST', reference_id: req.id }]);
    }
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
    setState(p => ({ ...p, notifications: p.notifications.map(n => ({ ...n, read: true })) }));
    if (currentUser) await supabase.from('notifications').update({ read: true }).eq('user_id', currentUser.id);
  };

  const sendMessage = async (rid: string, t: string) => {
    if (!currentUser) return;
    const { data: m } = await supabase.from('messages').insert([{ sender_id: currentUser.id, receiver_id: rid, text: t }]).select().single();
    if (m) {
      await supabase.from('notifications').insert([{ user_id: rid, sender_id: currentUser.id, type: 'MESSAGE', reference_id: m.id }]);
      // Fix: 'prev' was not defined, changing it to 'p' which is the argument of the updater function.
      setState(p => ({ ...p, messages: [...p.messages, { id: m.id, senderId: currentUser.id, receiverId: rid, text: t, timestamp: Date.now() }] }));
    }
  };

  const markMessagesAsRead = async (sid: string) => {
    if (currentUser) await supabase.from('notifications').update({ read: true }).match({ user_id: currentUser.id, sender_id: sid, type: 'MESSAGE' });
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