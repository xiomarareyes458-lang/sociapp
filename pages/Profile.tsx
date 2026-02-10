
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Settings, Grid, Bookmark, User as UserIcon, Check, Heart, MessageCircle, Camera, ArrowLeft, Calendar, Link as LinkIcon, MapPin, LogOut, Upload, X, Clock, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { NotificationType } from '../types';

const STORY_DURATION = 5000;

const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { users, posts, stories, deleteStory, toggleFollow, notifications, updateUser } = useSocial();
  
  const [activeTab, setActiveTab] = useState('Posts');
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState(currentUser?.bio || '');
  const [editAvatar, setEditAvatar] = useState(currentUser?.avatar || '');
  const [editCoverPhoto, setEditCoverPhoto] = useState(currentUser?.coverPhoto || '');
  
  const [usersModalMode, setUsersModalMode] = useState<'followers' | 'following' | null>(null);
  const [localAvatarBase64, setLocalAvatarBase64] = useState<string | null>(null);
  const [localCoverBase64, setLocalCoverBase64] = useState<string | null>(null);

  // Story Viewing States
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const profileUser = users.find(u => u.username === username) || (currentUser?.username === username ? currentUser : null);
  const userPosts = posts.filter(p => p.username === username);
  const isOwnProfile = currentUser?.username === username;

  // Lógica de historias del perfil actual
  const activeStories = useMemo(() => {
    if (!profileUser) return [];
    return stories.filter(s => s.userId === profileUser.id && (Date.now() - s.createdAt < 24 * 60 * 60 * 1000));
  }, [stories, profileUser]);

  const hasStories = activeStories.length > 0;

  // Lógica de estado de amistad
  const isFriend = currentUser?.following.includes(profileUser?.id || '') || false;
  const hasPendingRequest = notifications.some(n => 
    n.type === NotificationType.FRIEND_REQUEST && 
    n.senderId === currentUser?.id && 
    n.receiverId === profileUser?.id && 
    n.status === 'pending'
  );

  const joinedDateFormatted = useMemo(() => {
    if (!profileUser?.joinedAt) return "Mayo de 2024";
    const date = new Date(profileUser.joinedAt);
    return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
      .format(date)
      .replace(/^\w/, (c) => c.toUpperCase());
  }, [profileUser]);

  const filteredContent = useMemo(() => {
    if (!profileUser) return [];
    switch (activeTab) {
      case 'Me gusta':
        return posts.filter(p => p.likes.includes(profileUser.id));
      case 'Respuestas':
        return posts.filter(p => p.comments.some(c => c.userId === profileUser.id));
      case 'Destacados':
        return userPosts.filter(p => p.likes.length > 2);
      default:
        return userPosts;
    }
  }, [activeTab, posts, userPosts, profileUser]);

  // Timer para las historias
  useEffect(() => {
    let timer: any;
    if (showStoryViewer && activeStories.length > 0) {
      timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            if (currentStoryIndex < activeStories.length - 1) {
              setCurrentStoryIndex(prevIdx => prevIdx + 1);
              return 0;
            } else {
              setShowStoryViewer(false);
              return 0;
            }
          }
          return prev + (100 / (STORY_DURATION / 100));
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [showStoryViewer, currentStoryIndex, activeStories]);

  if (!profileUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white">
        <h2 className="text-2xl font-bold">Usuario no encontrado</h2>
        <Link to="/" className="text-[#2ECC71] mt-2 hover:underline">Volver al inicio</Link>
      </div>
    );
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalAvatarBase64(reader.result as string);
        setEditAvatar(''); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalCoverBase64(reader.result as string);
        setEditCoverPhoto(''); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    if (!currentUser) return;
    
    updateUser(currentUser.id, { 
      bio: editBio, 
      avatar: localAvatarBase64 || editAvatar || profileUser.avatar, 
      coverPhoto: localCoverBase64 || editCoverPhoto || profileUser.coverPhoto 
    });
    
    setIsEditing(false);
    setLocalAvatarBase64(null);
    setLocalCoverBase64(null);
  };

  const handleDeleteStory = (storyId: string) => {
    deleteStory(storyId);
    if (activeStories.length <= 1) {
      setShowStoryViewer(false);
    } else {
      if (currentStoryIndex > 0) {
        setCurrentStoryIndex(prev => prev - 1);
      }
      setProgress(0);
    }
  };

  const openStoryViewer = () => {
    if (!hasStories) return;
    setCurrentStoryIndex(0);
    setProgress(0);
    setShowStoryViewer(true);
  };

  const modalUserList = usersModalMode === 'followers' 
    ? users.filter(u => profileUser.followers.includes(u.id))
    : users.filter(u => profileUser.following.includes(u.id));

  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* Profile Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-[#2F3336] p-2 flex items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">{profileUser.fullName}</h1>
            <div className="text-[13px] text-gray-500">{userPosts.length} posts</div>
          </div>
        </div>
        {isOwnProfile && (
          <button onClick={logout} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors" title="Cerrar sesión">
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Banner / Cover */}
      <div className="w-full h-48 bg-[#121212] overflow-hidden relative border-b border-[#2F3336]">
         {(localCoverBase64 || profileUser.coverPhoto) ? (
           <>
            <img src={localCoverBase64 || profileUser.coverPhoto || ''} className="w-full h-full object-cover opacity-60" alt="cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
           </>
         ) : (
           <div className="w-full h-full bg-[#121212]"></div>
         )}
      </div>

      {/* Profile Info */}
      <div className="px-4 relative mb-6">
        <div className="flex justify-between items-end -mt-16 mb-4">
          <div 
            onClick={!isEditing ? openStoryViewer : undefined}
            className={`w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-black overflow-hidden bg-black ring-2 transition-all relative group cursor-pointer ${hasStories ? 'ring-[#2ECC71]' : 'ring-transparent hover:ring-[#2ECC71]/40'}`}
          >
            <img src={localAvatarBase64 || profileUser.avatar} className="w-full h-full object-cover" />
            {isEditing && (
              <div 
                onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); }}
                className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-8 h-8 text-white" />
              </div>
            )}
            {hasStories && !isEditing && (
              <div className="absolute inset-0 border-2 border-black rounded-full pointer-events-none"></div>
            )}
          </div>
          <div className="pb-2 flex gap-2">
            {isOwnProfile ? (
               <button 
                 onClick={() => setIsEditing(!isEditing)} 
                 className="px-4 py-2 border border-[#2F3336] hover:bg-[#2ECC71]/10 hover:text-[#2ECC71] hover:border-[#2ECC71] rounded-full text-sm font-bold transition-all active:scale-95"
               >
                 {isEditing ? 'Cancelar' : 'Editar perfil'}
               </button>
            ) : (
               <button 
                 onClick={() => toggleFollow(profileUser.id)}
                 className={`px-5 py-2 rounded-full text-sm font-bold transition-all active:scale-95 flex items-center gap-2 ${
                   isFriend ? 'border border-[#2F3336] hover:text-red-500' : 
                   hasPendingRequest ? 'bg-[#1A1A1A] text-gray-400 border border-[#2F3336] cursor-default' :
                   'bg-white text-black hover:bg-gray-200'
                 }`}
                 disabled={hasPendingRequest && !isFriend}
               >
                 {isFriend ? 'Amigos' : hasPendingRequest ? <><Clock className="w-4 h-4" /> Solicitado</> : 'Seguir'}
               </button>
            )}
          </div>
        </div>

        {/* Edit Form */}
        {isEditing ? (
           <div className="space-y-6 py-4 bg-[#16181C] p-6 rounded-2xl border border-[#2ECC71]/30 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#2ECC71] uppercase tracking-widest">Foto de Perfil</label>
                  <div className="flex flex-col gap-2">
                    <input type="file" accept="image/*,image/webp,image/avif,image/png,image/jpeg,image/gif" hidden ref={avatarInputRef} onChange={handleAvatarChange} />
                    <button 
                      onClick={() => avatarInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#2F3336] p-3 rounded-xl hover:border-[#2ECC71]/50 transition-colors"
                    >
                      <Upload className="w-4 h-4" /> 
                      <span className="text-xs font-bold">{localAvatarBase64 ? 'Imagen lista' : 'Subir desde dispositivo'}</span>
                    </button>
                    <input 
                      type="text" 
                      placeholder="O pega URL de imagen..."
                      className="w-full bg-black/50 p-2.5 rounded-xl text-xs border border-[#2F3336] outline-none focus:border-[#2ECC71]"
                      value={editAvatar}
                      onChange={(e) => {setEditAvatar(e.target.value); setLocalAvatarBase64(null);}}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#2ECC71] uppercase tracking-widest">Foto de Portada</label>
                  <div className="flex flex-col gap-2">
                    <input type="file" accept="image/*,image/webp,image/avif,image/png,image/jpeg,image/gif" hidden ref={coverInputRef} onChange={handleCoverChange} />
                    <button 
                      onClick={() => coverInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#2F3336] p-3 rounded-xl hover:border-[#2ECC71]/50 transition-colors"
                    >
                      <Upload className="w-4 h-4" /> 
                      <span className="text-xs font-bold">{localCoverBase64 ? 'Imagen lista' : 'Subir desde dispositivo'}</span>
                    </button>
                    <input 
                      type="text" 
                      placeholder="O pega URL de imagen..."
                      className="w-full bg-black/50 p-2.5 rounded-xl text-xs border border-[#2F3336] outline-none focus:border-[#2ECC71]"
                      value={editCoverPhoto}
                      onChange={(e) => {setEditCoverPhoto(e.target.value); setLocalCoverBase64(null);}}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-[#2ECC71] uppercase tracking-widest">Biografía</label>
                <textarea 
                  className="w-full bg-black/50 p-3 rounded-xl text-sm border border-[#2F3336] outline-none focus:border-[#2ECC71] h-24 resize-none"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Cuéntanos sobre ti..."
                />
              </div>

              <button onClick={handleSaveProfile} className="w-full bg-[#2ECC71] text-black py-3 rounded-xl font-bold hover:bg-[#27AE60] transition-all shadow-lg active:scale-[0.98]">
                Guardar Cambios
              </button>
           </div>
        ) : (
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-extrabold">{profileUser.fullName}</h2>
              <div className="text-gray-500 text-[15px]">@{profileUser.username}</div>
            </div>
            <div className="text-[15px] leading-relaxed text-gray-200">
              {profileUser.bio || "No hay biografía disponible."}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500 text-[15px]">
              <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Internet</div>
              <div className="flex items-center gap-1 text-[#2ECC71] hover:underline cursor-pointer"><LinkIcon className="w-4 h-4" /> socialapp.com</div>
              <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Se unió en {joinedDateFormatted}</div>
            </div>
            <div className="flex gap-5 text-[14px]">
              <button 
                onClick={() => setUsersModalMode('following')}
                className="hover:underline cursor-pointer group"
              >
                <span className="font-bold text-white group-hover:text-[#2ECC71]">{profileUser.following.length}</span> <span className="text-gray-500">Siguiendo</span>
              </button>
              <button 
                onClick={() => setUsersModalMode('followers')}
                className="hover:underline cursor-pointer group"
              >
                <span className="font-bold text-white group-hover:text-[#2ECC71]">{profileUser.followers.length}</span> <span className="text-gray-500">Seguidores</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2F3336]">
         {['Posts', 'Respuestas', 'Destacados', 'Me gusta'].map((tab) => (
           <button 
             key={tab} 
             onClick={() => setActiveTab(tab)}
             className="flex-1 text-center p-4 hover:bg-white/5 transition-colors cursor-pointer relative group"
           >
              <span className={`text-[15px] transition-colors ${activeTab === tab ? 'font-bold text-[#2ECC71]' : 'font-medium text-gray-500 group-hover:text-white'}`}>{tab}</span>
              {activeTab === tab && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#2ECC71] rounded-full" />}
           </button>
         ))}
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-3 gap-0.5 p-0.5 min-h-[400px]">
        {filteredContent.length > 0 ? (
          filteredContent.map(post => (
            <div key={post.id} className="relative aspect-square group cursor-pointer overflow-hidden bg-[#16181C]">
              {post.imageUrl ? (
                 post.type === 'video' ? (
                    <video src={post.imageUrl} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all" />
                 ) : (
                    <img src={post.imageUrl} alt="post" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                 )
              ) : (
                <div className="w-full h-full flex items-center justify-center p-4 text-center">
                  <p className="text-[10px] text-gray-500 italic line-clamp-3">{post.caption}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 text-white transition-opacity backdrop-blur-[2px]">
                <div className="flex items-center gap-1 font-bold"><Heart className="w-5 h-5 fill-[#2ECC71] text-[#2ECC71]" /> {post.likes.length}</div>
                <div className="flex items-center gap-1 font-bold"><MessageCircle className="w-5 h-5 fill-white" /> {post.comments.length}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 py-20 text-center text-gray-500">
             <p className="text-sm">No hay contenido en esta sección.</p>
          </div>
        )}
      </div>

      {/* Story Viewer Modal */}
      {showStoryViewer && activeStories.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-in fade-in duration-300">
          <div className="relative w-full h-full max-w-lg md:h-[90vh] md:rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-[#111]">
            <div className="absolute top-0 left-0 right-0 p-4 z-20 space-y-4">
              <div className="flex gap-1.5 px-1">
                {activeStories.map((_, idx) => (
                  <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-100 ease-linear"
                      style={{ 
                        width: idx < currentStoryIndex ? '100%' : idx === currentStoryIndex ? `${progress}%` : '0%' 
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={profileUser.avatar} className="w-10 h-10 rounded-full border border-white/20 shadow-md" />
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-white drop-shadow-md">{profileUser.fullName}</span>
                    <span className="text-xs text-white/70 drop-shadow-md">@{profileUser.username}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOwnProfile && (
                    <button 
                      onClick={() => handleDeleteStory(activeStories[currentStoryIndex].id)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full backdrop-blur-md transition-colors text-red-500"
                      title="Eliminar historia"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => setShowStoryViewer(false)} 
                    className="p-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center relative group">
              {activeStories[currentStoryIndex].type === 'video' ? (
                <video 
                  src={activeStories[currentStoryIndex].imageUrl} 
                  className="w-full h-full object-cover" 
                  autoPlay 
                  muted 
                  loop 
                />
              ) : (
                <img 
                  src={activeStories[currentStoryIndex].imageUrl} 
                  className="w-full h-full object-cover" 
                  alt="Story content" 
                />
              )}
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentStoryIndex > 0) {
                    setCurrentStoryIndex(prev => prev - 1);
                    setProgress(0);
                  }
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentStoryIndex < activeStories.length - 1) {
                    setCurrentStoryIndex(prev => prev + 1);
                    setProgress(0);
                  } else {
                    setShowStoryViewer(false);
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {usersModalMode && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-black border border-[#2F3336] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-[#2F3336] flex items-center justify-between">
              <h2 className="font-bold text-lg capitalize">{usersModalMode === 'followers' ? 'Seguidores' : 'Siguiendo'}</h2>
              <button onClick={() => setUsersModalMode(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-2 no-scrollbar">
              {modalUserList.length > 0 ? (
                modalUserList.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-colors group">
                    <div 
                      onClick={() => {
                        setUsersModalMode(null);
                        navigate(`/profile/${user.username}`);
                      }}
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-[#2F3336] group-hover:border-[#2ECC71]" />
                      <div>
                        <div className="font-bold text-sm text-white">{user.fullName}</div>
                        <div className="text-xs text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                    {currentUser?.id !== user.id && (
                      <button 
                        onClick={() => toggleFollow(user.id)}
                        className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all active:scale-95 ${currentUser?.following.includes(user.id) ? 'border border-[#2F3336] text-white' : 'bg-[#2ECC71] text-black'}`}
                      >
                        {currentUser?.following.includes(user.id) ? 'Amigos' : 'Seguir'}
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-gray-500">
                  <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-10" />
                  <p className="text-sm">No hay usuarios para mostrar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
