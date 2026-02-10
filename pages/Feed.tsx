
import React, { useState, useRef, useEffect } from 'react';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { Smartphone, Image as ImageIcon, Smile, MapPin, Calendar, Plus, X, Upload, CheckCircle2, ChevronLeft, ChevronRight, Video, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STORY_DURATION = 5000;

const Feed: React.FC = () => {
  const { posts, users, stories, addPost, addStory, deleteStory } = useSocial();
  const { currentUser } = useAuth();
  
  // Composer States
  const [composerText, setComposerText] = useState('');
  const [composerImage, setComposerImage] = useState('');
  const [composerLocalBase64, setComposerLocalBase64] = useState<string | null>(null);
  const [composerMediaType, setComposerMediaType] = useState<'image' | 'video'>('image');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLocationActive, setIsLocationActive] = useState(false);
  const [locationText, setLocationText] = useState('');
  const composerFileInputRef = useRef<HTMLInputElement>(null);

  // Story Creation States
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyImageUrl, setStoryImageUrl] = useState('');
  const [localStoryBase64, setLocalStoryBase64] = useState<string | null>(null);
  const [storyMediaType, setStoryMediaType] = useState<'image' | 'video'>('image');
  const storyFileInputRef = useRef<HTMLInputElement>(null);

  // Story Viewing States
  const [selectedStoryUserId, setSelectedStoryUserId] = useState<string | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const activeStories = stories.filter(s => Date.now() - s.createdAt < 24 * 60 * 60 * 1000);
  const usersWithStories = Array.from(new Set(activeStories.map(s => s.userId)));

  const currentUserStories = selectedStoryUserId 
    ? activeStories.filter(s => s.userId === selectedStoryUserId) 
    : [];
  
  const selectedUser = users.find(u => u.id === selectedStoryUserId);

  useEffect(() => {
    let timer: any;
    if (selectedStoryUserId && currentUserStories.length > 0) {
      timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            if (currentStoryIndex < currentUserStories.length - 1) {
              setCurrentStoryIndex(prevIdx => prevIdx + 1);
              return 0;
            } else {
              setSelectedStoryUserId(null);
              return 0;
            }
          }
          return prev + (100 / (STORY_DURATION / 100));
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [selectedStoryUserId, currentStoryIndex, currentUserStories]);

  const handlePost = async () => {
    const imageToUpload = composerLocalBase64 || (composerImage.trim().length > 10 ? composerImage.trim() : null);
    if (!imageToUpload && !composerText.trim()) return;
    
    let finalCaption = composerText;
    if (isLocationActive && locationText) finalCaption += ` \n📍 ${locationText}`;
    
    addPost(imageToUpload || "", finalCaption, composerMediaType);
    resetComposer();
  };

  const resetComposer = () => {
    setComposerText('');
    setComposerImage('');
    setComposerLocalBase64(null);
    setComposerMediaType('image');
    setIsLocationActive(false);
    setLocationText('');
    setShowEmojiPicker(false);
  };

  const handleComposerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      setComposerMediaType(isVideo ? 'video' : 'image');
      const reader = new FileReader();
      reader.onloadend = () => {
        setComposerLocalBase64(reader.result as string);
        setComposerImage(''); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddStory = () => {
    const imageToUpload = localStoryBase64 || (storyImageUrl.trim().length > 10 ? storyImageUrl.trim() : null);
    if (!imageToUpload) return;
    addStory(imageToUpload, storyMediaType);
    closeStoryModal();
  };

  const handleDeleteStory = (storyId: string) => {
    deleteStory(storyId);
    if (currentUserStories.length <= 1) {
      setSelectedStoryUserId(null);
    } else {
      if (currentStoryIndex > 0) {
        setCurrentStoryIndex(prev => prev - 1);
      }
      setProgress(0);
    }
  };

  const handleStoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      setStoryMediaType(isVideo ? 'video' : 'image');
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalStoryBase64(reader.result as string);
        setStoryImageUrl(''); 
      };
      reader.readAsDataURL(file);
    }
  };

  const closeStoryModal = () => {
    setShowStoryModal(false);
    setStoryImageUrl('');
    setLocalStoryBase64(null);
    setStoryMediaType('image');
  };

  const openStoryViewer = (userId: string) => {
    setSelectedStoryUserId(userId);
    setCurrentStoryIndex(0);
    setProgress(0);
  };

  const currentUserHasStories = activeStories.some(s => s.userId === currentUser?.id);

  return (
    <div className="flex flex-col w-full pb-24 md:pb-4">
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-[#2F3336] p-4">
        <h1 className="text-xl font-bold">Inicio</h1>
      </div>

      <div className="w-full flex gap-4 overflow-x-auto p-4 border-b border-[#2F3336] no-scrollbar">
        <div className="flex flex-col items-center flex-shrink-0 cursor-pointer group">
          <div 
            onClick={currentUserHasStories ? () => openStoryViewer(currentUser!.id) : () => setShowStoryModal(true)}
            className={`relative w-[66px] h-[66px] rounded-full p-[2px] border-2 ${currentUserHasStories ? 'border-[#2ECC71]' : 'border-dashed border-gray-600'}`}
          >
            <div className="w-full h-full rounded-full bg-[#16181C] border-2 border-black overflow-hidden flex items-center justify-center">
              {currentUserHasStories ? (
                <img src={currentUser?.avatar} className="w-full h-full object-cover" />
              ) : (
                <Plus className="w-6 h-6 text-[#2ECC71]" />
              )}
            </div>
            {!currentUserHasStories && (
              <div className="absolute bottom-0 right-0 bg-[#2ECC71] rounded-full p-1 border-2 border-black">
                <Plus className="w-3 h-3 text-black stroke-[3px]" />
              </div>
            )}
          </div>
          <span className="text-[12px] text-gray-400 mt-1">Tu historia</span>
        </div>

        {users.filter(u => u.id !== currentUser?.id && usersWithStories.includes(u.id)).map(user => (
          <div key={user.id} onClick={() => openStoryViewer(user.id)} className="flex flex-col items-center flex-shrink-0 cursor-pointer group">
            <div className="w-[66px] h-[66px] rounded-full p-[2px] border-2 border-[#2ECC71]">
              <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-black">
                <img src={user.avatar} className="w-full h-full object-cover" alt={user.username} />
              </div>
            </div>
            <span className="text-[12px] text-gray-400 mt-1 max-w-[70px] truncate">@{user.username}</span>
          </div>
        ))}
      </div>

      <form 
        onSubmit={(e) => { e.preventDefault(); handlePost(); }}
        className="hidden md:flex p-4 gap-4 border-b border-[#2F3336]"
      >
        <img src={currentUser?.avatar} className="w-11 h-11 rounded-full object-cover" />
        <div className="flex-1 relative">
          <textarea 
            placeholder="¿Qué está pasando?"
            className="w-full bg-transparent text-xl outline-none placeholder:text-gray-600 resize-none min-h-[50px]"
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
          />
          {(composerLocalBase64 || composerImage) && (
            <div className="relative mt-2 group border border-[#2F3336] rounded-2xl overflow-hidden shadow-2xl bg-black">
              {composerMediaType === 'video' ? (
                <video src={composerLocalBase64 || composerImage} className="max-h-[400px] w-full object-cover" autoPlay muted loop />
              ) : (
                <img src={composerLocalBase64 || composerImage} className="max-h-[400px] w-full object-cover" />
              )}
              <button type="button" onClick={() => {setComposerLocalBase64(null); setComposerImage('');}} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full hover:bg-red-500 transition-colors"><X className="w-4 h-4 text-white" /></button>
            </div>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2F3336]">
            <div className="flex items-center gap-1 text-[#2ECC71]">
              <input type="file" name="image" accept="image/*,video/*,image/webp,image/avif,image/png,image/jpeg,image/gif" hidden ref={composerFileInputRef} onChange={handleComposerFileChange} />
              <button type="button" onClick={() => composerFileInputRef.current?.click()} className="p-2 hover:bg-[#2ECC71]/10 rounded-full transition-colors" title="Subir imagen o video">
                <ImageIcon className="w-[18px] h-[18px]" />
              </button>
              <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 hover:bg-[#2ECC71]/10 rounded-full transition-colors"><Smile className="w-[18px] h-[18px]" /></button>
              <button type="button" onClick={() => setIsLocationActive(!isLocationActive)} className={`p-2 hover:bg-[#2ECC71]/10 rounded-full transition-colors ${isLocationActive ? 'bg-[#2ECC71]/10' : ''}`}><MapPin className="w-[18px] h-[18px]" /></button>
            </div>
            <button 
              type="submit" 
              disabled={!composerText.trim() && !composerLocalBase64 && !composerImage} 
              className="bg-[#2ECC71] text-black font-bold px-5 py-2 rounded-full hover:bg-[#27AE60] disabled:opacity-50 active:scale-95 transition-all"
            >
              Postear
            </button>
          </div>
        </div>
      </form>

      <div className="w-full flex flex-col">
        {posts.map(post => <PostCard key={post.id} post={post} />)}
      </div>

      {selectedStoryUserId && currentUserStories.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-in fade-in duration-300">
          <div className="relative w-full h-full max-w-lg md:h-[90vh] md:rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-[#111]">
            <div className="absolute top-0 left-0 right-0 p-4 z-20 space-y-4">
              <div className="flex gap-1.5 px-1">
                {currentUserStories.map((_, idx) => (
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
                  <img src={selectedUser?.avatar} className="w-10 h-10 rounded-full border border-white/20 shadow-md" />
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-white drop-shadow-md">{selectedUser?.fullName}</span>
                    <span className="text-xs text-white/70 drop-shadow-md">@{selectedUser?.username}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedStoryUserId === currentUser?.id && (
                    <button 
                      onClick={() => handleDeleteStory(currentUserStories[currentStoryIndex].id)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full backdrop-blur-md transition-colors text-red-500"
                      title="Eliminar historia"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedStoryUserId(null)} 
                    className="p-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center relative group">
              {currentUserStories[currentStoryIndex].type === 'video' ? (
                <video 
                  src={currentUserStories[currentStoryIndex].imageUrl} 
                  className="w-full h-full object-cover" 
                  autoPlay 
                  muted 
                  loop 
                />
              ) : (
                <img 
                  src={currentUserStories[currentStoryIndex].imageUrl} 
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
                  if (currentStoryIndex < currentUserStories.length - 1) {
                    setCurrentStoryIndex(prev => prev + 1);
                    setProgress(0);
                  } else {
                    setSelectedStoryUserId(null);
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

      {showStoryModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleAddStory(); }}
            className="bg-black border border-[#2F3336] w-full max-sm:w-full max-w-sm rounded-3xl overflow-hidden p-6 space-y-6 shadow-2xl"
          >
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg text-[#2ECC71]">Crear Historia</h2>
              <button type="button" onClick={closeStoryModal} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5 text-white" /></button>
            </div>
            
            {(localStoryBase64 || storyImageUrl) && (
              <div className="relative rounded-2xl overflow-hidden aspect-[9/16] max-h-[300px] border border-[#2ECC71]/40 mx-auto shadow-[0_0_20px_rgba(46,204,113,0.1)]">
                {storyMediaType === 'video' ? (
                  <video src={localStoryBase64 || storyImageUrl} className="w-full h-full object-cover" autoPlay muted loop />
                ) : (
                  <img src={localStoryBase64 || storyImageUrl} className="w-full h-full object-cover" />
                )}
                <button type="button" onClick={() => {setLocalStoryBase64(null); setStoryImageUrl('');}} className="absolute top-2 right-2 bg-black/60 p-1 rounded-full"><X className="w-4 h-4 text-white" /></button>
              </div>
            )}

            <div className="space-y-4">
               <input type="file" name="storyImage" accept="image/*,video/*,image/webp,image/avif,image/png,image/jpeg,image/gif" hidden ref={storyFileInputRef} onChange={handleStoryFileChange} />
               <button type="button" onClick={() => storyFileInputRef.current?.click()} className="w-full flex items-center justify-center gap-3 border-2 border-dashed border-[#2F3336] p-5 rounded-2xl hover:border-[#2ECC71]/50 hover:bg-[#2ECC71]/5 transition-all group">
                 <Video className={`w-5 h-5 ${localStoryBase64 ? 'text-[#2ECC71]' : 'text-gray-500 group-hover:text-[#2ECC71]'}`} />
                 <span className={`text-sm font-bold ${localStoryBase64 ? 'text-[#2ECC71]' : 'text-gray-400 group-hover:text-white'}`}>{localStoryBase64 ? 'Archivo seleccionado' : 'Subir Imagen o Video'}</span>
               </button>

               <div className="relative flex items-center py-2">
                 <div className="flex-grow border-t border-[#2F3336]"></div>
                 <span className="flex-shrink mx-4 text-[10px] text-gray-500 font-bold tracking-widest uppercase">O enlace</span>
                 <div className="flex-grow border-t border-[#2F3336]"></div>
               </div>

               <input 
                 type="text" 
                 placeholder="Pega URL" 
                 className="w-full bg-[#16181C] border border-[#2F3336] rounded-2xl p-4 text-sm outline-none focus:border-[#2ECC71] transition-colors" 
                 value={storyImageUrl} 
                 onChange={(e) => {setStoryImageUrl(e.target.value); setLocalStoryBase64(null);}} 
               />

               <button 
                 type="submit" 
                 disabled={!storyImageUrl && !localStoryBase64} 
                 className="w-full bg-[#2ECC71] text-black font-extrabold py-4 rounded-2xl disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-[#2ECC71]/10"
               >
                 Publicar Historia
               </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Feed;
