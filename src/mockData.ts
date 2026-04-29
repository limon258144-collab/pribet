import { Contact, Message } from './types';

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Sarah Wilson',
    avatar: 'https://picsum.photos/seed/sarah/200',
    status: 'online',
    statusMessage: 'Available for short calls 📞',
    lastMessage: 'Hey, are we still meeting today?',
    unreadCount: 2,
    phoneNumber: '+1 (555) 012-3456'
  },
  {
    id: '2',
    name: 'Tech Group',
    avatar: 'https://picsum.photos/seed/tech/200',
    status: 'online',
    statusMessage: 'Official tech support group',
    lastMessage: 'John: The new update is live!',
    phoneNumber: '+1 (555) 987-6543'
  },
  {
    id: '3',
    name: 'David Chen',
    avatar: 'https://picsum.photos/seed/david/200',
    status: 'away',
    statusMessage: 'In a meeting, back soon.',
    lastMessage: 'I will send the files soon.',
    lastSeen: new Date(Date.now() - 1000 * 60 * 30),
    phoneNumber: '+1 (555) 555-0199'
  },
  {
    id: '4',
    name: 'Emma Baker',
    avatar: 'https://picsum.photos/seed/emma/200',
    status: 'offline',
    statusMessage: 'Family time. DND 🤫',
    lastMessage: 'See you tomorrow!',
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 5),
    phoneNumber: '+1 (555) 444-2211'
  },
];

export const MOCK_MESSAGES: Record<string, Message[]> = {
  '1': [
    { id: 'm0', senderId: '1', text: 'Did you see the latest update from the team?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25), status: 'read', type: 'text' },
    { id: 'm1', senderId: '1', text: 'Hi there!', timestamp: new Date(Date.now() - 100000), status: 'read', type: 'text' },
    { id: 'm2', senderId: 'me', text: 'Hey Sarah! How are you?', timestamp: new Date(Date.now() - 80000), status: 'read', type: 'text' },
    { id: 'm3', senderId: '1', text: 'Check out this photo from last night! 📸', timestamp: new Date(Date.now() - 70000), status: 'read', type: 'text' },
    { id: 'm4', senderId: '1', text: '', imageUrl: 'https://picsum.photos/seed/party/800/600', timestamp: new Date(Date.now() - 65000), status: 'read', type: 'image' },
    { id: 'm5', senderId: 'me', text: 'Wow, looks like a lot of fun! Wish I was there.', timestamp: new Date(Date.now() - 60000), status: 'read', type: 'text' },
    { id: 'm6', senderId: '1', text: 'Listen to this clip, the music was great!', timestamp: new Date(Date.now() - 55000), status: 'read', type: 'text' },
    { id: 'm7', senderId: '1', text: '', voiceDuration: 12, timestamp: new Date(Date.now() - 50000), status: 'read', type: 'voice' },
  ]
};
