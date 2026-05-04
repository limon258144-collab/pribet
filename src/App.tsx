/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Users, 
  Settings, 
  Search, 
  MoreVertical, 
  Phone, 
  Video, 
  Plus, 
  Send, 
  Paperclip, 
  Smile, 
  ChevronLeft,
  ChevronDown,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Maximize2,
  X,
  User,
  Camera,
  Check,
  LogOut,
  Bell,
  Shield,
  Smartphone,
  Wifi,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Palette,
  Image as ImageIcon,
  UserPlus,
  CheckCheck,
  Scan,
  UserCheck,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  FileText,
  MapPin,
  Music,
  CheckSquare,
  CheckCircle,
  Share2,
  Monitor,
  Clapperboard,
  Film,
  Globe,
  MessageCircle,
  Sliders,
  Settings2
} from 'lucide-react';
import { Contact, Message } from './types';
import { INITIAL_CONTACTS, MOCK_MESSAGES } from './mockData';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, query, collection, where, getDocs, onSnapshot, updateDoc, limit } from 'firebase/firestore';

const GALLERY_IMAGES = [
  'https://picsum.photos/seed/travel/800/600',
  'https://picsum.photos/seed/tech/800/600',
  'https://picsum.photos/seed/nature/800/600',
  'https://picsum.photos/seed/food/800/600',
  'https://picsum.photos/seed/work/800/600',
  'https://picsum.photos/seed/party/800/600',
  'https://picsum.photos/seed/city/800/600',
  'https://picsum.photos/seed/sea/800/600',
];

const EMOJIS = ['😊', '😂', '😍', '🙌', '🔥', '👍', '❤️', '🤔', '😎', '😢', '😭', '🎉', '🚀', '✨', '💯', '🙏'];

const IMAGE_FILTERS = [
  { name: 'Original', value: 'none' },
  { name: 'Mono', value: 'grayscale(100%)' },
  { name: 'Vintage', value: 'sepia(100%)' },
  { name: 'Punch', value: 'contrast(150%)' },
  { name: 'Dreamy', value: 'brightness(1.2) saturate(1.5) blur(0.5px)' },
  { name: 'Vibrant', value: 'saturate(2.2)' },
  { name: 'Cool', value: 'hue-rotate(180deg) brightness(1.1)' },
  { name: 'Warm', value: 'sepia(0.3) brightness(1.1) saturate(1.3)' },
];

