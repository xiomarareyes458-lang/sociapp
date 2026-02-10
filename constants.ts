
import { AppState, NotificationType } from './types';

export const DEFAULT_AVATAR = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

export const INITIAL_DATA: AppState = {
  users: [
    {
      id: 'user1',
      username: 'johndoe',
      fullName: 'John Doe',
      email: 'john@example.com',
      avatar: 'https://picsum.photos/id/64/200/200',
      bio: 'Adventure seeker | Photography enthusiast',
      joinedAt: 1714561200000, // Mayo 2024
      followers: ['user2'],
      following: ['user2', 'user3']
    },
    {
      id: 'user2',
      username: 'janemiles',
      fullName: 'Jane Miles',
      email: 'jane@example.com',
      avatar: 'https://picsum.photos/id/65/200/200',
      bio: 'Traveler & Foodie 🍕🌍',
      joinedAt: 1714647600000, // Mayo 2024
      followers: ['user1', 'user3'],
      following: ['user1']
    },
    {
      id: 'user3',
      username: 'techguru',
      fullName: 'Alex Rivera',
      email: 'alex@example.com',
      avatar: 'https://picsum.photos/id/103/200/200',
      bio: 'Coding is life. 💻',
      joinedAt: 1714734000000, // Mayo 2024
      followers: ['user1'],
      following: ['user2']
    }
  ],
  posts: [
    {
      id: 'post1',
      userId: 'user1',
      username: 'johndoe',
      userAvatar: 'https://picsum.photos/id/64/200/200',
      imageUrl: 'https://picsum.photos/id/10/800/800',
      // Fixed: Added missing 'type' property
      type: 'image',
      caption: 'Loving the mountain views today! #nature #hiking',
      likes: ['user2', 'user3'],
      comments: [
        { id: 'c1', userId: 'user2', username: 'janemiles', text: 'Stunning!', createdAt: Date.now() - 1000000 }
      ],
      createdAt: Date.now() - 3600000
    },
    {
      id: 'post2',
      userId: 'user2',
      username: 'janemiles',
      userAvatar: 'https://picsum.photos/id/65/200/200',
      imageUrl: 'https://picsum.photos/id/42/800/800',
      // Fixed: Added missing 'type' property
      type: 'image',
      caption: 'Best coffee in town ☕️☕️',
      likes: ['user1'],
      comments: [],
      createdAt: Date.now() - 7200000
    }
  ],
  stories: [],
  messages: [
    { id: 'm1', senderId: 'user1', receiverId: 'user2', text: 'Hey Jane! How are you?', timestamp: Date.now() - 86400000 },
    { id: 'm2', senderId: 'user2', receiverId: 'user1', text: 'I am good! Let\'s catch up soon.', timestamp: Date.now() - 86300000 }
  ],
  notifications: [
    {
      id: 'n1',
      type: NotificationType.LIKE,
      senderId: 'user2',
      senderUsername: 'janemiles',
      senderAvatar: 'https://picsum.photos/id/65/200/200',
      receiverId: 'user1',
      targetPostId: 'post1',
      createdAt: Date.now() - 500000,
      read: false
    }
  ]
};
