
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Post, User, AppState, Notification, Message, Story, NotificationType, Comment } from '../types';
import { INITIAL_DATA } from '../constants';
import { useAuth, mapDbProfileToUser } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

// Mapper function to transform DB post data to the internal Post type
const mapDbPostToApp = (p: any, users: User[], comments: any[] = []): Post => {
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

  return {
    id: p.id || '',
    userId: p.user_id || '',
    username: author?.username || 'usuario',
    userAvatar: author?.avatar || '',
    imageUrl: p.image_url || '',
    type: p.type || 'image',
    content: p.content || '',
    likes: Array.isArray(p.likes) ? p.likes : [],
    comments: postComments,
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now()
  };
};

export const SocialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isDemoMode, updateCurrentUser } = useAuth();
  const [state, setState] = useState<AppState>(INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data from Supabase
  useEffect(() => {
    if (isDemoMode) {
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured || !supabase || !currentUser) {
      if (!currentUser) setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const [postsRes, profilesRes, commentsRes, notifsRes, messagesRes] = await Promise.all([
          supabase.from('posts').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('*'),
          supabase.from('comments').select('*').order('created_at', { ascending: true }),
          supabase.from('notifications').select('*').eq('user_id', currentUser?.id).order('created_at', { ascending: false }),
          supabase.from('messages').select('*').or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`).order('created_at', { ascending: true })
        ]);

        if (profilesRes.data) {
          const appUsers = profilesRes.data.map(mapDbProfileToUser);
          const allComments = commentsRes.data || [];
          const appPosts = postsRes.data
            ? postsRes.data.map(p => mapDbPostToApp(p, appUsers, allComments))
            : [];

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
              status: n.status
            };
          });

          const appMessages = (messagesRes.data || []).map((m: any) => ({
            id: m.id,
            senderId: m.sender_id,
            receiverId: m.receiver_id,
            text: m.text,
            timestamp: new Date(m.created_at).getTime()
          }));

          setState(prev => ({
            ...prev,
            users: appUsers,
            posts: appPosts,
            notifications: appNotifs,
            messages: appMessages
          }));
        }

      } catch (e) {
        console.error("Error cargando datos sociales:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // SUSCRIPCIONES REAL-TIME
    const channel = supabase.channel('social-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, async (payload: any) => {
         // Recargar posts o actualizar localmente
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUser.id}` }, (payload: any) => {
        const m = payload.new;
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, {
            id: m.id,
            senderId: m.sender_id,
            receiverId: m.receiver_id,
            text: m.text,
            timestamp: new Date(m.created_at).getTime()
          }]
        }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` }, (payload: any) => {
        const n = payload.new;
        setState(prev => {
          const sender = prev.users.find(u => u.id === n.sender_id);
          return {
            ...prev,
            notifications: [{
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
            }, ...prev.notifications]
          };
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [isDemoMode, currentUser?.id]);

  // Add a new post
  const addPost = async (imageUrl: string, content: string, type: 'image' | 'video' = 'image') => {
    if (!currentUser) return;
    const postPayload = {
      user_id: currentUser.id,
      content,
      image_url: imageUrl,
      type,
      created_at: new Date().toISOString()
    };

    if (!isDemoMode && supabase) {
      try {
        const { data, error } = await supabase.from('posts').insert([postPayload]).select().maybeSingle();
        if (error) throw error;
        if (data) {
          setState(prev => ({ ...prev, posts: [mapDbPostToApp(data, prev.users), ...prev.posts] }));
        }
      } catch (e) { console.error(e); }
    } else {
      const localPost = { ...mapDbPostToApp({ ...postPayload, likes: [] }, state.users), id: 'local-' + Date.now(), username: currentUser.username, userAvatar: currentUser.avatar };
      setState(prev => ({ ...prev, posts: [localPost, ...prev.posts] }));
    }
  };

  // Toggle like on a post
  const toggleLike = async (postId: string) => {
    if (!currentUser) return;
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    const newLikes = post.likes.includes(currentUser.id)
      ? post.likes.filter(id => id !== currentUser.id)
      : [...post.likes, currentUser.id];

    setState(prev => ({
      ...prev,
      posts: prev.posts.map(p => p.id === postId ? { ...p, likes: newLikes } : p)
    }));

    if (!isDemoMode && supabase) {
      await supabase.from('posts').update({ likes: newLikes }).eq('id', postId);
      if (!post.likes.includes(currentUser.id) && post.userId !== currentUser.id) {
        await supabase.from('notifications').insert([{
          user_id: post.userId,
          sender_id: currentUser.id,
          type: 'LIKE',
          reference_id: postId
        }]);
      }
    }
  };

  // Add a comment to a post
  const addComment = async (postId: string, text: string) => {
    if (!currentUser) return;
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    if (!isDemoMode && supabase) {
      try {
        const { data, error } = await supabase.from('comments').insert([{ post_id: postId, user_id: currentUser.id, content: text }]).select().single();
        if (error) throw error;
        const newComment: Comment = { id: data.id, userId: currentUser.id, username: currentUser.username, text: text, createdAt: new Date(data.created_at).getTime() };
        setState(prev => ({ ...prev, posts: prev.posts.map(p => p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p) }));
        if (post.userId !== currentUser.id) {
          await supabase.from('notifications').insert([{ user_id: post.userId, sender_id: currentUser.id, type: 'COMMENT', reference_id: postId }]);
        }
      } catch (e) { console.error(e); }
    } else {
      const newCommentLocal: Comment = { id: 'comment-' + Date.now(), userId: currentUser.id, username: currentUser.username, text, createdAt: Date.now() };
      setState(prev => ({ ...prev, posts: prev.posts.map(p => p.id === postId ? { ...p, comments: [...p.comments, newCommentLocal] } : p) }));
    }
  };

  // Delete a post
  const deletePost = async (postId: string) => {
    setState(prev => ({ ...prev, posts: prev.posts.filter(p => p.id !== postId) }));
    if (!isDemoMode && supabase) await supabase.from('posts').delete().eq('id', postId);
  };

  // Delete a comment
  const deleteComment = async (postId: string, commentId: string) => {
    setState(prev => ({ ...prev, posts: prev.posts.map(p => p.id === postId ? { ...p, comments: p.comments.filter(c => c.id !== commentId) } : p) }));
    if (!isDemoMode && supabase && !commentId.startsWith('comment-')) {
      await supabase.from('comments').delete().eq('id', commentId);
    }
  };

  // Repost a post
  const repostPost = async (postId: string) => {
    if (!currentUser) return;
    const postToRepost = state.posts.find(p => p.id === postId);
    if (!postToRepost) return;
    const newPost: Post = { ...postToRepost, id: 'repost-' + Date.now(), userId: currentUser.id, username: currentUser.username, userAvatar: currentUser.avatar, createdAt: Date.now(), repostOf: postToRepost.id, repostedBy: currentUser.username, likes: [], comments: [] };
    setState(prev => ({ ...prev, posts: [newPost, ...prev.posts] }));
  };

  // Toggle follow status
  const toggleFollow = async (targetUserId: string) => {
    if (!currentUser) return;
    const isFollowing = currentUser.following.includes(targetUserId);
    if (isFollowing) {
      const newFollowing = currentUser.following.filter(id => id !== targetUserId);
      await updateCurrentUser({ following: newFollowing });
    } else {
      if (!isDemoMode && supabase) {
        try {
          const { data: request, error: reqError } = await supabase.from('friend_requests').insert([{ sender_id: currentUser.id, receiver_id: targetUserId }]).select().single();
          if (reqError) throw reqError;
          await supabase.from('notifications').insert([{ user_id: targetUserId, sender_id: currentUser.id, type: 'FRIEND_REQUEST', reference_id: request.id }]);
        } catch (e) { console.warn("Error:", e); }
      }
    }
  };

  // Respond to a friend request
  const respondToFriendRequest = async (notificationId: string, status: 'accepted' | 'rejected') => {
    const notif = state.notifications.find(n => n.id === notificationId);
    if (!notif || !currentUser) return;
    if (status === 'accepted') {
      const senderId = notif.senderId;
      const senderUser = state.users.find(u => u.id === senderId);
      if (senderUser) {
        const newCurrentUserFollowing = Array.from(new Set([...(currentUser.following || []), senderId]));
        const newCurrentUserFollowers = Array.from(new Set([...(currentUser.followers || []), senderId]));
        setState(prev => ({
          ...prev,
          users: prev.users.map(u => {
            if (u.id === currentUser.id) return { ...u, following: newCurrentUserFollowing, followers: newCurrentUserFollowers };
            return u;
          }),
          notifications: prev.notifications.map(n => n.id === notificationId ? { ...n, status, read: true } : n)
        }));
        await updateCurrentUser({ followers: newCurrentUserFollowers, following: newCurrentUserFollowing });
        if (!isDemoMode && supabase) {
          await supabase.from('friend_requests').update({ status: 'accepted' }).eq('sender_id', senderId).eq('receiver_id', currentUser.id);
          await supabase.from('notifications').insert([{ user_id: senderId, sender_id: currentUser.id, type: 'FRIEND_ACCEPTED' }]);
        }
      }
    } else {
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => n.id === notificationId ? { ...n, status: 'rejected', read: true } : n)
      }));
      if (!isDemoMode && supabase) {
        await supabase.from('friend_requests').update({ status: 'rejected' }).eq('sender_id', notif.senderId).eq('receiver_id', currentUser.id);
      }
    }
  };

  // Add a story
  const addStory = async (imageUrl: string, type: 'image' | 'video') => {
    if (!currentUser) return;
    const newStory: Story = { id: 'story-' + Date.now(), userId: currentUser.id, username: currentUser.username, userAvatar: currentUser.avatar, imageUrl, type, createdAt: Date.now() };
    setState(prev => ({ ...prev, stories: [newStory, ...prev.stories] }));
  };

  // Delete a story
  const deleteStory = async (storyId: string) => {
    setState(prev => ({ ...prev, stories: prev.stories.filter(s => s.id !== storyId) }));
  };

  // Update user profile data
  const updateUser = async (userId: string, data: Partial<User>) => {
    setState(prev => ({ ...prev, users: prev.users.map(u => u.id === userId ? { ...u, ...data } : u) }));
    if (currentUser?.id === userId) await updateCurrentUser(data);
  };

  // Mark all notifications as read
  const markNotificationsAsRead = async () => {
    setState(prev => ({ ...prev, notifications: prev.notifications.map(n => ({ ...n, read: true })) }));
    if (!isDemoMode && supabase && currentUser) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', currentUser.id);
    }
  };

  // Send a private message
  const sendMessage = async (receiverId: string, text: string) => {
    if (!currentUser) return;
    if (!isDemoMode && supabase) {
      try {
        const { data: msg, error: msgError } = await supabase.from('messages').insert([{ sender_id: currentUser.id, receiver_id: receiverId, text: text }]).select().single();
        if (msgError) throw msgError;
        await supabase.from('notifications').insert([{ user_id: receiverId, sender_id: currentUser.id, type: 'MESSAGE', reference_id: msg.id }]);
        const newMessage: Message = { id: msg.id, senderId: currentUser.id, receiverId, text, timestamp: Date.now() };
        setState(prev => ({ ...prev, messages: [...prev.messages, newMessage] }));
      } catch (e) { console.error(e); }
    } else {
      const newMessage: Message = { id: 'msg-' + Date.now(), senderId: currentUser.id, receiverId, text, timestamp: Date.now() };
      setState(prev => ({ ...prev, messages: [...prev.messages, newMessage] }));
    }
  };

  // Mark messages from a specific sender as read
  const markMessagesAsRead = async (senderId: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.senderId === senderId && n.type === NotificationType.MESSAGE ? { ...n, read: true } : n)
    }));
    if (!isDemoMode && supabase && currentUser) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', currentUser.id).eq('sender_id', senderId).eq('type', 'MESSAGE');
    }
  };

  return (
    <SocialContext.Provider value={{
      ...state, isLoading, addPost, toggleLike, addComment, deletePost, deleteComment, repostPost, toggleFollow, addStory, deleteStory, updateUser, markNotificationsAsRead, respondToFriendRequest, sendMessage, markMessagesAsRead
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
