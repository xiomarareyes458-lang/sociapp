
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar: string;
  bio: string;
  joinedAt: number;
  coverPhoto: string | null;
  followers: string[];
  following: string[];
}

export interface Story {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  imageUrl: string;
  type: 'image' | 'video';
  createdAt: number;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: number;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  imageUrl: string;
  type: 'image' | 'video';
  content: string; 
  likes: string[];
  comments: Comment[];
  createdAt: number;
  repostOf?: string;
  repostedBy?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

export enum NotificationType {
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
  FOLLOW = 'FOLLOW',
  MESSAGE = 'MESSAGE',
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  FRIEND_ACCEPTED = 'FRIEND_ACCEPTED'
}

export interface Notification {
  id: string;
  type: NotificationType;
  senderId: string;
  senderUsername: string;
  senderAvatar: string;
  receiverId: string;
  targetPostId?: string;
  // Added referenceId to support linking to posts or other entities
  referenceId?: string;
  createdAt: number;
  read: boolean;
  status?: 'pending' | 'accepted' | 'rejected';
}

export interface AppState {
  users: User[];
  posts: Post[];
  stories: Story[];
  messages: Message[];
  notifications: Notification[];
}