const COUNTRIES = [
  { name: 'Bangladesh', code: '+880', flag: '🇧🇩' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
  { name: 'Qatar', code: '+974', flag: '🇶🇦' },
  { name: 'Kuwait', code: '+965', flag: '🇰🇼' },
];

type View = 'chats' | 'contacts' | 'settings';

const handleFirestoreError = (error: any, operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write', path: string | null) => {
  if (error.code === 'permission-denied' || error.message?.includes('insufficient permissions')) {
    const errorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo: {
        userId: auth.currentUser?.uid || 'anonymous',
        email: auth.currentUser?.email || '',
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || true,
        providerInfo: auth.currentUser?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        })) || []
      }
    };
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState<View>('chats');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(INITIAL_CONTACTS[0]);
  const [messages, setMessages] = useState<Record<string, Message[]>>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isCalling, setIsCalling] = useState<'audio' | 'video' | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Current User Profile State
  const [currentUser, setCurrentUser] = useState({
    id: '',
    name: 'Imo User',
    username: '',
    avatar: 'https://picsum.photos/seed/rahul/600/600',
    statusMessage: 'Connecting with friends and family. Text me anytime!',
    presence: 'online' as 'online' | 'away' | 'offline'
  });

  const [editProfile, setEditProfile] = useState({ ...currentUser });
  const [isSaving, setIsSaving] = useState(false);
  
  // Call Controls State
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [showUnmuteToast, setShowUnmuteToast] = useState(false);
  const [showEndCallConfirm, setShowEndCallConfirm] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Playback Simulation
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Reaction State
  const [reactionMenu, setReactionMenu] = useState<{ messageId: string, x: number, y: number } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);

  const handleLongPressStart = (messageId: string, e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    touchStartPos.current = { x: clientX, y: clientY };
    
    longPressTimer.current = setTimeout(() => {
      setReactionMenu({ messageId, x: clientX, y: clientY });
      if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 500);
  };

  const handleLongPressMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!touchStartPos.current || !longPressTimer.current) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const dist = Math.sqrt(
      Math.pow(clientX - touchStartPos.current.x, 2) + 
      Math.pow(clientY - touchStartPos.current.y, 2)
    );
    
    if (dist > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
  };
  const [contactSearchText, setContactSearchText] = useState('');
  const [chatSearchText, setChatSearchText] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Social Platform States
  const [fullScreenImage, setFullScreenImage] = useState<{url: string, filter?: string} | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [discoverSearch, setDiscoverSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  // Global Search Logic
  useEffect(() => {
    const searchGlobalUsers = async () => {
      if (contactSearchText.length < 3) {
        setSearchResults([]);
        return;
      }

      setIsSearchingGlobal(true);
      try {
        const q = query(
          collection(db, 'users'),
          where('username', '>=', contactSearchText.toLowerCase()),
          where('username', '<=', contactSearchText.toLowerCase() + '\uf8ff'),
          limit(5)
        );
        const snapshot = await getDocs(q);
        const users = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.displayName || 'Imo User',
              avatar: data.photoURL || `https://picsum.photos/seed/${doc.id}/600/600`,
              status: 'online',
              statusMessage: data.status || 'Available',
              username: data.username
            } as Contact;
          })
          .filter(u => u.id !== fbUser?.uid); // Don't show current user

        setSearchResults(users);
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsSearchingGlobal(false);
      }
    };

    const timeoutId = setTimeout(searchGlobalUsers, 500);
    return () => clearTimeout(timeoutId);
  }, [contactSearchText, fbUser]);

  const handleStartChat = (contact: Contact) => {
    // If contact is not in syncedContacts, add it
    if (!syncedContacts.find(c => c.id === contact.id)) {
      setSyncedContacts(prev => [contact, ...prev]);
    }
    setSelectedContact(contact);
    setActiveView('chats');
    setContactSearchText('');
  };

  const [callStatus, setCallStatus] = useState<'connecting' | 'active'>('connecting');
  const [connectionProgress, setConnectionProgress] = useState(0);
  const [connectionStage, setConnectionStage] = useState('Initializing');
  const [callTimer, setCallTimer] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedContacts, setSyncedContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [activeStory, setActiveStory] = useState<string | null>(null);
  const [userStories, setUserStories] = useState<{id: string, url: string, type: 'image' | 'video'}[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [videoQuality, setVideoQuality] = useState<'Auto' | '360p' | '720p' | '1080p'>('Auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showCallUI, setShowCallUI] = useState(true);
  const callUIHideTimer = useRef<NodeJS.Timeout | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingImages, setEditingImages] = useState<{url: string, filter: string}[]>([]);
  const [activeEditorIndex, setActiveEditorIndex] = useState(0);
  const [selectedGalleryImages, setSelectedGalleryImages] = useState<string[]>([]);
  const [isMockRecording, setIsMockRecording] = useState(false);
  const [isMockCall, setIsMockCall] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [chatBackground, setChatBackground] = useState<{
    type: 'color' | 'image';
    value: string;
    opacity: number;
    pattern?: string;
  }>({
    type: 'color',
    value: '#0A0D14',
    opacity: 1
  });

  const CHAT_WALLPAPERS = [
    { name: 'Default', type: 'color', value: '#0A0D14' },
    { name: 'Dark Grey', type: 'color', value: '#1E2433' },
    { name: 'Teal', type: 'color', value: '#075E54' },
    { name: 'Midnight', type: 'color', value: '#122D42' },
    { name: 'Royal', type: 'color', value: '#250D47' },
    { name: 'Crimson', type: 'color', value: '#4A1C1C' },
    { name: 'Olive', type: 'color', value: '#2D3A20' },
    { name: 'Sunset', type: 'image', value: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=1000' },
    { name: 'Galaxy', type: 'image', value: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1000' },
    { name: 'Abstract', type: 'image', value: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1000' },
    { name: 'Dots', type: 'image', value: 'https://www.transparenttextures.com/patterns/cubes.png', isPattern: true },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFbUser(user);
        // Check if user exists in Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              setCurrentUser({
                id: user.uid,
                name: data.displayName || 'Imo User',
                username: data.username || '',
                avatar: data.photoURL || `https://picsum.photos/seed/${user.uid}/600/600`,
                statusMessage: data.status || 'Connecting with friends and family.',
                presence: 'online'
              });
            } else {
              // Create new user doc
              const newUser = {
                uid: user.uid,
                phoneNumber: user.phoneNumber || '',
                displayName: user.displayName || 'Imo User',
                username: user.email?.split('@')[0] || `user_${user.uid.slice(0, 5)}`,
                photoURL: user.photoURL || `https://picsum.photos/seed/${user.uid}/600/600`,
                status: 'Connecting with friends and family.',
                lastSeen: new Date().toISOString()
              };
              await setDoc(doc(db, 'users', user.uid), newUser);
              setCurrentUser({
                id: user.uid,
                name: newUser.displayName,
                username: newUser.username,
                avatar: newUser.photoURL,
                statusMessage: newUser.status,
                presence: 'online'
              });
            }
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Firestore user fetch error:", error);
          setIsAuthenticated(true); // Fallback to local state if Firestore fails but Auth succeeded
        }
      } else {
        setFbUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleAuth = async () => {
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      alert(error.message || "Google sign-in failed.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!fbUser) return;
    if (!editName.trim()) {
      alert("Name cannot be empty");
      return;
    }

    setIsSavingProfile(true);
    try {
      // Check if username is taken (simplified)
      if (editUsername !== currentUser.username) {
        const q = query(collection(db, 'users'), where('username', '==', editUsername));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          alert("Username is already taken. Please choose another.");
          setIsSavingProfile(false);
          return;
        }
      }

      const updatedData = {
        displayName: editName,
        username: editUsername,
        photoURL: editAvatar || `https://picsum.photos/seed/${fbUser.uid}/600/600`,
        lastUpdated: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', fbUser.uid), updatedData, { merge: true });
      
      setCurrentUser(prev => ({
        ...prev,
        name: updatedData.displayName,
        username: updatedData.username,
        avatar: updatedData.photoURL
      }));
      
      setIsEditingProfile(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Profile update error:", error);
      alert("Failed to update profile. The image might be too large even after compression. Try a smaller file.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChatImageUpload = async (file: File) => {
    if (!selectedContact) return;
    
    try {
      const compressedDataUrl = await compressAndResizeImage(file);
      const newMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        senderId: 'me',
        text: '',
        imageUrl: compressedDataUrl,
        timestamp: new Date(),
        status: 'sent',
        type: 'image'
      };

      setMessages(prev => ({
        ...prev,
        [selectedContact.id]: [...(prev[selectedContact.id] || []), newMessage]
      }));
    } catch (err) {
      console.error("Chat image upload error:", err);
      alert("Failed to send image.");
    }
  };

  const handleVideoUpload = async (file: File) => {
    if (!selectedContact) return;

    if (file.size > 800000) { // Keep it under ~800KB to be safe with base64 and 1MB limit
      alert("Video file is too large! Please select a video smaller than 800KB.");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const videoDataUrl = e.target?.result as string;
        const newMessage: Message = {
          id: Math.random().toString(36).substr(2, 9),
          senderId: 'me',
          text: '',
          videoUrl: videoDataUrl,
          timestamp: new Date(),
          status: 'sent',
          type: 'video'
        };

        setMessages(prev => ({
          ...prev,
          [selectedContact.id]: [...(prev[selectedContact.id] || []), newMessage]
        }));
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Video upload error:", err);
      alert("Failed to send video.");
    }
  };

  const handleStoryUpload = async (file: File) => {
    try {
      const type = file.type.startsWith('video') ? 'video' : 'image';
      let url = '';
      if (type === 'image') {
        url = await compressAndResizeImage(file);
      } else {
        if (file.size > 800000) {
          alert("Video too large for story. Max 800KB.");
          return;
        }
        url = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      const newStory = {
        id: Math.random().toString(36).substr(2, 9),
        url,
        type: type as 'image' | 'video'
      };
      setUserStories(prev => [newStory, ...prev]);
      alert("Story posted successfully!");
    } catch (err) {
      console.error("Story upload error:", err);
      alert("Failed to post story.");
    }
  };

  const compressAndResizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6)); // High compression to stay under Firestore limits
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (playingVoiceId) {
      interval = setInterval(() => {
        setPlaybackProgress(prev => {
          if (prev >= 100) {
            setPlayingVoiceId(null);
            return 0;
          }
          return prev + 5;
        });
      }, 200);
    } else {
      setPlaybackProgress(0);
    }
    return () => clearInterval(interval);
  }, [playingVoiceId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'wallpaper' | 'gallery') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      if (target === 'wallpaper') {
        setChatBackground({ ...chatBackground, type: 'image', value: url });
      } else {
        // Add to gallery or directly select it
        setGALLERY_IMAGES_STATE(prev => [url, ...prev]);
        setSelectedGalleryImages([url]); // Auto select the uploaded one
      }
    };
    reader.readAsDataURL(file);
  };

  // Gallery Images State
  const [GALLERY_IMAGES_STATE, setGALLERY_IMAGES_STATE] = useState(GALLERY_IMAGES);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MediaDevices API not supported");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setIsMockRecording(false);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        console.log("Audio captured:", audioUrl);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err: any) {
      console.info("Microphone access failed, entering mock recording mode:", err);
      // Silence the visible error to avoid annoying popups if hardware is missing
      setMediaError(null); 
      // Fallback to mock recording for demo purposes
      setIsMockRecording(true);
      setIsRecording(true);
      setRecordingTime(0);
    }
  };

  const stopAndSendVoice = () => {
    if (!selectedContact) return;
    
    if (!isMockRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    const duration = formatTime(recordingTime);
    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: 'me',
      text: isMockRecording ? `🎤 Voice Message (Simulated - ${duration})` : `🎤 Voice Message (${duration})`,
      timestamp: new Date(),
      status: 'sent',
      type: 'voice',
      voiceDuration: recordingTime
    };

    setMessages(prev => ({
      ...prev,
      [selectedContact.id]: [...(prev[selectedContact.id] || []), newMessage]
    }));
    
    setIsRecording(false);
    setIsMockRecording(false);
    setRecordingTime(0);
  };

  const cancelRecording = () => {
    if (!isMockRecording && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setIsMockRecording(false);
    setRecordingTime(0);
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (!selectedContact) return;
    
    setMessages(prev => {
      const contactMessages = prev[selectedContact.id] || [];
      const updatedMessages = contactMessages.map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || [];
          if (reactions.includes(emoji)) {
            return { ...msg, reactions: reactions.filter(r => r !== emoji) };
          }
          return { ...msg, reactions: [...reactions, emoji] };
        }
        return msg;
      });
      return { ...prev, [selectedContact.id]: updatedMessages };
    });
    setReactionMenu(null);
  };

  const groupMessagesByDay = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    
    msgs.forEach((msg) => {
      const date = new Date(msg.timestamp);
      const dateString = date.toLocaleDateString([], { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const today = new Date().toLocaleDateString([], { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toLocaleDateString([], { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      let displayDate = dateString;
      if (dateString === today) displayDate = 'Today';
      else if (dateString === yesterdayString) displayDate = 'Yesterday';

      const existingGroup = groups.find((g) => g.date === displayDate);
      if (existingGroup) {
        existingGroup.messages.push(msg);
      } else {
        groups.push({ date: displayDate, messages: [msg] });
      }
    });
    
    return groups;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedContact]);

  // Presence Management
  useEffect(() => {
    if (!fbUser) return;

    const userRef = doc(db, 'users', fbUser.uid);

    const updatePresence = async (status: 'online' | 'away' | 'offline') => {
      try {
        await updateDoc(userRef, {
          status: status,
          lastSeen: serverTimestamp(),
          lastUpdated: serverTimestamp() // To track freshness
        });
        setCurrentUser(prev => ({ ...prev, presence: status }));
      } catch (err) {
        console.error("Presence update failed:", err);
      }
    };

    // Initial online status
    updatePresence('online');

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence('online');
      } else {
        updatePresence('away');
      }
    };

    const handleOffline = () => {
      updatePresence('offline');
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleOffline);

    // Heartbeat to keep status fresh (every 2 minutes)
    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updatePresence('online');
      }
    }, 120000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleOffline);
      clearInterval(heartbeat);
      updatePresence('offline');
    };
  }, [fbUser]);

  // Sync Local Typing Status to Firestore
  const [isLocalUserTyping, setIsLocalUserTyping] = useState(false);

  useEffect(() => {
    if (!fbUser || !selectedContact) return;

    const userRef = doc(db, 'users', fbUser.uid);
    const updateTypingDoc = async (targetId: string | null) => {
      try {
        await updateDoc(userRef, {
          typingTo: targetId
        });
      } catch (err) {
        // Silently fail if session ended
      }
    };

    updateTypingDoc(isLocalUserTyping ? selectedContact.id : null);

    return () => {
      updateTypingDoc(null);
    };
  }, [isLocalUserTyping, fbUser?.uid, selectedContact?.id]);

  useEffect(() => {
    if (!inputText.trim()) {
      setIsLocalUserTyping(false);
      return;
    }

    setIsLocalUserTyping(true);
    const timeout = setTimeout(() => setIsLocalUserTyping(false), 3000);
    return () => clearTimeout(timeout);
  }, [inputText]);

  // Sync Contacts Presence
  useEffect(() => {
    if (!isAuthenticated) return;

    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const updatedStatuses: Record<string, { status: string, lastSeen: any, typingTo: string | null }> = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        updatedStatuses[doc.id] = { 
          status: data.status, 
          lastSeen: data.lastSeen,
          typingTo: data.typingTo || null
        };
      });

      setSyncedContacts(prev => {
        const next = prev.map(contact => {
          const fsData = updatedStatuses[contact.id];
          if (fsData) {
            return { 
              ...contact, 
              status: fsData.status as 'online' | 'offline' | 'away',
              lastSeen: fsData.lastSeen?.toDate() || contact.lastSeen,
              isTyping: fsData.typingTo === fbUser?.uid
            };
          }
          return contact;
        });

        // Also update selectedContact if it exists
        setSelectedContact(current => {
          if (!current) return null;
          const updated = next.find(c => c.id === current.id);
          return updated || current;
        });

        return next;
      });
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Media Handling for Calling
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startMedia = async () => {
      setMediaError(null);
      setIsMockCall(false);
      try {
        if (isCalling) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: isCalling === 'video',
              audio: true
            });
          } catch (firstErr: any) {
            // Check if it's a device not found or permission error
            const isNotFoundError = firstErr.name === 'NotFoundError' || firstErr.name === 'DevicesNotFoundError';
            
            if (isCalling === 'video' && (isNotFoundError || firstErr.name === 'NotReadableError' || firstErr.name === 'OverconstrainedError')) {
              try {
                console.info("Camera not detected, attempting audio-only fallback...");
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                setMediaError(null); 
              } catch (audioErr: any) {
                console.info("No media devices found. Enabling Virtual Simulator Mode.");
                setIsMockCall(true);
                // No need to set a visible error toast if we have a clean simulator UI
                setMediaError(null); 
              }
            } else {
              console.info("Hardware access unavailable. Enabling Virtual Simulator Mode.");
              setIsMockCall(true);
              setMediaError(null);
            }
          }
          
          if (stream) {
            setLocalStream(stream);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          }
        }
      } catch (err) {
        if (!isMockCall) {
          console.warn("Media access failed, but Simulator Mode is available:", err);
        }
      }
    };

    if (isCalling) {
      startMedia();
    } else {
      setIsMockCall(false);
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        setLocalStream(null);
      }
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        setScreenStream(null);
        setIsSharingScreen(false);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isCalling]);

  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => (track.enabled = !isMuted));
    }
  }, [isMuted, localStream]);

  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => (track.enabled = !isVideoOff));
    }
  }, [isVideoOff, localStream]);

  const toggleScreenShare = async () => {
    if (isSharingScreen) {
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        setScreenStream(null);
      }
      setIsSharingScreen(false);
      if (localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        setIsSharingScreen(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        stream.getVideoTracks()[0].onended = () => {
          setIsSharingScreen(false);
          setScreenStream(null);
          if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
        };
      } catch (err) {
        console.error("Screen share error:", err);
      }
    }
  };

  const switchVideoQuality = async (quality: 'Auto' | '360p' | '720p' | '1080p') => {
    setVideoQuality(quality);
    if (!localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    let constraints: MediaTrackConstraints = {};
    switch (quality) {
      case '360p': constraints = { height: { ideal: 360 } }; break;
      case '720p': constraints = { height: { ideal: 720 } }; break;
      case '1080p': constraints = { height: { ideal: 1080 } }; break;
      default: constraints = { height: { ideal: 720 } };
    }

    try {
      // @ts-ignore - applyConstraints is not in all TS envs
      if (videoTrack.applyConstraints) {
        await videoTrack.applyConstraints(constraints);
      }
    } catch (err) {
      console.warn("Could not apply resolution constraints:", err);
    }
  };

  // Prevent accidental call disconnection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isCalling) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isCalling]);

  const handleSearchUser = async () => {
    if (!discoverSearch.trim()) return;
    setIsSearching(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('username', '==', discoverSearch.trim())
      );
      const qSnap = await getDocs(q);
      const results: Contact[] = [];
      qSnap.forEach(doc => {
        const data = doc.data();
        if (data.uid !== fbUser?.uid) {
          results.push({
            id: data.uid,
            name: data.displayName || 'Imo User',
            username: data.username,
            avatar: data.photoURL || `https://picsum.photos/seed/${data.uid}/200`,
            status: 'online',
          });
        }
      });
      setSearchResults(results);
      if (results.length === 0) {
        alert("No user found with that username.");
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;
    if (isCalling) {
      setCallStatus('connecting');
      setCallTimer(0);
      setConnectionProgress(0);
      setConnectionStage('Cloud Handshake');
      
      const stages = [
        { p: 15, t: 'Locating Peer' },
        { p: 35, t: 'Signal Exchange' },
        { p: 60, t: 'ICE Authentication' },
        { p: 85, t: 'Optimizing Stream' }
      ];

      let currentStageIdx = 0;
      progressInterval = setInterval(() => {
        setConnectionProgress(prev => {
          const next = prev + (Math.random() * 3 + 1);
          if (currentStageIdx < stages.length && next >= stages[currentStageIdx].p) {
            setConnectionStage(stages[currentStageIdx].t);
            currentStageIdx++;
          }
          return Math.min(next, 99);
        });
      }, 100);

      const timerId = setTimeout(() => {
        clearInterval(progressInterval);
        setConnectionProgress(100);
        setCallStatus('active');
        interval = setInterval(() => {
          setCallTimer(prev => prev + 1);
        }, 1000);
      }, 4000);
      return () => {
        clearTimeout(timerId);
        clearInterval(interval);
        clearInterval(progressInterval);
      };
    }
  }, [isCalling]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedContact) return;

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: 'me',
      text: inputText,
      timestamp: new Date(),
      status: 'sent',
      type: 'text'
    };

    setMessages(prev => ({
      ...prev,
      [selectedContact.id]: [...(prev[selectedContact.id] || []), newMessage]
    }));
    setInputText('');

    // Simulate response
    setTimeout(() => {
      const response: Message = {
        id: Math.random().toString(36).substr(2, 9),
        senderId: selectedContact.id,
        text: "That sounds great! I'll be there.",
        timestamp: new Date(),
        status: 'delivered',
        type: 'text'
      };
      setMessages(prev => ({
        ...prev,
        [selectedContact.id]: [...(prev[selectedContact.id] || []), response]
      }));
    }, 2000);
  };

  const NavItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: View }) => (
    <button
      onClick={() => {
        setActiveView(id);
        if (id === 'chats') setSelectedContact(null);
      }}
      className={`flex flex-col items-center justify-center py-2 w-full transition-all relative z-10 active:scale-90 ${
        activeView === id ? 'text-imo-blue' : 'text-white/40 hover:text-white/70'
      }`}
    >
      <Icon size={22} className="sm:size-24" />
      <span className="text-[9px] sm:text-[10px] mt-1 font-black font-sans uppercase tracking-[0.1em]">{label}</span>
      {activeView === id && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute left-0 w-1 h-6 sm:h-8 bg-imo-blue rounded-r-full shadow-[0_0_15px_rgba(0,132,255,0.5)]"
        />
      )}
    </button>
  );

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen w-full frosted-bg items-center justify-center p-6 text-white font-sans overflow-hidden">
        {/* Animated background circles */}
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-imo-blue/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-accent-green/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md relative z-50"
        >
          <div className="glass-panel p-8 md:p-12 rounded-[3.5rem] shadow-3xl border border-white/10 backdrop-blur-3xl relative overflow-hidden group">
            {/* Subtle top glare */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className="flex flex-col items-center mb-6 sm:mb-10">
              <motion.div 
                whileHover={{ rotate: 360, scale: 1.05 }}
                className="w-20 h-20 sm:w-24 sm:h-24 bg-imo-blue rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center text-white font-black text-4xl sm:text-5xl shadow-[0_20px_45px_rgba(0,132,255,0.4)] mb-6 sm:mb-8 ring-8 ring-imo-blue/10 relative"
              >
                i
                <div className="absolute inset-0 bg-white/20 rounded-[2.5rem] blur-xl animate-pulse opacity-50"></div>
              </motion.div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2 sm:mb-3 text-center">imo</h1>
              <p className="text-white/40 font-medium text-center px-4 leading-relaxed text-sm sm:text-base">
                Connect with your friends using <br className="hidden sm:block"/> your Google Account
              </p>
            </div>

            <div className="space-y-6">
              <button
                onClick={handleGoogleAuth}
                disabled={isLoggingIn}
                className="w-full bg-white text-black py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] flex items-center justify-center space-x-4 border border-white/20 disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <div className="w-6 h-6 border-3 border-black/30 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-12 text-center relative z-10">
              <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest leading-relaxed">
                By continuing, you agree to our <br/>
                <button className="text-imo-blue hover:underline">Terms of Service</button> and <button className="text-imo-blue hover:underline">Privacy Policy</button>
              </p>
            </div>
          </div>

          <div className="mt-12 flex justify-center space-x-12 opacity-30">
            <div className="flex flex-col items-center">
              <Shield size={24} className="mb-2 text-imo-blue" />
              <span className="text-[9px] font-black uppercase tracking-widest">Secure Cloud Messaging</span>
            </div>
            <div className="flex flex-col items-center">
              <Lock size={24} className="mb-2 text-imo-blue" />
              <span className="text-[9px] font-black uppercase tracking-widest">256-Bit Encryption</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#0A0D14] overflow-hidden text-white font-sans selection:bg-imo-blue selection:text-white">
      {/* Lightbox for Images */}
      <AnimatePresence>
        {fullScreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center overflow-hidden"
            onClick={() => {
              setFullScreenImage(null);
              setZoomScale(1);
              setRotation(0);
            }}
          >
            {/* Top Bar Controls */}
            <div className="absolute top-0 left-0 right-0 h-20 px-8 flex items-center justify-between z-10 bg-gradient-to-b from-black/50 to-transparent">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-imo-blue rounded-xl flex items-center justify-center text-white font-black text-xl">i</div>
                <div>
                  <h4 className="text-white font-bold text-sm leading-none">Image Viewer</h4>
                  <p className="text-white/40 text-[10px] mt-1 uppercase tracking-widest">End-to-End Encrypted</p>
                </div>
              </div>

              <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                <button 
                  onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 3))}
                  className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/5"
                  title="Zoom In"
                >
                  <ZoomIn size={20} />
                </button>
                <div className="px-3 text-[10px] font-black text-white/40 bg-white/5 h-11 flex items-center rounded-xl border border-white/5">
                  {Math.round(zoomScale * 100)}%
                </div>
                <button 
                  onClick={() => setZoomScale(prev => Math.max(prev - 0.25, 0.5))}
                  className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/5"
                  title="Zoom Out"
                >
                  <ZoomOut size={20} />
                </button>
                <div className="w-[1px] h-6 bg-white/10 mx-2" />
                <button 
                  onClick={() => setRotation(prev => prev + 90)}
                  className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/5"
                  title="Rotate"
                >
                  <RotateCcw size={20} />
                </button>
                <button 
                  className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/5"
                  title="Download"
                >
                  <Download size={20} />
                </button>
                <button 
                  onClick={() => {
                    setFullScreenImage(null);
                    setZoomScale(1);
                    setRotation(0);
                  }}
                  className="p-3 bg-imo-blue text-white rounded-xl shadow-xl shadow-imo-blue/20 hover:scale-105 active:scale-95 transition-all ml-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ 
                scale: zoomScale, 
                y: 0,
                rotate: rotation
              }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative max-w-[90vw] max-h-[85vh] cursor-grab active:cursor-grabbing"
              onClick={e => e.stopPropagation()}
              drag
              dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
              dragElastic={0.1}
            >
              <img 
                src={fullScreenImage?.url} 
                style={{ filter: fullScreenImage?.filter || 'none' }}
                className="w-full h-auto object-contain rounded-2xl shadow-2xl border border-white/10 pointer-events-none select-none" 
                alt="fullscreen"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            {/* Hint */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/5 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
              Drag to move • Scroll to zoom
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Bottom Navigation (Mobile/Home Sidebar) */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 lg:left-0 lg:right-auto lg:top-0 lg:h-full lg:w-20 lg:pt-0 lg:pb-0 flex lg:flex-col lg:items-center ${selectedContact || isCalling ? 'hidden lg:flex' : 'flex'}`}>
        <div className="w-full lg:h-full flex flex-row lg:flex-col items-center justify-around bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[32px] lg:rounded-none py-4 lg:py-10 shadow-3xl">
          <div className="hidden lg:flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-imo-blue rounded-2xl flex items-center justify-center text-white font-black text-xl rotate-12 transition-transform shadow-xl shadow-imo-blue/20">i</div>
          </div>
          
          <div className="flex flex-row lg:flex-col items-center justify-around lg:justify-start w-full lg:space-y-6">
            <button 
              onClick={() => {
                setActiveView('chats');
                setSelectedContact(null);
              }}
              className={`group flex flex-col items-center p-3 rounded-2xl transition-all ${activeView === 'chats' ? 'text-imo-blue bg-imo-blue/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <div className="relative">
                <MessageSquare size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">Chats</span>
            </button>
            <button 
              onClick={() => setActiveView('contacts')}
              className={`group flex flex-col items-center p-3 rounded-2xl transition-all active:scale-90 ${activeView === 'contacts' ? 'text-imo-blue bg-imo-blue/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <Users size={24} />
              <span className="text-[9px] font-black uppercase tracking-widest mt-1.5 opacity-0 lg:group-hover:opacity-100 transition-opacity">People</span>
            </button>
            <button 
              onClick={() => setActiveView('settings')}
              className={`group flex flex-col items-center p-3 rounded-2xl transition-all active:scale-90 ${activeView === 'settings' ? 'text-imo-blue bg-imo-blue/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <Settings size={24} />
              <span className="text-[9px] font-black uppercase tracking-widest mt-1.5 opacity-0 lg:group-hover:opacity-100 transition-opacity">Profile</span>
            </button>
          </div>

          <div className="hidden lg:flex flex-col items-center mt-auto space-y-6">
            <button className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 hover:border-imo-blue transition-all shadow-xl p-0.5 bg-white/5">
              <img src={currentUser.avatar} alt="profile" className="w-full h-full rounded-[14px] object-cover" referrerPolicy="no-referrer" />
            </button>
            <button 
              onClick={() => auth.signOut()}
              className="p-3 text-white/40 hover:text-red-500 transition-all hover:bg-red-500/10 rounded-2xl"
            >
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </div>

      <div className={`flex-1 flex flex-col relative overflow-hidden frosted-bg transition-all duration-500 ${selectedContact || isCalling ? 'ml-0' : 'ml-0 lg:ml-20 pb-24 lg:pb-0'}`}>
        
        {/* Chats View Redesign */}
        {activeView === 'chats' && !selectedContact && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 sm:px-8 pt-6 sm:pt-10 pb-4 sm:pb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none mb-1 sm:mb-2 text-glow">Chats</h1>
                <p className="text-white/40 font-bold text-[10px] sm:text-[11px] uppercase tracking-[0.2em]">6 Unread Messages</p>
              </div>
              <div className="flex items-center space-x-4" onClick={e => e.stopPropagation()}>
                <button className="p-3 bg-imo-blue text-white rounded-2xl shadow-xl shadow-imo-blue/20 hover:scale-105 transition-all">
                  <Plus size={22} />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-8 mb-6">
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-imo-blue transition-colors" size={20} />
                <input 
                  type="text"
                  placeholder="Search name or message..."
                  value={chatSearchText}
                  onChange={(e) => setChatSearchText(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-[24px] py-4 pl-14 pr-6 text-white text-sm focus:ring-4 focus:ring-imo-blue/20 focus:bg-white/10 outline-none transition-all placeholder:text-white/20"
                />
              </div>
            </div>

            {/* Stories Bar */}
            <div className="px-0 pb-6">
              <div className="flex items-center space-x-6 overflow-x-auto px-8 scrollbar-none pb-4">
                <div 
                  onClick={() => document.getElementById('story-upload')?.click()}
                  className="flex flex-col items-center space-y-3 flex-shrink-0 cursor-pointer group"
                >
                  <div className="relative w-18 h-18 group-active:scale-95 transition-transform">
                    <div className="absolute inset-0 bg-white/10 rounded-[2rem] border-2 border-dashed border-white/20 group-hover:border-imo-blue/40 transition-colors"></div>
                    <div className="absolute inset-1.5 bg-imo-blue rounded-[1.6rem] flex items-center justify-center text-white">
                      <Plus size={24} />
                    </div>
                    <input 
                      id="story-upload"
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleStoryUpload(file);
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Post Story</span>
                </div>

                {userStories.map((story) => (
                  <div 
                    key={story.id} 
                    onClick={() => setActiveStory(story.url)}
                    className="flex flex-col items-center space-y-3 flex-shrink-0 cursor-pointer group"
                  >
                    <div className="relative w-18 h-18 p-1 rounded-[2.5rem] bg-accent-green group-active:scale-95 transition-transform ring-4 ring-accent-green/20">
                      <div className="w-full h-full rounded-[2.3rem] overflow-hidden border-4 border-[#0A0D14]">
                        {story.type === 'image' ? (
                          <img src={story.url} className="w-full h-full object-cover" alt="story" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                            <Film size={20} className="text-white/40" />
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-imo-blue uppercase tracking-widest">My Story</span>
                  </div>
                ))}

                {INITIAL_CONTACTS.map((contact, i) => (
                  <div key={contact.id} className="flex flex-col items-center space-y-3 flex-shrink-0 cursor-pointer group">
                    <div className="relative w-18 h-18 p-1 rounded-[2.5rem] bg-gradient-to-tr from-imo-blue to-accent-purple group-active:scale-95 transition-transform">
                      <div className="w-full h-full rounded-[2.3rem] overflow-hidden border-4 border-[#0A0D14]">
                        <img 
                          src={`https://picsum.photos/seed/story${i}/200`} 
                          className="w-full h-full object-cover" 
                          alt={contact.name} 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      {i < 2 && (
                        <div className="absolute top-0 right-0 w-4 h-4 bg-imo-blue border-2 border-[#0A0D14] rounded-full"></div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">{contact.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-32 scrollbar-none">
              {syncedContacts
                .filter(contact => {
                  const query = chatSearchText.toLowerCase();
                  return contact.name.toLowerCase().includes(query) || 
                         (contact.lastMessage && contact.lastMessage.toLowerCase().includes(query));
                })
                .map((contact) => (
                <motion.div
                  key={contact.id}
                  whileHover={{ scale: 1.02, x: 5 }}
                  onClick={() => setSelectedContact(contact)}
                  className="glass-panel p-4 sm:p-5 rounded-[32px] sm:rounded-[40px] border border-white/5 flex items-center space-x-4 sm:space-x-5 cursor-pointer hover:bg-white/10 transition-all group shadow-xl"
                >
                  <div className="relative flex-shrink-0">
                    <img 
                      src={contact.avatar} 
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-[24px] sm:rounded-[28px] object-cover border-4 border-white/5 group-hover:border-imo-blue/20 transition-all" 
                      alt={contact.name} 
                      referrerPolicy="no-referrer"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-4 border-[#0A0D14] rounded-full shadow-lg transition-colors duration-500 ${
                      contact.status === 'online' ? 'bg-accent-green shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 
                      contact.status === 'away' ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 
                      'bg-white/20'
                    }`}></div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-lg font-black text-white truncate group-hover:text-imo-blue transition-colors">{contact.name}</h3>
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-widest whitespace-nowrap">
                        {contact.status === 'online' ? 'Active' : contact.lastSeen ? new Date(contact.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Offline'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white/40 truncate pr-6 group-hover:text-white/60 transition-colors">
                        {contact.isTyping ? (
                          <span className="text-imo-blue font-bold italic text-glow">Typing...</span>
                        ) : contact.lastMessage || contact.statusMessage}
                      </p>
                      {contact.unreadCount && contact.unreadCount > 0 ? (
                        <div className="min-w-[24px] h-[24px] px-2 bg-imo-blue rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-xl shadow-imo-blue/30 group-hover:scale-110 transition-transform">
                          {contact.unreadCount}
                        </div>
                      ) : (
                        <CheckCheck size={16} className="text-white/20" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Private Chat Window */}
        {selectedContact && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col h-full bg-[#0A0D14] relative z-[60] overflow-hidden"
          >
            {/* Custom Background Layer */}
            <div 
              className="absolute inset-0 z-0 transition-all duration-500 pointer-events-none"
              style={{ 
                backgroundColor: chatBackground.type === 'color' ? chatBackground.value : '#0A0D14',
                backgroundImage: chatBackground.type === 'image' ? `url(${chatBackground.value})` : undefined,
                backgroundSize: chatBackground.pattern ? 'auto' : 'cover',
                backgroundPosition: 'center',
                opacity: chatBackground.opacity
              }}
            />
            
            {/* Overlay to ensure contrast */}
            <div className="absolute inset-0 z-[1] bg-black/20 pointer-events-none" />

            {/* Header */}
            <div className="px-6 sm:px-8 py-4 sm:py-5 bg-black/40 backdrop-blur-3xl border-b border-white/10 flex items-center justify-between z-20 sticky top-0 shadow-2xl">
              <div className="flex items-center">
                <button 
                  onClick={() => setSelectedContact(null)}
                  className="mr-3 sm:mr-5 p-2 sm:p-3 text-white/40 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="relative group cursor-pointer pr-3 sm:pr-4 border-r border-white/10">
                  <img src={selectedContact.avatar} alt={selectedContact.name} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-white/10 group-hover:border-imo-blue transition-all shadow-xl" referrerPolicy="no-referrer" />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border-[3px] border-[#0A0D14] ${selectedContact.status === 'online' ? 'bg-accent-green shadow-[0_0_15px_rgba(74,222,128,0.6)]' : 'bg-white/20'}`}></div>
                </div>
                <div className="ml-3 sm:ml-5">
                  <h3 className="font-black text-white text-lg sm:text-xl leading-none mb-1 tracking-tight">{selectedContact.name}</h3>
                  <div className="flex items-center space-x-2">
                    {selectedContact.isTyping ? (
                      <motion.div 
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center space-x-1"
                      >
                        <span className="text-[10px] font-black text-accent-green uppercase tracking-[0.2em] italic">Typing</span>
                        <div className="flex space-x-0.5">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              animate={{ opacity: [0.2, 1, 0.2] }}
                              transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                              className="w-1 h-1 bg-accent-green rounded-full shadow-[0_0_5px_rgba(74,222,128,0.8)]"
                            />
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          selectedContact.status === 'online' ? 'bg-accent-green animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 
                          selectedContact.status === 'away' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]' : 
                          'bg-white/20'
                        }`}></div>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                          {selectedContact.status === 'online' ? 'Online' : 
                          selectedContact.status === 'away' ? 'Away' : 
                          'Offline'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 lg:space-x-3">
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Live Session</span>
                  <span className="text-[10px] font-black text-imo-blue uppercase tracking-widest">{selectedContact.status === 'online' ? 'Ready' : 'Standby'}</span>
                </div>
                <button 
                  onClick={() => setIsCalling('audio')} 
                  title="Voice Call"
                  className="p-3.5 bg-white/5 text-white/40 hover:bg-imo-blue/10 hover:text-imo-blue rounded-2xl transition-all flex items-center space-x-2 group"
                >
                  <Phone size={20} className="group-hover:scale-110 transition-transform" />
                </button>
                <button 
                  onClick={() => setIsCalling('video')} 
                  title="Video Call"
                  className="p-3.5 bg-imo-blue/10 text-imo-blue hover:bg-imo-blue hover:text-white rounded-2xl transition-all flex items-center space-x-2 group shadow-lg shadow-imo-blue/10"
                >
                  <Video size={20} className="group-hover:scale-110 transition-transform" />
                </button>
                <button className="p-3.5 text-white/40 hover:bg-white/10 hover:text-white rounded-2xl transition-all"><MoreVertical size={20} /></button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth bg-black/5 relative z-10"
            >
              {groupMessagesByDay(messages[selectedContact.id] || []).map((group) => (
                <div key={group.date} className="space-y-6">
                  <div className="flex justify-center sticky top-0 z-10 py-2">
                    <span className="px-5 py-1.5 bg-white/5 backdrop-blur-md text-white/40 text-[10px] uppercase tracking-[0.2em] font-black rounded-full border border-white/10 shadow-lg shadow-black/20">
                      {group.date}
                    </span>
                  </div>

                  {group.messages.map((msg) => {
                    const isMe = msg.senderId === 'me';
                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col relative group`}>
                            {/* Hover Reaction Button */}
                            <button 
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setReactionMenu({ messageId: msg.id, x: rect.left, y: rect.top });
                              }}
                              className={`absolute ${isMe ? '-left-10' : '-right-10'} top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 text-white/40 hover:text-white hidden sm:block z-20`}
                            >
                              <Smile size={18} />
                            </button>

                            <div 
                              onMouseDown={(e) => handleLongPressStart(msg.id, e)}
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              onMouseMove={handleLongPressMove}
                              onTouchStart={(e) => handleLongPressStart(msg.id, e)}
                              onTouchMove={handleLongPressMove}
                              onTouchEnd={handleLongPressEnd}
                              onContextMenu={(e) => e.preventDefault()}
                              className={`rounded-[2rem] text-[15px] shadow-3xl backdrop-blur-xl cursor-pointer select-none relative overflow-visible transition-all hover:shadow-imo-blue/10 active:scale-[0.98] ${
                                isMe 
                                  ? 'bg-gradient-to-br from-imo-blue to-[#0052FF] text-white rounded-tr-[0.6rem] border border-white/10' 
                                  : 'bg-[#1A1F2E]/90 text-white/90 rounded-tl-[0.6rem] border border-white/5 shadow-black/60'
                              } ${msg.type === 'text' ? 'px-6 py-4 break-words whitespace-pre-wrap overflow-hidden' : 'p-2 overflow-hidden'}`}
                            >
                              {msg.type === 'text' && msg.text}

                              {msg.type === 'image' && msg.imageUrl && (
                                <div 
                                  onClick={() => setFullScreenImage({ url: msg.imageUrl!, filter: msg.filter })}
                                  className="relative group/img"
                                >
                                  <img 
                                    src={msg.imageUrl} 
                                    style={{ filter: msg.filter || 'none' }}
                                    className="max-w-[240px] rounded-xl object-cover hover:brightness-110 transition-all"
                                    alt="msg-img"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/20">
                                    <Maximize2 size={24} className="text-white drop-shadow-lg" />
                                  </div>
                                </div>
                              )}

                              {msg.type === 'video' && msg.videoUrl && (
                                <div className="max-w-[240px] rounded-xl overflow-hidden bg-black/20">
                                  <video 
                                    src={msg.videoUrl} 
                                    controls 
                                    className="w-full h-auto"
                                  />
                                </div>
                              )}

                              {msg.type === 'voice' && (
                                <div className={`flex items-center space-x-3 px-4 py-3 min-w-[240px]`}>
                                  <button 
                                    onClick={() => setPlayingVoiceId(playingVoiceId === msg.id ? null : msg.id)}
                                    className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition-all shadow-lg"
                                  >
                                    {playingVoiceId === msg.id ? (
                                      <div className="flex space-x-1">
                                        <div className="w-1 h-3 bg-white rounded-full"></div>
                                        <div className="w-1 h-3 bg-white rounded-full"></div>
                                      </div>
                                    ) : (
                                      <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></div>
                                    )}
                                  </button>
                                  <div className="flex-1 flex items-center space-x-1 h-8">
                                    {Array.from({ length: 24 }).map((_, i) => {
                                      const progress = (i / 24) * 100;
                                      const isActive = playingVoiceId === msg.id && progress <= playbackProgress;
                                      const height = (Math.sin(i * 0.5) * 0.5 + 0.5) * 20 + 4;
                                      return (
                                        <div 
                                          key={i} 
                                          className={`w-1 rounded-full transition-all duration-300 ${
                                            isActive ? 'bg-white shadow-[0_0_5px_white]' : 'bg-white/30'
                                          }`} 
                                          style={{ height: `${height}px` }}
                                        />
                                      );
                                    })}
                                  </div>
                                  <span className="text-[10px] font-black opacity-60 tracking-tighter">{formatTime(msg.voiceDuration || 0)}</span>
                                </div>
                              )}
                              
                              {/* Reactions Badge */}
                              {msg.reactions && msg.reactions.length > 0 && (
                                <motion.div 
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className={`absolute -bottom-3 ${isMe ? 'right-4' : 'left-4'} flex items-center bg-[#1A1F2E] border border-white/20 rounded-full px-2.5 py-1 space-x-1 shadow-[0_4px_15px_rgba(0,0,0,0.4)] z-10 hover:scale-110 transition-transform cursor-default select-none group/reactions`}
                                >
                                  {msg.reactions.map((emoji, i) => (
                                    <span 
                                      key={i} 
                                      className="text-[13px] drop-shadow-sm hover:scale-125 transition-transform"
                                      title="Remove reaction"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddReaction(msg.id, emoji);
                                      }}
                                    >
                                      {emoji}
                                    </span>
                                  ))}
                                  {msg.reactions.length > 1 && (
                                    <span className="text-[9px] font-black text-white/40 pl-0.5">{msg.reactions.length}</span>
                                  )}
                                </motion.div>
                              )}
                            </div>
                            <span className="text-[10px] text-white/30 mt-3 px-1 font-bold tracking-tight flex items-center">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                              {isMe && (
                                <span className="ml-1.5">
                                  {msg.status === 'read' ? (
                                    <CheckCheck size={12} className="text-imo-blue" />
                                  ) : (
                                    <Check size={12} className="text-white/40" />
                                  )}
                                </span>
                              )}
                            </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
              
              {/* Typing Bubble */}
              {selectedContact.isTyping && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="flex justify-start mb-8"
                >
                  <div className="bg-[#1A1F2E]/90 backdrop-blur-xl border border-white/5 rounded-[2rem] rounded-tl-[0.6rem] px-5 py-3 shadow-2xl flex items-center space-x-1.5">
                    <motion.div 
                      animate={{ opacity: [0.4, 1, 0.4] }} 
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      className="w-1.5 h-1.5 bg-imo-blue rounded-full shadow-[0_0_8px_rgba(0,132,255,0.6)]" 
                    />
                    <motion.div 
                      animate={{ opacity: [0.4, 1, 0.4] }} 
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      className="w-1.5 h-1.5 bg-imo-blue rounded-full shadow-[0_0_8px_rgba(0,132,255,0.6)]" 
                    />
                    <motion.div 
                      animate={{ opacity: [0.4, 1, 0.4] }} 
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      className="w-1.5 h-1.5 bg-imo-blue rounded-full shadow-[0_0_8px_rgba(0,132,255,0.6)]" 
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Redesigned Typing Dashboard (Matching user reference) */}
            <div className="p-4 sm:p-6 bg-black/10 backdrop-blur-xl border-t border-white/5 relative z-20">
              
              {/* Emoji Picker Overlay */}
              <AnimatePresence>
                {isEmojiPickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-24 left-6 right-6 bg-white rounded-3xl p-6 shadow-2xl z-[100] border border-black/5"
                  >
                    <div className="flex items-center justify-between mb-4 px-2">
                       <span className="text-[10px] font-black text-black/20 uppercase tracking-widest">Select Emoji</span>
                       <button onClick={() => setIsEmojiPickerOpen(false)} className="text-black/40 hover:text-black"><X size={18} /></button>
                    </div>
                    <div className="grid grid-cols-8 gap-4 max-h-48 overflow-y-auto custom-scrollbar">
                      {EMOJIS.map((emoji) => (
                        <button 
                          key={emoji}
                          onClick={() => {
                            setInputText(prev => prev + emoji);
                            setIsEmojiPickerOpen(false);
                          }}
                          className="text-2xl hover:scale-125 hover:bg-black/5 rounded-xl p-2 transition-all"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Gallery Overlay */}
              {/* WhatsApp Style Action Menu */}
              <AnimatePresence>
                {isActionMenuOpen && (
                  <div className="absolute bottom-28 left-6 w-full max-w-[300px] z-[80]">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 100 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 100 }}
                      className="bg-[#1A1F2E]/95 backdrop-blur-3xl rounded-[2.5rem] p-5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10"
                    >
                      <div className="grid grid-cols-3 gap-y-6">
                        {[
                          { icon: <ImageIcon size={22} />, label: 'Gallery', color: 'bg-[#C165DD]', action: () => { setIsGalleryOpen(true); setIsActionMenuOpen(false); } },
                          { icon: <Camera size={22} />, label: 'Camera', color: 'bg-[#FF5C5C]', action: () => {} },
                          { icon: <FileText size={22} />, label: 'Document', color: 'bg-[#7F66FF]', action: () => {} },
                          { icon: <MapPin size={22} />, label: 'Location', color: 'bg-[#00D4AA]', action: () => {} },
                          { icon: <User size={22} />, label: 'Contact', color: 'bg-[#0084FF]', action: () => {} },
                          { icon: <Music size={22} />, label: 'Audio', color: 'bg-[#FF8A00]', action: () => {} },
                        ].map((item, i) => (
                          <button 
                            key={i}
                            onClick={item.action}
                            className="flex flex-col items-center space-y-2 group transition-all"
                          >
                            <div className={`${item.color} w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 active:scale-95 transition-all`}>
                              {item.icon}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Full-Screen Gallery Picker - Like WhatsApp */}
              <AnimatePresence>
                {isGalleryOpen && (
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-0 z-[200] bg-[#0A0D14] flex flex-col"
                  >
                    <div className="px-6 py-8 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl">
                      <div className="flex items-center space-x-5">
                        <button onClick={() => setIsGalleryOpen(false)} className="p-3 bg-white/5 rounded-2xl text-white/60 hover:text-white hover:bg-white/10 transition-all">
                          <ChevronLeft size={24} />
                        </button>
                        <div>
                          <h2 className="text-2xl font-black text-white leading-none">All media</h2>
                          <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-1.5">
                            {selectedGalleryImages.length} images selected
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-3 text-white/40 hover:text-white transition-colors"><CheckCircle size={24} /></button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-black/20">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
                        {/* Upload Tile */}
                        <motion.div 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => galleryInputRef.current?.click()}
                          className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden cursor-pointer transition-all border-4 border-dashed border-white/10 hover:border-white/20 flex flex-col items-center justify-center space-y-3 bg-white/5 group"
                        >
                          <div className="w-16 h-16 bg-[#C165DD]/10 text-[#C165DD] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-[#C165DD]/5">
                            <Plus size={32} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white">Upload</span>
                        </motion.div>

                        {/* Camera Tile */}
                        <motion.div 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setIsCalling('video')} // Mock camera action
                          className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden cursor-pointer transition-all border-4 border-white/5 hover:border-white/10 flex flex-col items-center justify-center space-y-3 bg-indigo-500/10 group"
                        >
                          <div className="w-16 h-16 bg-[#FF5C5C]/10 text-[#FF5C5C] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-[#FF5C5C]/5">
                            <Camera size={28} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white">Camera</span>
                        </motion.div>

                        {/* Document Tile */}
                        <motion.div 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.95 }}
                          className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden cursor-pointer transition-all border-4 border-white/5 hover:border-white/10 flex flex-col items-center justify-center space-y-3 bg-blue-500/10 group"
                        >
                          <div className="w-16 h-16 bg-[#7F66FF]/10 text-[#7F66FF] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-[#7F66FF]/5">
                            <FileText size={28} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white">Document</span>
                        </motion.div>

                        <input 
                          type="file"
                          className="hidden"
                          ref={galleryInputRef}
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'gallery')}
                        />

                        {GALLERY_IMAGES_STATE.map((img, idx) => (
                          <motion.div 
                            key={idx}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              if (selectedGalleryImages.includes(img)) {
                                setSelectedGalleryImages(prev => prev.filter(i => i !== img));
                              } else {
                                setSelectedGalleryImages(prev => [...prev, img]);
                              }
                            }}
                            className={`relative aspect-[3/4] rounded-[2.5rem] overflow-hidden cursor-pointer transition-all border-4 ${
                              selectedGalleryImages.includes(img) ? 'border-imo-blue ring-8 ring-imo-blue/20 scale-95' : 'border-white/5 hover:border-white/10'
                            }`}
                          >
                            <img src={img} className="w-full h-full object-cover" alt={`gallery-${idx}`} referrerPolicy="no-referrer" />
                            <div className={`absolute top-4 right-4 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center transition-all ${
                              selectedGalleryImages.includes(img) ? 'bg-imo-blue border-imo-blue shadow-lg scale-110' : 'bg-black/20 backdrop-blur-md'
                            }`}>
                              {selectedGalleryImages.includes(img) ? (
                                <Check size={16} className="text-white" strokeWidth={4} />
                              ) : (
                                <span className="text-[10px] font-black text-white/40">{idx + 1}</span>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Send FAB - Opens Editor first */}
                    <AnimatePresence>
                      {selectedGalleryImages.length > 0 && (
                        <motion.div 
                          initial={{ scale: 0, opacity: 0, rotate: -90 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          exit={{ scale: 0, opacity: 0, rotate: 90 }}
                          className="fixed bottom-12 right-12"
                        >
                          <button 
                            onClick={() => {
                              const initialEditing = selectedGalleryImages.map(url => ({ url, filter: 'none' }));
                              setEditingImages(initialEditing);
                              setActiveEditorIndex(0);
                              setIsEditorOpen(true);
                            }}
                            className="w-20 h-20 bg-imo-blue text-white rounded-full flex items-center justify-center shadow-[0_20px_50px_-10px_rgba(0,132,255,0.5)] hover:bg-imo-blue/90 hover:scale-110 active:scale-95 transition-all group overflow-visible"
                          >
                            <Send size={32} fill="currentColor" className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            <div className="absolute -top-3 -right-3 w-10 h-10 bg-white text-imo-blue rounded-full flex items-center justify-center text-sm font-black border-4 border-[#0A0D14] shadow-xl">
                              {selectedGalleryImages.length}
                            </div>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Image Editor Overlay - WhatsApp Style Filters */}
              <AnimatePresence>
                {isEditorOpen && editingImages.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 z-[300] bg-black flex flex-col"
                  >
                    {/* Header */}
                    <div className="px-6 py-8 flex items-center justify-between z-10">
                      <button 
                        onClick={() => setIsEditorOpen(false)}
                        className="p-4 bg-white/10 backdrop-blur-3xl rounded-3xl text-white hover:bg-white/20 transition-all"
                      >
                        <X size={24} />
                      </button>
                      <div className="flex flex-col items-center">
                        <span className="text-white font-black text-lg tracking-tight">Edit Photo</span>
                        <span className="text-white/40 text-[10px] uppercase font-black tracking-widest mt-1">
                          {activeEditorIndex + 1} of {editingImages.length}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          if (!selectedContact) return;
                          editingImages.forEach(imgData => {
                            const newMessage: Message = {
                              id: Math.random().toString(36).substr(2, 9),
                              senderId: 'me',
                              text: '',
                              imageUrl: imgData.url,
                              filter: imgData.filter,
                              timestamp: new Date(),
                              status: 'sent',
                              type: 'image'
                            };
                            setMessages(prev => ({
                              ...prev,
                              [selectedContact.id]: [...(prev[selectedContact.id] || []), newMessage]
                            }));
                          });
                          setSelectedGalleryImages([]);
                          setEditingImages([]);
                          setIsGalleryOpen(false);
                          setIsEditorOpen(false);
                          setIsActionMenuOpen(false);
                        }}
                        className="px-8 py-3 bg-imo-blue text-white rounded-full font-black uppercase text-xs tracking-widest shadow-2xl shadow-imo-blue/30 hover:scale-105 active:scale-95 transition-all"
                      >
                        Send
                      </button>
                    </div>

                    {/* Active Image with Filter */}
                    <div className="flex-1 relative flex items-center justify-center p-4">
                      {editingImages.map((imgData, idx) => (
                        <AnimatePresence key={idx}>
                          {idx === activeEditorIndex && (
                            <motion.div
                              initial={{ opacity: 0, x: 100 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -100 }}
                              className="absolute inset-0 flex items-center justify-center p-4"
                            >
                              <img 
                                src={imgData.url} 
                                style={{ filter: imgData.filter }}
                                className="max-w-full max-h-full object-contain rounded-[2rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)]"
                                referrerPolicy="no-referrer"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      ))}
                    </div>

                    {/* Filter Selection */}
                    <div className="bg-black/80 backdrop-blur-3xl border-t border-white/5 p-8">
                      <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-6 text-center">Swipe up to apply filters</p>
                      <div className="flex space-x-6 overflow-x-auto pb-4 custom-scrollbar scrollbar-none snap-x active:cursor-grabbing">
                        {IMAGE_FILTERS.map((f, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              const newEditing = [...editingImages];
                              newEditing[activeEditorIndex].filter = f.value;
                              setEditingImages(newEditing);
                            }}
                            className="flex flex-col items-center flex-shrink-0 space-y-3 group"
                          >
                            <div className={`w-20 h-24 rounded-2xl overflow-hidden border-2 transition-all ${
                              editingImages[activeEditorIndex].filter === f.value ? 'border-imo-blue scale-110 shadow-[0_0_20px_rgba(0,132,255,0.4)]' : 'border-white/10 grayscale-[0.5]'
                            }`}>
                              <img 
                                src={editingImages[activeEditorIndex].url}
                                style={{ filter: f.value }}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                              editingImages[activeEditorIndex].filter === f.value ? 'text-imo-blue' : 'text-white/40 group-hover:text-white'
                            }`}>
                              {f.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Multi-image indicator dots */}
                    {editingImages.length > 1 && (
                      <div className="pb-8 flex justify-center space-x-2">
                        {editingImages.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveEditorIndex(i)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              i === activeEditorIndex ? 'w-6 bg-imo-blue' : 'bg-white/20'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="bg-transparent px-4 pb-6 lg:pb-10 relative z-10 transition-all duration-300">
                <div className="max-w-4xl mx-auto">
                  <div className="relative flex items-end space-x-2.5">
                    {/* The Main Input Pill */}
                    <div className="flex-1 bg-[#1E2433] rounded-[30px] border border-white/5 flex items-end px-1.5 py-1.5 min-h-[54px] shadow-2xl group focus-within:bg-[#252C3D] transition-all">
                      
                      {/* Attachment Trigger (Opens Gallery Directly) */}
                      <button 
                         onClick={() => setIsGalleryOpen(true)}
                         className="p-2.5 text-white/40 hover:text-white transition-all active:scale-90"
                      >
                         <Plus size={24} strokeWidth={2.5} />
                      </button>

                      {/* Emoji Trigger */}
                      <button 
                         onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                         className={`p-2.5 text-white/40 hover:text-white transition-all active:scale-90 ${isEmojiPickerOpen ? 'text-imo-blue' : ''}`}
                      >
                         <Smile size={24} strokeWidth={2.5} />
                      </button>

                      {/* Text Input */}
                      <div className="flex-1 px-1 py-1.5 sm:py-2">
                        <textarea
                          rows={1}
                          ref={(el) => {
                            if (el) {
                              el.style.height = 'px'; 
                              el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
                            }
                          }}
                          value={inputText}
                          onChange={(e) => {
                            setInputText(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (inputText.trim()) handleSendMessage();
                            }
                          }}
                          placeholder="Type a message"
                          className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-[16.5px] text-white placeholder:text-white/20 resize-none overflow-y-auto custom-scrollbar font-normal leading-normal max-h-[180px] break-words align-bottom pb-1"
                        />
                      </div>
                    </div>

                    {/* Right Side: Mic or Send (Outside the pill) */}
                    <div className="pb-0.5">
                      <AnimatePresence mode="wait">
                        {inputText.trim() ? (
                          <motion.button
                            key="send"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={handleSendMessage}
                            className="w-[50px] h-[50px] bg-imo-blue rounded-full flex items-center justify-center text-white shadow-lg shadow-imo-blue/25 hover:scale-105 active:scale-95 transition-all"
                          >
                            <Send size={20} fill="currentColor" className="ml-1" />
                          </motion.button>
                        ) : (
                          <motion.button
                            key="mic"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={isRecording ? stopAndSendVoice : startRecording}
                            className={`w-[50px] h-[50px] rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg ${
                              isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-imo-blue text-white shadow-imo-blue/20'
                            }`}
                          >
                            {isRecording ? <div className="w-2.5 h-2.5 bg-white rounded-full" /> : <Mic size={22} />}
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Home Screen (Placeholder when no chat selected) */}
        {activeView === 'chats' && !selectedContact && (
          <div className="hidden lg:flex flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0A0D14]">
            <div className="w-24 h-24 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full mb-8 flex items-center justify-center text-imo-blue shadow-2xl">
              <MessageSquare size={40} className="drop-shadow-[0_0_10px_rgba(0,132,255,0.5)]" />
            </div>
            <h2 className="text-3xl font-black text-white mb-3 tracking-tight">imo Messenger</h2>
            <p className="text-white/40 max-w-sm leading-relaxed">
              Connect anywhere, freely. High-quality video calls and private messaging with 256-bit encryption.
            </p>
          </div>
        )}
        
        {/* People View Redesign */}
        {activeView === 'contacts' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col h-full overflow-hidden bg-[#0A0D14]"
          >
            {/* Header */}
            <div className="px-10 pt-12 pb-8 flex items-center justify-between border-b border-white/5">
              <div>
                <h1 className="text-4xl font-black text-white tracking-tight leading-none mb-2">Contacts</h1>
                <p className="text-white/40 font-bold text-[11px] uppercase tracking-[0.2em]">Manage your network</p>
              </div>
              <button 
                className="flex items-center space-x-3 px-6 py-4 bg-imo-blue text-white rounded-2xl shadow-xl shadow-imo-blue/20 hover:scale-105 active:scale-95 transition-all group"
                onClick={() => {
                  setActiveView('chats');
                  setSelectedContact(null);
                }}
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                <span className="text-sm font-black uppercase tracking-widest">New Chat</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-10 mt-8 mb-4">
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-imo-blue transition-colors" size={22} />
                <input 
                  type="text"
                  placeholder="Search contacts by name or phone..."
                  value={contactSearchText}
                  onChange={(e) => setContactSearchText(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-16 pr-8 text-white text-lg focus:ring-4 focus:ring-imo-blue/20 focus:bg-white/10 outline-none transition-all placeholder:text-white/10"
                />
              </div>
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto px-10 space-y-8 pb-32 custom-scrollbar">
              {/* Local Contacts */}
              <div>
                <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-6 pl-6 flex items-center">
                  <User size={12} className="mr-3" />
                  My Contacts
                </h4>
                <div className="space-y-1">
                  {syncedContacts
                    .filter(c => c.name.toLowerCase().includes(contactSearchText.toLowerCase()))
                    .map((contact) => (
                      <motion.div
                        key={contact.id}
                        whileHover={{ x: 8, backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
                        onClick={() => {
                          setSelectedContact(contact);
                          setActiveView('chats');
                        }}
                        className="flex items-center space-x-6 p-6 rounded-[2.5rem] border border-transparent hover:border-white/5 transition-all cursor-pointer group"
                      >
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-imo-blue rounded-[2.2rem] blur-2xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                          <img 
                            src={contact.avatar} 
                            className="w-18 h-18 rounded-[2.2rem] object-cover border-[5px] border-white/5 relative z-10 shadow-2xl" 
                            alt={contact.name} 
                            referrerPolicy="no-referrer" 
                          />
                          <div className={`absolute -bottom-1 -right-1 w-7 h-7 border-[5px] border-[#0A0D14] rounded-full z-20 shadow-xl transition-colors duration-500 ${
                            contact.status === 'online' ? 'bg-accent-green shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 
                            contact.status === 'away' ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 
                            'bg-white/10'
                          }`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-2xl font-black text-white group-hover:text-imo-blue transition-all truncate tracking-tight">
                            {contact.name}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1.5">
                            {contact.status === 'online' ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-accent-green shadow-[0_0_5px_rgba(74,222,128,0.8)]"></div>
                                <span className="text-accent-green text-[11px] font-black uppercase tracking-[0.2em] opacity-80">Active Now</span>
                              </div>
                            ) : contact.status === 'away' ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.8)]"></div>
                                <span className="text-yellow-500 text-[11px] font-black uppercase tracking-[0.2em] opacity-80">Away</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-white/20"></div>
                                <span className="text-white/30 text-[11px] font-bold tracking-[0.05em]">
                                  {contact.lastSeen 
                                    ? `Last seen ${new Date(contact.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}` 
                                    : 'Offline'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="hidden group-hover:flex items-center space-x-3 pr-2">
                          <button className="w-14 h-14 bg-white/5 text-white/40 hover:text-imo-blue hover:bg-imo-blue/10 rounded-2xl transition-all flex items-center justify-center border border-white/5">
                            <Phone size={22} />
                          </button>
                          <button className="w-14 h-14 bg-white/5 text-white/40 hover:text-imo-blue hover:bg-imo-blue/10 rounded-2xl transition-all flex items-center justify-center border border-white/5">
                            <Video size={22} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </div>

              {/* Global Search Results */}
              {(contactSearchText.length >= 3 || searchResults.length > 0) && (
                <div className="pt-4 border-t border-white/5">
                  <h4 className="text-[10px] font-black text-imo-blue uppercase tracking-[0.4em] mb-6 pl-6 flex items-center">
                    <Globe size={12} className="mr-3" />
                    Global Search Results
                  </h4>
                  <div className="space-y-1">
                    {isSearchingGlobal ? (
                      <div className="flex items-center justify-center py-12 space-x-4">
                        <div className="w-2 h-2 bg-imo-blue rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-imo-blue rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-imo-blue rounded-full animate-bounce delay-200"></div>
                        <p className="text-imo-blue text-[10px] font-black uppercase tracking-widest pl-2">Searching Network...</p>
                      </div>
                    ) : searchResults.filter(u => !syncedContacts.find(sc => sc.id === u.id)).length > 0 ? (
                      searchResults
                        .filter(u => !syncedContacts.find(sc => sc.id === u.id))
                        .map((user) => (
                        <motion.div
                          key={user.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ x: 8, backgroundColor: 'rgba(0, 132, 255, 0.05)' }}
                          onClick={() => handleStartChat(user)}
                          className="flex items-center space-x-6 p-6 rounded-[2.5rem] border border-transparent hover:border-imo-blue/20 transition-all cursor-pointer group"
                        >
                          <div className="relative flex-shrink-0">
                            <img 
                              src={user.avatar} 
                              className="w-18 h-18 rounded-[2.2rem] object-cover border-[5px] border-white/5 relative z-10 shadow-xl" 
                              alt={user.name} 
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 border-[5px] border-[#0A0D14] bg-accent-green rounded-full z-20 shadow-xl shadow-accent-green/30" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="text-2xl font-black text-white group-hover:text-imo-blue transition-all truncate tracking-tight flex items-center">
                              {user.name}
                              <span className="ml-3 px-2 py-0.5 bg-imo-blue/10 text-imo-blue text-[9px] font-black rounded uppercase tracking-tighter">Verified</span>
                            </h3>
                            <p className="text-white/30 text-[11px] font-bold tracking-[0.05em] mt-1.5 flex items-center">
                              @{user.username || 'user'} • Free to chat
                            </p>
                          </div>
                          
                          <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 pr-6">
                            <button className="flex items-center space-x-3 px-6 py-3 bg-imo-blue text-white rounded-2xl shadow-lg shadow-imo-blue/20">
                               <Plus size={18} />
                               <span className="text-[10px] font-black uppercase tracking-widest">Connect</span>
                            </button>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      contactSearchText.length >= 3 && (
                        <div className="text-center py-12">
                          <p className="text-white/20 text-sm font-bold tracking-tight">No global users found for "{contactSearchText}"</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Settings View Redesign */}


        {/* Config View Redesign */}
        {activeView === 'settings' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            {/* Header */}
            <div className="px-8 pt-10 pb-6 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black text-white tracking-tight leading-none mb-2">Config</h1>
                <p className="text-white/40 font-bold text-[11px] uppercase tracking-[0.2em]">Profile & Identity</p>
              </div>
              <button 
                onClick={() => auth.signOut()}
                className="p-3 bg-red-500/20 text-red-500 border border-red-500/30 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
              >
                <LogOut size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 space-y-8 pb-32">
              {/* Profile Card */}
              <div className="glass-panel p-8 rounded-[48px] border border-white/5 flex flex-col items-center text-center shadow-3xl bg-gradient-to-b from-white/5 to-transparent mt-4 relative overflow-hidden">
                {!isEditingProfile ? (
                  <>
                    <div className="relative group cursor-pointer mb-6" onClick={() => {
                        setEditName(currentUser.name);
                        setEditUsername(currentUser.username);
                        setEditAvatar(currentUser.avatar);
                        setIsEditingProfile(true);
                    }}>
                      <div className="absolute -inset-2 bg-gradient-to-tr from-imo-blue to-accent-purple rounded-[4rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                      <img 
                        src={currentUser.avatar} 
                        alt={currentUser.name} 
                        className="relative w-36 h-36 rounded-[3.5rem] object-cover border-4 border-white/10 ring-8 ring-white/5"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -bottom-2 -right-2 p-3.5 bg-imo-blue text-white rounded-2xl shadow-2xl shadow-imo-blue/40 ring-4 ring-[#0A0D14]">
                        <Camera size={22} />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-white mb-2 tracking-tight">{currentUser.name}</h2>
                      <p className="text-imo-blue font-black text-[11px] uppercase tracking-[0.4em]">@{currentUser.username}</p>
                    </div>
                  </>
                ) : (
                  <div className="w-full space-y-6">
                    <div className="flex flex-col items-center">
                      <div className="relative mb-4 group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                        <img 
                          src={editAvatar || currentUser.avatar} 
                          alt="preview" 
                          className="w-28 h-28 rounded-[2.5rem] object-cover border-4 border-imo-blue/30 group-hover:opacity-80 transition-all"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-[2.5rem]">
                          <Camera size={24} className="text-white" />
                        </div>
                        <input 
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressedDataUrl = await compressAndResizeImage(file);
                                setEditAvatar(compressedDataUrl);
                              } catch (err) {
                                console.error("Image compression error:", err);
                                alert("Failed to process image. Please try another one.");
                              }
                            }
                          }}
                        />
                      </div>
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-6">Tap photo to open gallery</p>
                    </div>

                    <div className="space-y-4 text-left">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2 mb-2 block">Display Name</label>
                        <input 
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-imo-blue/50 transition-all"
                          placeholder="Your Name"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2 mb-2 block">Unique Username</label>
                        <div className="relative">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-imo-blue font-black">@</span>
                          <input 
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white font-bold outline-none focus:border-imo-blue/50 transition-all font-mono"
                            placeholder="username"
                          />
                        </div>
                        <p className="text-[8px] text-white/20 mt-2 px-2 uppercase font-black tracking-widest">A-Z, 0-9, and underscores only</p>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-6">
                      <button 
                        onClick={handleUpdateProfile}
                        disabled={isSavingProfile}
                        className="flex-1 py-5 bg-imo-blue text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-imo-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center"
                      >
                        {isSavingProfile ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                      <button 
                        onClick={() => setIsEditingProfile(false)}
                        className="flex-1 py-5 bg-white/5 text-white/40 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Menu */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4 mb-2 px-6">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Account Settings</span>
                  <div className="flex-1 h-[1px] bg-white/5"></div>
                </div>

                {[
                  { icon: Mail, label: 'Verified Email', value: 'imo_user@network.com', color: 'text-imo-blue' },
                  { icon: Smartphone, label: 'Primary Phone', value: '+1 (555) 000-0000', color: 'text-accent-green' },
                  { icon: Bell, label: 'Notifications', value: 'Smart Alerts Enabled', color: 'text-accent-purple' },
                  { icon: Shield, label: 'Security Layer', value: 'Biometric Locked', color: 'text-imo-blue' },
                ].map((item, idx) => (
                  <div key={idx} className="glass-panel p-6 rounded-[32px] border border-white/5 flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer group shadow-xl">
                    <div className="flex items-center space-x-5">
                      <div className={`w-14 h-14 rounded-[22px] bg-white/5 flex items-center justify-center ${item.color.replace('text-', 'bg-')}/10 ${item.color} group-hover:scale-110 transition-transform`}>
                        <item.icon size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none mb-1.5">{item.label}</p>
                        <p className="text-base font-black text-white group-hover:text-imo-blue transition-colors">{item.value}</p>
                      </div>
                    </div>
                    <ChevronLeft size={20} className="rotate-180 text-white/10 group-hover:text-imo-blue transition-colors" />
                  </div>
                ))}
              </div>

              {/* Chat Customization */}
              <div className="space-y-6">
                <div className="flex items-center space-x-4 mb-2 px-6">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Appearance & Wallpaper</span>
                  <div className="flex-1 h-[1px] bg-white/5"></div>
                </div>

                <div className="glass-panel p-8 rounded-[48px] border border-white/5 shadow-3xl bg-gradient-to-br from-white/5 to-transparent">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-imo-blue/10 text-imo-blue rounded-2xl flex items-center justify-center">
                        <Palette size={24} />
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-white leading-none">Chat Wallpaper</h4>
                        <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-1.5">Customize your background</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                    {CHAT_WALLPAPERS.map((wp, i) => (
                      <button
                        key={i}
                        onClick={() => setChatBackground({ ...chatBackground, type: wp.type as any, value: wp.value, pattern: (wp as any).isPattern ? wp.value : undefined })}
                        className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${
                          chatBackground.value === wp.value ? 'border-imo-blue ring-4 ring-imo-blue/20' : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        {wp.type === 'color' ? (
                          <div className="w-full h-full" style={{ backgroundColor: wp.value }}></div>
                        ) : (
                          <img src={wp.value} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        )}
                        {chatBackground.value === wp.value && (
                          <div className="absolute inset-0 bg-imo-blue/20 flex items-center justify-center">
                            <Check size={20} className="text-white drop-shadow-lg" />
                          </div>
                        )}
                      </button>
                    ))}
                    
                    {/* Custom Image Input */}
                    <button 
                      onClick={() => wallpaperInputRef.current?.click()}
                      className="relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-dashed border-white/10 hover:border-white/30 flex flex-col items-center justify-center space-y-2 text-white/40 hover:text-white transition-all bg-white/5 active:scale-95"
                    >
                      <ImageIcon size={24} />
                      <span className="text-[8px] font-black uppercase tracking-widest text-center px-1">Upload Photo</span>
                    </button>

                    <button 
                      onClick={() => {
                        const url = prompt('Enter custom image URL:');
                        if (url) setChatBackground({ ...chatBackground, type: 'image', value: url });
                      }}
                      className="relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-dashed border-white/10 hover:border-white/30 flex flex-col items-center justify-center space-y-2 text-white/40 hover:text-white transition-all bg-white/5 active:scale-95"
                    >
                      <Plus size={24} />
                      <span className="text-[8px] font-black uppercase tracking-widest text-center px-1">Custom URL</span>
                    </button>
                    
                    <input 
                      type="file"
                      ref={wallpaperInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'wallpaper')}
                    />
                  </div>
                  
                  {/* Opacity Slider */}
                  <div className="mt-8 pt-6 border-t border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Wallpaper Opacity</span>
                      <span className="text-imo-blue font-black text-xs">{Math.round(chatBackground.opacity * 100)}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={chatBackground.opacity}
                      onChange={(e) => setChatBackground({ ...chatBackground, opacity: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-imo-blue"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>


      {/* Call Overlay */}
      <AnimatePresence>
        {isCalling && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            onMouseMove={() => {
              setShowCallUI(true);
              if (callUIHideTimer.current) clearTimeout(callUIHideTimer.current);
              callUIHideTimer.current = setTimeout(() => setShowCallUI(false), 3000);
            }}
            onTouchStart={() => {
              setShowCallUI(true);
              if (callUIHideTimer.current) clearTimeout(callUIHideTimer.current);
              callUIHideTimer.current = setTimeout(() => setShowCallUI(false), 3000);
            }}
            onClick={() => setShowCallUI(true)}
            className="fixed inset-0 z-50 bg-gray-900/95 backdrop-blur-xl flex flex-col overflow-hidden"
          >
            {/* Call Content */}
            <div className={`flex-1 relative flex flex-col items-center justify-center p-8 transition-all duration-700 ${!showCallUI && callStatus === 'active' ? 'scale-105' : 'scale-100'}`}>
              
              {/* Top Controls Overlay */}
              <AnimatePresence>
                {showCallUI && (
                  <motion.div 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className="absolute top-0 left-0 right-0 h-32 px-10 flex items-center justify-between z-40 pointer-events-auto"
                  >
                    <div className="flex items-center space-x-6">
                      <div className="w-14 h-14 bg-imo-blue text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-imo-blue/20 ring-4 ring-imo-blue/10">
                        <Video size={28} />
                      </div>
                      <div>
                        <h4 className="text-white text-xl font-black tracking-tight leading-none mb-1">{selectedContact?.name}</h4>
                        <div className="flex items-center space-x-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse"></div>
                           <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.2em]">Secure Video Call</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Quality Selector */}
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowQualityMenu(!showQualityMenu);
                          }}
                          className="flex items-center space-x-3 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[20px] transition-all group"
                        >
                          <Settings size={18} className="text-white/40 group-hover:text-imo-blue transition-colors" />
                          <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{videoQuality}</span>
                          <ChevronDown size={14} className={`text-white/20 transition-transform ${showQualityMenu ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {showQualityMenu && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute top-full right-0 mt-3 w-48 bg-gray-900/90 backdrop-blur-2xl border border-white/10 rounded-[28px] overflow-hidden shadow-3xl z-50 p-2"
                            >
                              {(['Auto', '360p', '720p', '1080p'] as const).map((q) => (
                                <button
                                  key={q}
                                  onClick={() => {
                                    setVideoQuality(q);
                                    setShowQualityMenu(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${
                                    videoQuality === q ? 'bg-imo-blue/10 text-imo-blue' : 'text-white/40 hover:bg-white/5 hover:text-white'
                                  }`}
                                >
                                  <span className="text-xs font-black uppercase tracking-widest">{q}</span>
                                  {videoQuality === q && <Check size={16} />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      <button className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[22px] text-white/40 hover:text-white transition-all">
                        <Users size={22} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Media Error Notification */}
              <AnimatePresence>
                {mediaError && (
                  <motion.div
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    className="absolute top-36 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-3 px-6 py-4 bg-orange-500/20 backdrop-blur-xl border border-orange-500/30 rounded-3xl shadow-2xl shadow-orange-500/10 min-w-[320px]"
                  >
                    <div className="w-10 h-10 bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-500">
                      <Shield size={20} />
                    </div>
                    <div>
                      <p className="text-orange-500 font-black uppercase tracking-[0.2em] text-[10px] leading-none mb-1">Hardware Conflict</p>
                      <p className="text-white/80 text-xs font-medium">{mediaError}</p>
                    </div>
                    <button 
                      onClick={() => setMediaError(null)}
                      className="ml-auto p-2 text-white/20 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Call Status Indicator */}
              <div className="absolute top-10 flex flex-col items-center space-y-4">
                <div className="px-6 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full flex items-center space-x-3 shadow-xl">
                  <div className={`w-2 h-2 rounded-full ${callStatus === 'connecting' ? 'bg-orange-500 animate-pulse' : 'bg-accent-green'}`}></div>
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
                    {callStatus === 'connecting' ? (
                      <span className="flex items-center space-x-3">
                         <span className="text-imo-blue">{connectionStage}</span>
                         <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                         <span>{Math.round(connectionProgress)}%</span>
                      </span>
                    ) : `Secure Session: ${formatTime(callTimer)}`}
                  </span>
                </div>
              </div>

              {/* Mic Status Indicator */}
              <AnimatePresence>
                {isMuted && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute top-10 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-3 px-6 py-3 bg-red-500/20 backdrop-blur-xl border border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/20"
                  >
                    <div className="relative">
                      <MicOff size={18} className="text-red-500" />
                      <div className="absolute inset-0 bg-red-500 blur-md opacity-40 animate-pulse"></div>
                    </div>
                    <span className="text-red-500 font-black uppercase tracking-[0.2em] text-[10px]">Microphone Muted</span>
                  </motion.div>
                )}
                {showUnmuteToast && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute top-10 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-3 px-6 py-3 bg-imo-blue/20 backdrop-blur-xl border border-imo-blue/30 rounded-2xl shadow-2xl shadow-imo-blue/20"
                  >
                    <Mic size={18} className="text-imo-blue" />
                    <span className="text-imo-blue font-black uppercase tracking-[0.2em] text-[10px]">Microphone On</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Remote Video Placeholder */}
              {isCalling === 'video' ? (
                <div className="absolute inset-0 w-full h-full bg-[#05060A]">
                  <AnimatePresence mode="wait">
                    {callStatus === 'active' ? (
                      <motion.div 
                        key="active-feed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="relative w-full h-full"
                      >
                        {/* Simulated Remote Feed (using a high-quality sample video) */}
                        <video 
                          className={`w-full h-full object-cover transition-all duration-1000 ${
                            videoQuality === '360p' ? 'blur-[8px] contrast-[1.1] scale-105' : 
                            videoQuality === '720p' ? 'blur-[2px]' : 
                            videoQuality === 'Auto' ? 'blur-[1px]' : ''
                          }`}
                          autoPlay
                          loop
                          muted
                          playsInline
                          src="https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-in-a-cafe-34444-large.mp4"
                        />
                        <div className={`absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 transition-opacity duration-1000 ${!showCallUI ? 'opacity-40' : 'opacity-100'}`}></div>
                        
                        {/* Remote Name Overlay (Floating) */}
                        <AnimatePresence>
                          {showCallUI && (
                            <motion.div 
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              exit={{ x: -20, opacity: 0 }}
                              className="absolute top-32 left-10 flex items-center space-x-4 bg-black/40 backdrop-blur-3xl border border-white/10 px-8 py-4 rounded-[32px] shadow-3xl z-40"
                            >
                               <div className="relative">
                                 <div className="w-3 h-3 bg-accent-green rounded-full shadow-[0_0_15px_rgba(74,222,128,0.8)]"></div>
                                 <div className="absolute inset-0 bg-accent-green blur-md animate-pulse"></div>
                               </div>
                               <div>
                                 <div className="flex items-center space-x-2 mb-1">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none">Live Participant</p>
                                    <span className="bg-imo-blue/20 text-imo-blue text-[8px] font-bold px-2 py-0.5 rounded-full border border-imo-blue/30">HD READY</span>
                                    <div className="flex items-center space-x-1.5 ml-2">
                                       <Mic size={10} className="text-accent-green" />
                                       <div className="flex space-x-0.5">
                                          {[0,1,2].map(i => <div key={i} className="w-0.5 h-2 bg-accent-green/40 rounded-full animate-bounce" style={{ animationDelay: `${i*100}ms` }} />)}
                                       </div>
                                    </div>
                                 </div>
                                 <p className="text-white text-2xl font-black tracking-tight leading-none">{selectedContact?.name}</p>
                               </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="connecting-feed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center p-12"
                      >
                        <div className="absolute inset-0 w-full h-full overflow-hidden">
                           <img 
                            src={selectedContact?.avatar} 
                            className="w-full h-full object-cover opacity-20 blur-[100px] scale-150" 
                            alt="bg"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                          <motion.div
                            animate={{ 
                              scale: [1, 1.05, 1],
                              rotate: [0, 2, -2, 0]
                            }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            className="relative mb-12"
                          >
                            <div className="absolute inset-0 bg-imo-blue rounded-[60px] blur-[80px] opacity-20 animate-pulse"></div>
                            <div className="relative">
                              <img 
                                src={selectedContact?.avatar} 
                                alt="Contact" 
                                className="w-56 h-56 rounded-[64px] border border-white/10 object-cover shadow-[0_50px_100px_rgba(0,170,255,0.2)] relative z-10"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl flex items-center justify-center text-imo-blue shadow-2xl">
                                <Video size={28} />
                              </div>
                            </div>
                          </motion.div>
                          
                          <h2 className="text-white text-5xl font-black mb-4 tracking-tighter text-center">{selectedContact?.name}</h2>
                          
                          <div className="flex flex-col items-center space-y-8">
                            <div className="flex flex-col items-center space-y-3">
                              <div className="w-72 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                                <motion.div 
                                  className="h-full bg-imo-blue shadow-[0_0_15px_rgba(0,132,255,0.5)]" 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${connectionProgress}%` }}
                                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                                />
                              </div>
                              <AnimatePresence mode="wait">
                                <motion.p 
                                  key={connectionStage}
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -5 }}
                                  className="text-imo-blue text-[10px] font-black uppercase tracking-[0.4em]"
                                >
                                  {connectionStage}...
                                </motion.p>
                              </AnimatePresence>
                            </div>

                            <div className="flex items-center space-x-4 bg-white/5 backdrop-blur-xl border border-white/10 px-8 py-3 rounded-2xl">
                              <div className="flex space-x-1.5">
                                {[0, 1, 2].map(i => (
                                  <motion.div 
                                    key={i}
                                    animate={{ 
                                      height: [6, 16, 6],
                                      opacity: [0.3, 1, 0.3]
                                    }}
                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                    className="w-1 bg-imo-blue rounded-full"
                                  />
                                ))}
                              </div>
                              <span className="text-imo-blue font-black tracking-[0.4em] uppercase text-[11px] ml-2">Calling Signal</span>
                            </div>
                            
                            <p className="text-white/30 font-bold tracking-widest uppercase text-[10px]">End-to-end encrypted connection</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="relative"
                  >
                    <div className="absolute inset-0 bg-imo-blue rounded-full blur-2xl opacity-20"></div>
                    <img 
                      src={selectedContact?.avatar} 
                      alt="Contact" 
                      className="w-48 h-48 rounded-full border-4 border-imo-blue/50 relative z-10 shadow-2xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                  <h2 className="text-white text-4xl font-black mt-10 tracking-tight">{selectedContact?.name}</h2>
                  <div className="mt-4 flex flex-col items-center space-y-4">
                    <p className="text-imo-blue font-black uppercase tracking-[0.2em] text-[10px]">{connectionStage}...</p>
                    <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        className="h-full bg-imo-blue shadow-[0_0_10px_rgba(0,132,255,0.4)]" 
                        initial={{ width: 0 }}
                        animate={{ width: `${connectionProgress}%` }}
                        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                      />
                    </div>
                  </div>
                  <div className="mt-12 flex space-x-4">
                     <div className="w-2 h-8 bg-imo-blue/20 rounded-full animate-pulse"></div>
                     <div className="w-2 h-12 bg-imo-blue/40 rounded-full animate-pulse delay-75"></div>
                     <div className="w-2 h-16 bg-imo-blue/60 rounded-full animate-pulse delay-150"></div>
                     <div className="w-2 h-12 bg-imo-blue/40 rounded-full animate-pulse delay-300"></div>
                     <div className="w-2 h-8 bg-imo-blue/20 rounded-full animate-pulse delay-500"></div>
                  </div>
                </div>
              )}

              {/* Local Video Preview (Miniature PiP) */}
              {isCalling === 'video' && (
                <motion.div 
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute bottom-36 right-8 w-44 sm:w-56 h-64 sm:h-80 bg-[#0A0D14] rounded-[32px] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden transition-all group z-40"
                >
                  <div className={`w-full h-full flex items-center justify-center relative ${isVideoOff ? 'bg-gradient-to-tr from-[#05060A] to-[#0F111A]' : 'bg-black'}`}>
                    {!isVideoOff && !mediaError && localStream && (
                      <video 
                        ref={localVideoRef}
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover scale-x-[-1] transition-transform duration-500 group-hover:scale-[1.05]"
                      />
                    )}
                    {(isVideoOff || mediaError || isMockCall || (!localStream && !isVideoOff && !mediaError)) && (
                      <div className="flex flex-col items-center p-6 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                          {isMockCall ? <Users size={32} className="text-imo-blue/40" /> : mediaError ? <Camera size={32} className="text-orange-500/40" /> : <VideoOff size={32} className="text-white/20" />}
                        </div>
                        <span className="text-white/20 text-[10px] uppercase font-black tracking-[0.3em]">
                          {isMockCall ? 'Simulation' : mediaError ? 'No Camera' : 'Me'}
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="text-[9px] font-black text-white/40 uppercase tracking-widest bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">
                         {isMockCall ? 'Virtual Feed' : 'Local Feed'}
                       </span>
                       {isMuted && (
                         <div className="p-2 bg-red-500 rounded-lg text-white shadow-lg animate-pulse">
                            <MicOff size={10} />
                         </div>
                       )}
                    </div>
                    {isSharingScreen && !isVideoOff && (
                      <div className="absolute top-4 left-4 bg-imo-blue text-white px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] z-10 shadow-2xl shadow-imo-blue/20 flex items-center space-x-2">
                        <Monitor size={12} />
                        <span>Display Active</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Controls */}
            <AnimatePresence>
              {showCallUI && (
                <motion.div 
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="bg-black/60 backdrop-blur-3xl p-8 sm:p-12 flex items-center justify-center space-x-6 sm:space-x-12 border-t border-white/5 relative z-30"
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const newMuted = !isMuted;
                      setIsMuted(newMuted);
                      if (!newMuted) {
                        setShowUnmuteToast(true);
                        setTimeout(() => setShowUnmuteToast(false), 2000);
                      }
                    }}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[28px] flex items-center justify-center transition-all relative ${
                      isMuted ? 'bg-red-500 text-white shadow-[0_15px_40px_rgba(239,68,68,0.3)]' : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {!isMuted && (
                      <motion.div 
                        animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-imo-blue/30 rounded-[28px] -z-10"
                      />
                    )}
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>

                  {isCalling === 'video' && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsVideoOff(!isVideoOff); }}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[28px] flex items-center justify-center transition-all ${
                          isVideoOff ? 'bg-red-500 text-white shadow-[0_15px_40px_rgba(239,68,68,0.3)]' : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
                        }`}
                      >
                        {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                      </button>

                      {isCalling === 'video' && (
                        <div className="relative">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setShowQualityMenu(!showQualityMenu); }}
                            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[28px] flex items-center justify-center transition-all ${
                              showQualityMenu ? 'bg-imo-blue text-white shadow-[0_15px_40px_rgba(0,132,255,0.3)]' : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
                            }`}
                          >
                            <Sliders size={24} />
                          </button>
                          <AnimatePresence>
                            {showQualityMenu && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full mb-6 left-1/2 -translate-x-1/2 bg-[#1A1F2E] border border-white/10 rounded-3xl p-3 shadow-2xl z-50 min-w-[200px]"
                              >
                                <div className="space-y-1">
                                  {(['Auto', '360p', '720p', '1080p'] as const).map((q) => (
                                    <button
                                      key={q}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        switchVideoQuality(q);
                                        setShowQualityMenu(false);
                                      }}
                                      className={`w-full flex items-center justify-between px-5 py-3 rounded-2xl transition-all ${
                                        videoQuality === q ? 'bg-imo-blue text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                                      }`}
                                    >
                                      <span className="text-sm font-bold">{q}</span>
                                      {videoQuality === q && <Check size={16} />}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleScreenShare(); }}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[28px] flex items-center justify-center transition-all ${
                          isSharingScreen ? 'bg-imo-blue text-white shadow-[0_15px_40px_rgba(0,170,255,0.3)]' : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
                        }`}
                      >
                        <Monitor size={24} />
                      </button>
                    </>
                  )}

                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowEndCallConfirm(true); }}
                    className="w-20 h-20 sm:w-24 sm:h-24 bg-red-600 hover:bg-red-500 text-white rounded-[32px] sm:rounded-[40px] flex items-center justify-center transition-all shadow-[0_25px_60px_rgba(220,38,38,0.5)] group active:scale-95"
                  >
                    <PhoneOff size={32} className="group-hover:rotate-[135deg] transition-transform duration-500" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* End Call Confirmation Dialog */}
            <AnimatePresence>
              {showEndCallConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="glass-panel p-8 rounded-[40px] border border-white/10 w-full max-w-sm text-center shadow-3xl bg-gray-900/90"
                  >
                    <div className="w-24 h-24 bg-red-600/20 text-red-500 rounded-[32px] flex items-center justify-center mx-auto mb-8 relative">
                      <div className="absolute inset-0 bg-red-600/10 rounded-[32px] animate-ping opacity-20" />
                      <PhoneOff size={40} className="relative z-10" />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-4 tracking-tight">End Session?</h3>
                    <p className="text-white/40 font-bold text-base mb-10 leading-relaxed px-4">
                      Are you sure you want to disconnect? This will end the secure call immediately.
                    </p>
                    <div className="space-y-4">
                      <button
                        onClick={() => {
                          setIsCalling(null);
                          setIsMuted(false);
                          setIsVideoOff(false);
                          setIsSharingScreen(false);
                          setShowEndCallConfirm(false);
                        }}
                        className="w-full py-6 bg-red-600 hover:bg-red-500 text-white rounded-[24px] font-black uppercase tracking-[0.25em] text-[10px] transition-all shadow-[0_20px_50px_rgba(220,38,38,0.3)] active:scale-[0.98]"
                      >
                        End Call
                      </button>
                      <button
                        onClick={() => setShowEndCallConfirm(false)}
                        className="w-full py-6 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-[24px] font-black uppercase tracking-[0.25em] text-[10px] transition-all border border-white/5 active:scale-[0.98]"
                      >
                        Keep Talking
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reaction Menu */}
      <AnimatePresence>
        {reactionMenu && (
          <div 
            className="fixed inset-0 z-[110] cursor-default"
            onClick={() => setReactionMenu(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              className="absolute z-[111] flex items-center space-x-3 bg-[#1A1F2E]/90 backdrop-blur-3xl border border-white/20 rounded-[2rem] px-5 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
              style={{ 
                left: Math.min(window.innerWidth - 320, Math.max(20, reactionMenu.x - 160)), 
                top: Math.max(20, reactionMenu.y - 100) 
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'].map((emoji) => (
                <motion.button
                  whileHover={{ scale: 1.4, y: -5 }}
                  whileTap={{ scale: 0.9 }}
                  key={emoji}
                  onClick={() => handleAddReaction(reactionMenu.messageId, emoji)}
                  className="text-2xl transition-all drop-shadow-lg filter grayscale-[0.2] hover:grayscale-0"
                >
                  {emoji}
                </motion.button>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Media Error Notification Toast */}
      <AnimatePresence>
        {mediaError && !isCalling && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[1000] px-6 py-4 bg-[#1E2433] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center space-x-4 min-w-[320px] ring-1 ring-white/10"
          >
            <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 shadow-lg shadow-orange-500/10">
              {mediaError.toLowerCase().includes('mic') ? <Mic size={22} /> : <Camera size={22} />}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/60 mb-1">Hardware Alert</p>
              <p className="text-white text-sm font-black leading-tight tracking-tight">{mediaError}</p>
            </div>
            <button 
              onClick={() => setMediaError(null)}
              className="p-2 hover:bg-white/5 rounded-2xl transition-all text-white/20 hover:text-white"
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

