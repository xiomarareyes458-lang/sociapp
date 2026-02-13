
import React, { useState, useRef, useEffect } from 'react';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { Image as ImageIcon, Smile, MapPin, X, Plus, ChevronLeft, ChevronRight, Video, Trash2 } from 'lucide-react';
import { compressImage } from '../lib/utils';

const STORY_DURATION = 5000;

const Feed: React.FC = () => {
  const { posts, users, stories, addPost, addStory, deleteStory } = useSocial();
  const { currentUser } = useAuth();
  
  const [composerText, setComposerText] = useState('');
  const [composerImage, setComposerImage] = useState('');
  const [composerLocalBase64, setComposerLocalBase64] = useState<string | null>(null);
  const [composerMediaType, setComposerMediaType] = useState<'image' | 'video'>('image');
  const [isLocationActive, setIsLocationActive] = useState(false);
  const [locationText, setLocationText] = useState('');
  const composerFileInputRef = useRef<HTMLInputElement>(null);

  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyImageUrl, setStoryImageUrl] = useState('');
  const [localStoryBase64, setLocalStoryBase64] = useState<string | null>(null);
  const [storyMediaType, setStoryMediaType] = useState<'image' | 'video'>('image');
  const storyFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedStoryUserId, setSelectedStoryUserId] = useState<string | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const activeStories = Array.isArray(stories) ? stories.filter(s => Date.now() - s.createdAt < 24 * 60 * 60 * 1000) : [];
  const usersWithStories = Array.from(new Set(activeStories.map(s => s.userId)));
  const currentUserStories = selectedStoryUserId ? activeStories.filter(s => s.userId === selectedStoryUserId) : [];
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
    const imageToUpload = composerLocalBase64 || (composerImage.trim().length > 10 ? composerImage.trim() : "");
    if (!imageToUpload && !composerText.trim()) return;
    
    let finalContent = composerText; // Cambiado a content
    if (isLocationActive && locationText) finalContent += ` \n📍 ${locationText}`;
    
    try {
      await addPost(imageToUpload, finalContent, composerMediaType);
      resetComposer();
    } catch (e) {
      console.error(e);
    }
  };

  const resetComposer = () => {
    setComposerText('');
    setComposerImage('');
    setComposerLocalBase64(null);
    setComposerMediaType('image');
    setIsLocationActive(false);
    setLocationText('');
  };

  const handleComposerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (isVideo) {
          setComposerMediaType('video');
          setComposerLocalBase64(reader.result as string);
        } else {
          setComposerMediaType('image');
          const compressed = await compressImage(reader.result as string);
          setComposerLocalBase64(compressed);
        }
        setComposerImage(''); 
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleAddStory = async () => {
    const imageToUpload = localStoryBase64 || (storyImageUrl.trim().length > 10 ? storyImageUrl.trim() : null);
    if (!imageToUpload) return;
    await addStory(imageToUpload, storyMediaType);
    closeStoryModal();
  };

  const resetStory = () => {
    setStoryImageUrl('');
    setLocalStoryBase64(null);
    setStoryMediaType('image');
  };

  const closeStoryModal = () => {
    setShowStoryModal(false);
    resetStory();
  };

  return (
    <div className="flex flex-col w-full pb-24 md:pb-4">
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-[#2F3336] p-4">
        <h1 className="text-xl font-bold">Inicio</h1>
      </div>

      <div className="w-full flex gap-4 overflow-x-auto p-4 border-b border-[#2F3336] no-scrollbar">
        <div className="flex flex-col items-center flex-shrink-0 cursor-pointer group">
          <div onClick={() => setShowStoryModal(true)} className="relative w-[66px] h-[66px] rounded-full p-[2px] border-dashed border-2 border-gray-600">
            <div className="w-full h-full rounded-full bg-[#16181C] flex items-center justify-center">
              <Plus className="w-6 h-6 text-[#2ECC71]" />
            </div>
          </div>
          <span className="text-[12px] text-gray-400 mt-1">Tu historia</span>
        </div>
        {users.filter(u => usersWithStories.includes(u.id)).map(user => (
          <div key={user.id} onClick={() => setSelectedStoryUserId(user.id)} className="flex flex-col items-center flex-shrink-0 cursor-pointer group">
            <div className="w-[66px] h-[66px] rounded-full p-[2px] border-2 border-[#2ECC71]">
              <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-black">
                <img src={user.avatar} className="w-full h-full object-cover" alt={user.username} />
              </div>
            </div>
            <span className="text-[12px] text-gray-400 mt-1 max-w-[70px] truncate">@{user.username}</span>
          </div>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handlePost(); }} className="p-4 gap-4 border-b border-[#2F3336] flex">
        <img src={currentUser?.avatar} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
        <div className="flex-1">
          <textarea 
            placeholder="¿Qué está pasando?"
            className="w-full bg-transparent text-xl outline-none placeholder:text-gray-600 resize-none min-h-[50px]"
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
          />
          {(composerLocalBase64 || composerImage) && (
            <div className="relative mt-2 rounded-2xl overflow-hidden border border-[#2F3336]">
              {composerMediaType === 'video' ? <video src={composerLocalBase64 || composerImage} className="max-h-[400px] w-full object-cover" autoPlay muted loop /> : <img src={composerLocalBase64 || composerImage} className="max-h-[400px] w-full object-cover" />}
              <button type="button" onClick={() => {setComposerLocalBase64(null); setComposerImage('');}} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full"><X className="w-4 h-4 text-white" /></button>
            </div>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2F3336]">
            <div className="flex items-center gap-1 text-[#2ECC71]">
              <input type="file" accept="image/*,video/*" hidden ref={composerFileInputRef} onChange={handleComposerFileChange} />
              <button type="button" onClick={() => composerFileInputRef.current?.click()} className="p-2 hover:bg-[#2ECC71]/10 rounded-full"><ImageIcon className="w-[18px] h-[18px]" /></button>
              <button type="button" onClick={() => setIsLocationActive(!isLocationActive)} className={`p-2 hover:bg-[#2ECC71]/10 rounded-full ${isLocationActive ? 'bg-[#2ECC71]/10' : ''}`}><MapPin className="w-[18px] h-[18px]" /></button>
            </div>
            <button type="submit" disabled={!composerText.trim() && !composerLocalBase64} className="bg-[#2ECC71] text-black font-bold px-5 py-2 rounded-full hover:bg-[#27AE60] disabled:opacity-50 active:scale-95 transition-all">Postear</button>
          </div>
        </div>
      </form>

      <div className="w-full flex flex-col">
        {Array.isArray(posts) && posts.map(post => <PostCard key={post.id} post={post} />)}
      </div>

      {selectedStoryUserId && currentUserStories.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-0 md:p-4">
          <div className="relative w-full h-full max-w-lg md:h-[90vh] overflow-hidden bg-black md:rounded-3xl">
            <div className="absolute top-0 left-0 right-0 p-4 z-20">
               <div className="flex gap-1 mb-4">
                 {currentUserStories.map((_, i) => (
                   <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                     <div className="h-full bg-white transition-all duration-100 ease-linear" style={{ width: i < currentStoryIndex ? '100%' : i === currentStoryIndex ? `${progress}%` : '0%' }} />
                   </div>
                 ))}
               </div>
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <img src={selectedUser?.avatar} className="w-10 h-10 rounded-full border border-white/20" />
                   <span className="font-bold text-white text-sm">@{selectedUser?.username}</span>
                 </div>
                 <button onClick={() => setSelectedStoryUserId(null)} className="p-2 bg-black/20 rounded-full"><X className="w-6 h-6 text-white" /></button>
               </div>
            </div>
            <div className="w-full h-full flex items-center justify-center">
              {currentUserStories[currentStoryIndex].type === 'video' ? <video src={currentUserStories[currentStoryIndex].imageUrl} className="w-full h-full object-cover" autoPlay muted loop /> : <img src={currentUserStories[currentStoryIndex].imageUrl} className="w-full h-full object-cover" />}
            </div>
            <div className="absolute inset-0 flex">
              <div className="w-1/3 h-full cursor-pointer" onClick={() => { if (currentStoryIndex > 0) { setCurrentStoryIndex(p => p - 1); setProgress(0); } }} />
              <div className="w-2/3 h-full cursor-pointer" onClick={() => { if (currentStoryIndex < currentUserStories.length - 1) { setCurrentStoryIndex(p => p + 1); setProgress(0); } else { setSelectedStoryUserId(null); } }} />
            </div>
          </div>
        </div>
      )}

      {showStoryModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#2F3336] w-full max-w-sm rounded-3xl p-6 space-y-6">
            <div className="flex justify-between items-center"><h2 className="font-bold text-[#2ECC71]">Nueva Historia</h2><button onClick={closeStoryModal}><X className="w-5 h-5" /></button></div>
            <input type="file" accept="image/*,video/*" hidden ref={storyFileInputRef} onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const isVideo = file.type.startsWith('video/');
                const reader = new FileReader();
                reader.onloadend = () => { setStoryMediaType(isVideo ? 'video' : 'image'); setLocalStoryBase64(reader.result as string); };
                reader.readAsDataURL(file);
              }
            }} />
            <button onClick={() => storyFileInputRef.current?.click()} className="w-full h-40 border-2 border-dashed border-[#2F3336] rounded-2xl flex items-center justify-center hover:border-[#2ECC71] transition-all overflow-hidden">
               {localStoryBase64 ? (storyMediaType === 'video' ? <video src={localStoryBase64} className="w-full h-full object-cover" /> : <img src={localStoryBase64} className="w-full h-full object-cover" />) : <span className="text-gray-500 text-sm">Cargar imagen/video</span>}
            </button>
            <button onClick={handleAddStory} disabled={!localStoryBase64} className="w-full bg-[#2ECC71] text-black font-bold py-3 rounded-2xl disabled:opacity-50">Publicar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Feed;
