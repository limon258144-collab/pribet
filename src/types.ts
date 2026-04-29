export interface Message {
  id: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  voiceDuration?: number;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'voice' | 'video';
  reactions?: string[];
  filter?: string;
}

export interface Contact {
  id: string;
  name: string;
  username?: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  statusMessage?: string;
  lastSeen?: Date;
  lastMessage?: string;
  unreadCount?: number;
  phoneNumber?: string;
  isSynced?: boolean;
}

export interface Chat {
  id: string;
  contactId: string;
  messages: Message[];
}
