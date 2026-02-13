
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Camera, 
  Heart, 
  Image as ImageIcon, 
  LayoutGrid,
  AlertCircle,
  XCircle,
  X,
  User as UserIcon,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import PostCard from '../components/PostCard';
import { compressImage } from '../lib/utils';
import { uploadProfileImage, uploadCoverImage } from '../lib/supabase';
import { NotificationType, User } from '../types';

const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { users, posts, updateUser, isLoading, toggleFollow, notifications } = useSocial();
  
  const [activeTab, setActiveTab] = useState<'Posts' | 'Media' | 'Likes'>('Posts');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editBio, setEditBio] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = useMemo(() => {
    if (!currentUser || !username) return false;
    return currentUser.username?.toLowerCase() === username.toLowerCase();
  }, [currentUser, username]);

  const profileUser = useMemo(() => {
    if (isOwnProfile && currentUser) return currentUser;
    return (Array.isArray(users) ? users : []).find(u => u.username?.toLowerCase() === username?.toLowerCase()) || null;
  }, [users, username, currentUser, isOwnProfile]);

  const userPosts = useMemo(() => {
    if (!profileUser) return [];
    return (Array.isArray(posts) ? posts : []).filter(p => p.userId === profileUser.id || p.username === profileUser.username);
  }, [posts, profileUser]);

  const mediaPosts = useMemo(() => userPosts.filter(p => p.imageUrl && p.imageUrl.trim() !== ""), [userPosts]);
  const likedPosts = useMemo(() => {
    if (!profileUser) return [];
    return (Array.isArray(posts) ? posts : []).filter(p => Array.isArray(p.likes) && p.likes.includes(profileUser.id));
  }, [posts, profileUser]);

  const followersList = useMemo(() => {
    if (!profileUser) return [];
    return users.filter(u => profileUser.followers.includes(u.id));
  }, [users, profileUser]);

  const followingList = useMemo(() => {
    if (!profileUser) return [];
    return users.filter(u => profileUser.following.includes(u.id));
  }, [users, profileUser]);

  const isFollowing = currentUser?.following.includes(profileUser?.id || '');
  const followsMe = currentUser?.followers.includes(profileUser?.id || '');
  const isMutualFriend = isFollowing && followsMe;

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const hasPendingRequest = useMemo(() => {
    if (!currentUser || !profileUser || isOwnProfile) return false;
    return notifications.some(n => 
      n.senderId === currentUser.id && 
      n.receiverId === profileUser.id && 
      n.type === NotificationType.FRIEND_REQUEST && 
      n.status === 'pending'
    );
  }, [notifications, currentUser, profileUser, isOwnProfile]);

  useEffect(() => {
    if (isEditing && currentUser) {
      setEditFullName(currentUser.fullName || '');
      setEditUsername(currentUser.username || '');
      setEditAvatar(currentUser.avatar || '');
      setEditBio(currentUser.bio || '');
      setErrorMsg(null);
    }
  }, [isEditing, currentUser]);

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    const newUsername = editUsername.trim().toLowerCase();
    if (!newUsername) return setErrorMsg('El nombre de usuario es obligatorio.');

    setIsSaving(true);
    setErrorMsg(null);

    try {
      await updateUser(currentUser.id, { 
        fullName: editFullName.trim(),
        username: newUsername,
        bio: editBio.trim()
      });
      setIsEditing(false);
      if (newUsername !== username?.toLowerCase()) navigate(`/profile/${newUsername}`, { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar los cambios del perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    try {
      setIsSaving(true);
      const reader = new FileReader();
      const compressedBase64 = await new Promise<string>((resolve) => {
        reader.onload = async (event) => {
          const res = await compressImage(event.target?.result as string, 400, 0.8);
          resolve(res);
        };
        reader.readAsDataURL(file);
      });
      const response = await fetch(compressedBase64);
      const blob = await response.blob();
      const url = await uploadProfileImage(blob, currentUser.id);
      await updateUser(currentUser.id, { avatar: url });
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar avatar.");
    } finally {
      setIsSaving(false);
    }
  };

  const onCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    try {
      setIsSaving(true);
      const reader = new FileReader();
      const compressedBase64 = await new Promise<string>((resolve) => {
        reader.onload = async (event) => {
          const res = await compressImage(event.target?.result as string, 1200, 0.8);
          resolve(res);
        };
        reader.readAsDataURL(file);
      });
      const response = await fetch(compressedBase64);
      const blob = await response.blob();
      const url = await uploadCoverImage(blob, currentUser.id);
      await updateUser(currentUser.id, { coverPhoto: url });
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar portada.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !profileUser) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="w-10 h-10 border-2 border-[#2ECC71] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
        <h2 className="text-xl font-bold">Perfil no encontrado</h2>
        <button onClick={() => navigate('/')} className="text-[#2ECC71] mt-4 font-bold">Ir al inicio</button>
      </div>
    );
  }

  const UserListModal = ({ title, isOpen, onClose, usersList }: { title: string, isOpen: boolean, onClose: () => void, usersList: User[] }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-black border border-[#2F3336] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
          <div className="p-4 border-b border-[#2F3336] flex items-center justify-between">
            <h2 className="font-bold text-lg">{title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="overflow-y-auto p-2 no-scrollbar">
            {usersList.length > 0 ? (
              usersList.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-colors group">
                  <div onClick={() => { onClose(); navigate(`/profile/${user.username}`); }} className="flex items-center gap-3 cursor-pointer flex-1">
                    <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-[#2F3336] group-hover:border-[#2ECC71]" alt="User" />
                    <div>
                      <div className="font-bold text-sm text-white">{user.fullName}</div>
                      <div className="text-xs text-gray-500">@{user.username}</div>
                    </div>
                  </div>
                  {currentUser && user.id !== currentUser.id && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFollow(user.id); }}
                      className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${currentUser.following.includes(user.id) ? 'border border-[#2F3336] text-white' : 'bg-white text-black'}`}
                    >
                      {currentUser.following.includes(user.id) ? 'Siguiendo' : 'Seguir'}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="py-20 text-center text-gray-500">
                <p className="text-sm">No hay nadie aquí todavía.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-black text-white pb-20">
      {errorMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-bold">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-[#2F3336] p-2 flex items-center gap-6 px-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-lg font-bold truncate">{profileUser?.fullName || 'Usuaria'}</h1>
          <div className="text-[12px] text-gray-500">{userPosts.length} posts</div>
        </div>
      </div>

      <div 
        className={`w-full h-40 bg-[#121212] relative overflow-hidden ${isOwnProfile && isEditing ? 'cursor-pointer group' : ''}`}
        onClick={() => isOwnProfile && isEditing && !isSaving && coverInputRef.current?.click()}
      >
        <img src={profileUser?.coverPhoto || ''} className={`w-full h-full object-cover transition-opacity duration-500 ${profileUser?.coverPhoto ? 'opacity-60' : 'opacity-0'}`} />
        {!profileUser?.coverPhoto && <div className="absolute inset-0 bg-[#202327]" />}
        {isOwnProfile && isEditing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
            {isSaving ? <div className="w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full animate-spin"></div> : <Camera className="w-8 h-8 text-white opacity-80" />}
          </div>
        )}
        <input type="file" hidden ref={coverInputRef} accept="image/*" onChange={onCoverChange} />
      </div>

      <div className="px-4 relative mb-4">
        <div className="flex justify-between items-end -mt-14 mb-4">
          <div className="w-28 h-28 rounded-full border-4 border-black overflow-hidden bg-black ring-1 ring-[#2F3336] relative">
            <img src={profileUser?.avatar} className="w-full h-full object-cover" />
            {isOwnProfile && isEditing && (
              <div onClick={(e) => { e.stopPropagation(); if (!isSaving) avatarInputRef.current?.click(); }} className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer hover:bg-black/50 transition-colors">
                {isSaving ? <div className="w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full animate-spin"></div> : <Camera className="w-6 h-6 text-white" />}
                <input type="file" hidden ref={avatarInputRef} accept="image/*" onChange={onAvatarChange} />
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            {!isOwnProfile ? (
              <div className="flex flex-col items-end gap-2">
                <button 
                  onClick={() => toggleFollow(profileUser!.id)}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
                    isMutualFriend
                    ? 'bg-[#2ECC71]/10 text-[#2ECC71] border border-[#2ECC71]/30 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30'
                    : isFollowing 
                      ? 'border border-[#2F3336] text-white hover:bg-red-500/10 hover:text-red-500' 
                      : hasPendingRequest 
                        ? 'bg-gray-800 text-gray-400 border border-gray-700 cursor-default'
                        : 'bg-white text-black hover:bg-[#2ECC71]'
                  }`}
                  disabled={hasPendingRequest}
                >
                  {isMutualFriend ? <><Users className="w-4 h-4" /> Amigos</> : isFollowing ? 'Siguiendo' : hasPendingRequest ? 'Pendiente' : 'Seguir'}
                </button>
                {followsMe && !isFollowing && (
                  <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Te sigue</span>
                )}
              </div>
            ) : (
              <button onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)} disabled={isSaving} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${isEditing ? 'bg-[#2ECC71] text-black hover:bg-[#27AE60]' : 'border border-[#2F3336] hover:bg-white/10'}`}>
                {isEditing ? (isSaving ? 'Guardando...' : 'Guardar') : 'Editar perfil'}
              </button>
            )}
          </div>
        </div>

        {isEditing && isOwnProfile ? (
          <div className="space-y-4 bg-[#121212] p-4 rounded-2xl border border-[#2F3336] animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <label className="text-xs text-gray-500 mb-1 block px-1">Nombre completo</label>
              <input className="w-full bg-black border border-[#2F3336] p-2 rounded-xl text-sm outline-none focus:border-[#2ECC71]" value={editFullName} onChange={e => setEditFullName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block px-1">Nombre de usuario</label>
              <input className="w-full bg-black border border-[#2F3336] p-2 rounded-xl text-sm outline-none focus:border-[#2ECC71]" value={editUsername} onChange={e => setEditUsername(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block px-1">Biografía</label>
              <textarea className="w-full bg-black border border-[#2F3336] p-2 rounded-xl text-sm h-20 outline-none focus:border-[#2ECC71] resize-none" value={editBio} onChange={e => setEditBio(e.target.value)} />
            </div>
            <button onClick={() => { setIsEditing(false); setErrorMsg(null); }} className="text-xs text-gray-500 hover:text-white transition-colors">Cancelar</button>
          </div>
        ) : (
          <div className="mt-2">
            <h2 className="text-xl font-extrabold">{profileUser?.fullName || 'Usuaria'}</h2>
            <div className="text-gray-500">@{profileUser?.username}</div>
            <p className="mt-3 text-sm text-gray-200 leading-relaxed">{profileUser?.bio}</p>
            <div className="flex items-center gap-1 text-gray-500 text-sm mt-3">
              <Calendar className="w-4 h-4" />
              <span>Se unió en {profileUser?.joinedAt ? new Date(profileUser.joinedAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : '2024'}</span>
            </div>
            <div className="flex gap-6 mt-4">
              <button onClick={() => setShowFollowingModal(true)} className="text-sm group flex items-center gap-1">
                <span className="font-bold text-white group-hover:underline">{profileUser?.following?.length || 0}</span> 
                <span className="text-gray-500">Siguiendo</span>
              </button>
              <button onClick={() => setShowFollowersModal(true)} className="text-sm group flex items-center gap-1">
                <span className="font-bold text-white group-hover:underline">{profileUser?.followers?.length || 0}</span> 
                <span className="text-gray-500">Seguidores</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex border-b border-[#2F3336] mt-4">
        {(['Posts', 'Media', 'Likes'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === tab ? 'border-[#2ECC71] text-white' : 'border-transparent text-gray-500'}`}>
            {tab === 'Posts' ? 'Publicaciones' : tab === 'Media' ? 'Fotos' : 'Likes'}
          </button>
        ))}
      </div>

      <div className="flex flex-col">
        {activeTab === 'Posts' && userPosts.map(post => <PostCard key={post.id} post={post} />)}
        {activeTab === 'Media' && (
          <div className="grid grid-cols-3 gap-0.5">
            {mediaPosts.map(post => <img key={post.id} src={post.imageUrl} onClick={() => navigate(`/post/${post.id}`)} className="aspect-square object-cover cursor-pointer hover:brightness-75 transition-all" />)}
          </div>
        )}
        {activeTab === 'Likes' && likedPosts.map(post => <PostCard key={post.id} post={post} />)}
        {userPosts.length === 0 && activeTab === 'Posts' && <div className="py-20 text-center text-gray-500">Aún no hay publicaciones.</div>}
      </div>

      <UserListModal title="Seguidores" isOpen={showFollowersModal} onClose={() => setShowFollowersModal(false)} usersList={followersList} />
      <UserListModal title="Siguiendo" isOpen={showFollowingModal} onClose={() => setShowFollowingModal(false)} usersList={followingList} />
    </div>
  );
};

export default Profile;
