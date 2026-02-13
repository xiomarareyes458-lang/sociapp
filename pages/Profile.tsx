
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User as UserIcon, Camera, ArrowLeft, Calendar, Link as LinkIcon, MapPin, LogOut, Upload, X, Clock, ChevronLeft, ChevronRight, Trash2, Heart, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { NotificationType } from '../types';
import { compressImage } from '../lib/utils';

const STORY_DURATION = 5000;

const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { users, posts, stories, deleteStory, toggleFollow, notifications, updateUser } = useSocial();
  
  const [activeTab, setActiveTab] = useState('Posts');
  const [isEditing, setIsEditing] = useState(false);
  
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editCoverPhoto, setEditCoverPhoto] = useState('');
  const [localAvatarBase64, setLocalAvatarBase64] = useState<string | null>(null);
  const [localCoverBase64, setLocalCoverBase64] = useState<string | null>(null);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const profileUser = users.find(u => u.username === username) || (currentUser?.username === username ? currentUser : null);
  const userPosts = posts.filter(p => p.username === username);
  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    if (isEditing && currentUser) {
      setEditBio(currentUser.bio || '');
      setEditAvatar(currentUser.avatar || '');
      setEditCoverPhoto(currentUser.coverPhoto || '');
    }
  }, [isEditing, currentUser]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 400); // Perfil más pequeño
        setLocalAvatarBase64(compressed);
        setEditAvatar(''); 
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 1200); // Portada más grande
        setLocalCoverBase64(compressed);
        setEditCoverPhoto(''); 
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    const finalAvatar = localAvatarBase64 || (editAvatar.trim() !== '' ? editAvatar : currentUser.avatar);
    const finalCover = localCoverBase64 || (editCoverPhoto.trim() !== '' ? editCoverPhoto : currentUser.coverPhoto);

    await updateUser(currentUser.id, { 
      bio: editBio, 
      avatar: finalAvatar, 
      coverPhoto: finalCover
    });
    
    setIsEditing(false);
    setLocalAvatarBase64(null);
    setLocalCoverBase64(null);
  };

  if (!profileUser) return <div className="text-center py-20">Usuario no encontrado</div>;

  return (
    <div className="w-full min-h-screen bg-black text-white">
      <input type="file" accept="image/*" hidden ref={avatarInputRef} onChange={handleAvatarChange} />
      <input type="file" accept="image/*" hidden ref={coverInputRef} onChange={handleCoverChange} />

      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-[#2F3336] p-2 flex items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-bold">{profileUser.fullName}</h1>
            <div className="text-[13px] text-gray-500">{userPosts.length} posts</div>
          </div>
        </div>
        {isOwnProfile && <button onClick={logout} className="p-2 text-red-500"><LogOut className="w-5 h-5" /></button>}
      </div>

      <div 
        className={`w-full h-48 bg-[#121212] overflow-hidden relative border-b border-[#2F3336] ${isEditing ? 'cursor-pointer' : ''}`}
        onClick={isEditing ? () => coverInputRef.current?.click() : undefined}
      >
        <img src={localCoverBase64 || profileUser.coverPhoto || ''} className="w-full h-full object-cover opacity-60" />
        {isEditing && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Camera className="w-8 h-8" /></div>}
      </div>

      <div className="px-4 relative mb-6">
        <div className="flex justify-between items-end -mt-16 mb-4">
          <div 
            onClick={isEditing ? () => avatarInputRef.current?.click() : undefined}
            className="w-32 h-32 rounded-full border-4 border-black overflow-hidden bg-black ring-2 ring-transparent relative cursor-pointer"
          >
            <img src={localAvatarBase64 || profileUser.avatar} className="w-full h-full object-cover" />
            {isEditing && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Camera className="w-8 h-8" /></div>}
          </div>
          <button 
            type="button"
            onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)} 
            className="px-4 py-2 border rounded-full text-sm font-bold border-[#2ECC71] text-[#2ECC71] hover:bg-[#2ECC71]/10"
          >
            {isEditing ? 'Guardar' : 'Editar perfil'}
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-4 bg-[#1a1f2e] p-6 rounded-2xl border-2 border-[#2ECC71]">
            <textarea 
              className="w-full bg-[#0f1419] p-4 rounded-xl text-white border-2 border-[#2F3336] focus:border-[#2ECC71] outline-none"
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Bio..."
            />
            <button type="button" onClick={() => setIsEditing(false)} className="text-gray-500 text-sm">Cancelar</button>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold">{profileUser.fullName}</h2>
            <div className="text-gray-500">@{profileUser.username}</div>
            <p className="text-gray-200">{profileUser.bio}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
