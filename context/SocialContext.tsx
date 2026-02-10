
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Post, User, AppState, Notification, NotificationType, Message, Story } from '../types';
import { INITIAL_DATA } from '../constants';
import { useAuth } from './AuthContext';

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
        const parsed = JSON.parse(saved);
        const now = Date.now();
        
        return {
          users: parsed.users || INITIAL_DATA.users,
          posts: parsed.posts || INITIAL_DATA.posts,
          messages: parsed.messages || INITIAL_DATA.messages,
          notifications: parsed.notifications || INITIAL_DATA.notifications,
          stories: (parsed.stories || INITIAL_DATA.stories).filter(
            (s: Story) => now - s.createdAt < 24 * 60 * 60 * 1000
          ),
        };
      } catch (e) {
        console.error("Error loading persisted data", e);
        return INITIAL_DATA;
      }
    }
    return INITIAL_DATA;
  });

  useEffect(() => {
    localStorage.setItem('insta_clone_data', JSON.stringify(state));
  }, [state]);

  const registerUser = (user: User) => {
    setState(prev => {
      if (prev.users.find(u => u.id === user.id || u.username === user.username || u.email === user.email)) return prev;
      return { ...prev, users: [...prev.users, user] };
    });
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, ...updates } : u)
    }));
    
    if (currentUser && userId === currentUser.id) {
      updateCurrentUser(updates);
    }
  };

  const addPost = (imageUrl: string, caption: string, type: 'image' | 'video' = 'image') => {
    if (!currentUser) return;
    const cleanImageUrl = (imageUrl && imageUrl.trim().length > 10) ? imageUrl : "";
    const newPost: Post = {
      id: 'post-' + Date.now(),
      userId: currentUser.id,
      username: currentUser.username,
      userAvatar: currentUser.avatar,
      imageUrl: cleanImageUrl,
      type,
      caption,
      likes: [],
      comments: [],
      createdAt: Date.now()
    };
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

    setState(prev => ({
      ...prev,
      posts: [newRepost, ...prev.posts]
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

  const deletePost = (postId: string) => {
    setState(prev => ({ ...prev, posts: prev.posts.filter(p => p.id !== postId) }));
  };

  const deleteStory = (storyId: string) => {
    setState(prev => ({ ...prev, stories: prev.stories.filter(s => s.id !== storyId) }));
  };

  const toggleLike = (postId: string) => {
    if (!currentUser) return;
    setState(prev => {
      let notificationToAdd: Notification | null = null;
      const posts = prev.posts.map(p => {
        if (p.id === postId) {
          const isLiked = p.likes.includes(currentUser.id);
          const newLikes = isLiked 
            ? p.likes.filter(id => id !== currentUser.id)
            : [...p.likes, currentUser.id];
          
          if (!isLiked && p.userId !== currentUser.id) {
            notificationToAdd = {
              id: 'n-like-' + Date.now() + Math.random(),
              type: NotificationType.LIKE,
              senderId: currentUser.id,
              senderUsername: currentUser.username,
              senderAvatar: currentUser.avatar,
              receiverId: p.userId,
              targetPostId: postId,
              createdAt: Date.now(),
              read: false
            };
          }
          return { ...p, likes: newLikes };
        }
        return p;
      });
      return { 
        ...prev, 
        posts, 
        notifications: notificationToAdd ? [notificationToAdd, ...prev.notifications] : prev.notifications 
      };
    });
  };

  const addComment = (postId: string, text: string) => {
    if (!currentUser) return;
    setState(prev => {
      let notificationToAdd: Notification | null = null;
      const posts = prev.posts.map(p => {
        if (p.id === postId) {
          if (p.userId !== currentUser.id) {
            notificationToAdd = {
              id: 'n-comm-' + Date.now() + Math.random(),
              type: NotificationType.COMMENT,
              senderId: currentUser.id,
              senderUsername: currentUser.username,
              senderAvatar: currentUser.avatar,
              receiverId: p.userId,
              targetPostId: postId,
              createdAt: Date.now(),
              read: false
            };
          }
          return {
            ...p,
            comments: [...p.comments, {
              id: 'c-' + Date.now(),
              userId: currentUser.id,
              username: currentUser.username,
              text,
              createdAt: Date.now()
            }]
          };
        }
        return p;
      });
      return { 
        ...prev, 
        posts, 
        notifications: notificationToAdd ? [notificationToAdd, ...prev.notifications] : prev.notifications 
      };
    });
  };

  const deleteComment = (postId: string, commentId: string) => {
    setState(prev => ({
      ...prev,
      posts: prev.posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: p.comments.filter(c => c.id !== commentId)
          };
        }
        return p;
      })
    }));
  };

  const toggleFollow = (targetUserId: string) => {
    if (!currentUser) return;
    setState(prev => {
      const isFriend = currentUser.following.includes(targetUserId);
      
      if (isFriend) {
        const newFollowing = currentUser.following.filter(id => id !== targetUserId);
        updateCurrentUser({ following: newFollowing });
        
        const updatedUsers = prev.users.map(u => {
          if (u.id === targetUserId) {
            return { ...u, followers: u.followers.filter(id => id !== currentUser.id) };
          }
          if (u.id === currentUser.id) {
            return { ...u, following: newFollowing };
          }
          return u;
        });
        
        return { ...prev, users: updatedUsers };
      }

      const hasPending = prev.notifications.some(n => 
        n.type === NotificationType.FRIEND_REQUEST && 
        n.senderId === currentUser.id && 
        n.receiverId === targetUserId && 
        n.status === 'pending'
      );

      if (hasPending) return prev;

      const notificationToAdd: Notification = {
        id: 'req-' + Date.now(),
        type: NotificationType.FRIEND_REQUEST,
        senderId: currentUser.id,
        senderUsername: currentUser.username,
        senderAvatar: currentUser.avatar,
        receiverId: targetUserId,
        createdAt: Date.now(),
        read: false,
        status: 'pending'
      };

      return { 
        ...prev, 
        notifications: [notificationToAdd, ...prev.notifications] 
      };
    });
  };

  const respondToFriendRequest = (notificationId: string, status: 'accepted' | 'rejected') => {
    setState(prev => {
      const notif = prev.notifications.find(n => n.id === notificationId);
      if (!notif || !currentUser) return prev;

      const updatedNotifications = prev.notifications.map(n => 
        n.id === notificationId ? { ...n, status } : n
      );

      if (status === 'rejected') {
        return { ...prev, notifications: updatedNotifications };
      }

      const senderId = notif.senderId;
      const receiverId = notif.receiverId;

      const acceptanceNotification: Notification = {
        id: 'acc-' + Date.now(),
        type: NotificationType.FRIEND_ACCEPTED,
        senderId: receiverId,
        senderUsername: currentUser.username,
        senderAvatar: currentUser.avatar,
        receiverId: senderId,
        createdAt: Date.now(),
        read: false
      };

      const updatedUsers = prev.users.map(u => {
        if (u.id === senderId) {
          const newFollowing = Array.from(new Set([...u.following, receiverId]));
          const newFollowers = Array.from(new Set([...u.followers, receiverId]));
          return { ...u, following: newFollowing, followers: newFollowers };
        }
        if (u.id === receiverId) {
          const newFollowing = Array.from(new Set([...u.following, senderId]));
          const newFollowers = Array.from(new Set([...u.followers, senderId]));
          if (u.id === currentUser.id) {
            updateCurrentUser({ following: newFollowing, followers: newFollowers });
          }
          return { ...u, following: newFollowing, followers: newFollowers };
        }
        return u;
      });

      return { 
        ...prev, 
        users: updatedUsers, 
        notifications: [acceptanceNotification, ...updatedNotifications] 
      };
    });
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
    
    const notificationToAdd: Notification = {
      id: 'n-msg-' + Date.now() + Math.random(),
      type: NotificationType.MESSAGE,
      senderId: currentUser.id,
      senderUsername: currentUser.username,
      senderAvatar: currentUser.avatar,
      receiverId: receiverId,
      createdAt: Date.now(),
      read: false
    };

    setState(prev => ({ 
      ...prev, 
      messages: [...prev.messages, newMessage],
      notifications: [notificationToAdd, ...prev.notifications]
    }));
  };

  const markNotificationsAsRead = () => {
    if (!currentUser) return;
    setState(prev => ({ 
      ...prev, 
      notifications: prev.notifications.map(n => 
        n.receiverId === currentUser.id ? { ...n, read: true } : n
      ) 
    }));
  };

  const markMessagesAsRead = (senderId: string) => {
    if (!currentUser) return;
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => 
        (n.type === NotificationType.MESSAGE && n.senderId === senderId && n.receiverId === currentUser.id)
          ? { ...n, read: true }
          : n
      )
    }));
  };

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
