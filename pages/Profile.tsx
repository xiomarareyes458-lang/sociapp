import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  LogOut, 
  Camera, 
  Grid, 
  Heart, 
  Image as ImageIcon, 
  MoreHorizontal,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import PostCard from '../components/PostCard';
import { compressImage } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'https://esm.sh/date-fns/locale/es';

const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { users, posts, updateUser } = useSocial();
  
  const [activeTab, setActiveTab] = useState<'Posts' | 'Media' | 'Likes'>('Posts');
  const [isEditing, setIsEditing] = useState(false);
  
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editCoverPhoto, setEditCoverPhoto] = useState('');
  const [localAvatarBase64, setLocalAvatarBase64] = useState<string | null>(null);
  const [localCoverBase64, setLocalCoverBase64] = useState<string | null>(null);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const profileUser = users.find(u => u.username === username);
  const isOwnProfile = currentUser?.username === username;
  
  // Filtrar posts del usuario
  const userPosts = posts.filter(p => p.username === username);
  const mediaPosts = userPosts.filter(p => p.imageUrl && p.imageUrl.trim() !== "");
  const likedPosts = posts.filter(p => p.likes.includes(profileUser?.id || ''));

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
        const compressed = await compressImage(reader.result as string, 400);
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
        const compressed = await compressImage(reader.result as string, 1200);
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

  if (!profileUser) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <div className="w-16 h-16 bg-[#16181C] rounded-full flex items-center justify-center mb-4">
        <ArrowLeft className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-white">Este usuario no existe</h2>
      <button onClick={() => navigate('/')} className="text-[#2ECC71] mt-2 font-bold">Volver al inicio</button>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-black text-white pb-20">
      <input type="file" accept="image/*" hidden ref={avatarInputRef} onChange={handleAvatarChange} />
      <input type="file" accept="image/*" hidden ref={coverInputRef} onChange={handleCoverChange} />

      {/* Header Pegajoso */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-[#2F3336] p-2 flex items-center gap-6 px-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate">{profileUser.fullName}</h1>
          <div className="text-[12px] text-gray-500">{userPosts.length} publicaciones</div>
        </div>
      </div>

      {/* Portada */}
      <div 
        className={`w-full h-40 md:h-48 bg-[#121212] overflow-hidden relative ${isEditing ? 'cursor-pointer group' : ''}`}
        onClick={isEditing ? () => coverInputRef.current?.click() : undefined}
      >
        <img 
          src={localCoverBase64 || profileUser.coverPhoto || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop'} 
          className="w-full h-full object-cover opacity-80" 
        />
        {isEditing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors">
            <div className="bg-black/60 p-3 rounded-full backdrop-blur-sm">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Perfil Info */}
      <div className="px-4 relative mb-4">
        <div className="flex justify-between items-end -mt-14 mb-4">
          <div 
            onClick={isEditing ? () => avatarInputRef.current?.click() : undefined}
            className={`w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-black overflow-hidden bg-black ring-1 ring-[#2F3336] relative ${isEditing ? 'cursor-pointer group' : ''}`}
          >
            <img src={localAvatarBase64 || profileUser.avatar} className="w-full h-full object-cover" />
            {isEditing && (
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 flex items-center justify-center transition-colors">
                <Camera className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
          
          <div className="flex gap-2 mb-2">
            {isOwnProfile ? (
              <button 
                onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)} 
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${isEditing ? 'bg-[#2ECC71] text-black hover:bg-[#27AE60]' : 'border border-[#2F3336] hover:bg-white/10'}`}
              >
                {isEditing ? 'Guardar Cambios' : 'Editar perfil'}
              </button>
            ) : (
              <button className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors">
                Seguir
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 space-y-1">
          <h2 className="text-xl font-extrabold leading-tight">{profileUser.fullName}</h2>
          <div className="text-gray-500 text-[15px]">@{profileUser.username}</div>
        </div>

        {isEditing ? (
          <div className="mt-4 animate-in fade-in duration-300">
            <textarea 
              className="w-full bg-black border border-[#2ECC71] p-3 rounded-xl text-white text-sm outline-none min-h-[100px] focus:ring-1 focus:ring-[#2ECC71]"
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Escribe algo sobre ti..."
            />
            <div className="flex justify-end mt-2">
              <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500 hover:underline">Cancelar</button>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[15px] text-gray-200 leading-relaxed whitespace-pre-wrap">
            {profileUser.bio || 'Sin biografía.'}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-gray-500 text-[14px]">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>Se unió en mayo de 2024</span>
          </div>
        </div>

        <div className="flex items-center gap-5 mt-4 text-[14px]">
          <div className="hover:underline cursor-pointer group">
            <span className="font-bold text-white">{profileUser.following.length}</span> <span className="text-gray-500">Siguiendo</span>
          </div>
          <div className="hover:underline cursor-pointer">
            <span className="font-bold text-white">{profileUser.followers.length}</span> <span className="text-gray-500">Seguidores</span>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="flex border-b border-[#2F3336] mt-4">
        {(['Posts', 'Media', 'Likes'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-4 text-sm font-bold relative hover:bg-white/5 transition-colors group"
          >
            <span className={activeTab === tab ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}>
              {tab === 'Posts' ? 'Publicaciones' : tab === 'Media' ? 'Fotos/Videos' : 'Me gusta'}
            </span>
            {activeTab === tab && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-[#2ECC71] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Contenido de las Pestañas */}
      <div className="flex flex-col">
        {activeTab === 'Posts' && (
          userPosts.length > 0 ? (
            userPosts.map(post => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="py-20 text-center px-8">
              <div className="w-16 h-16 bg-[#16181C] rounded-full flex items-center justify-center mx-auto mb-4">
                <LayoutGrid className="w-8 h-8 text-gray-700" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Aún no hay publicaciones</h3>
              <p className="text-gray-500 text-sm max-w-[280px] mx-auto">
                Cuando @{profileUser.username} publique contenido, aparecerá aquí.
              </p>
            </div>
          )
        )}

        {activeTab === 'Media' && (
          mediaPosts.length > 0 ? (
            <div className="grid grid-cols-3 gap-[2px]">
              {mediaPosts.map(post => (
                <div 
                  key={post.id} 
                  onClick={() => navigate(`/post/${post.id}`)}
                  className="aspect-square relative group cursor-pointer overflow-hidden bg-[#111]"
                >
                  <img src={post.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center px-8">
              <div className="w-16 h-16 bg-[#16181C] rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-8 h-8 text-gray-700" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No hay archivos multimedia</h3>
              <p className="text-gray-500 text-sm max-w-[280px] mx-auto">
                Las fotos y videos que publique aparecerán aquí.
              </p>
            </div>
          )
        )}

        {activeTab === 'Likes' && (
          likedPosts.length > 0 ? (
            likedPosts.map(post => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="py-20 text-center px-8">
              <div className="w-16 h-16 bg-[#16181C] rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-gray-700" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Sin likes todavía</h3>
              <p className="text-gray-500 text-sm max-w-[280px] mx-auto">
                Las publicaciones que le gusten a @{profileUser.username} se mostrarán en esta sección.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Profile;