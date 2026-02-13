
import React, { useState, useRef } from 'react';
import Sidebar from './Sidebar';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { X, Image as ImageIcon, Smile, MapPin, Calendar, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { compressImage } from '../lib/utils';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [localImageBase64, setLocalImageBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLocationActive, setIsLocationActive] = useState(false);
  const [locationText, setLocationText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addPost } = useSocial();
  const { currentUser } = useAuth();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      if (isVideo) {
        if (file.size > 20 * 1024 * 1024) { 
          setError('El video es demasiado grande para este prototipo (máx 20MB).');
          return;
        }
        setMediaType('video');
        const reader = new FileReader();
        reader.onloadend = () => setLocalImageBase64(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setMediaType('image');
        const reader = new FileReader();
        reader.onloadend = async () => {
          const compressed = await compressImage(reader.result as string);
          setLocalImageBase64(compressed);
          setImageUrl(''); 
          setError('');
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    const imageToUpload = localImageBase64 || imageUrl.trim();
    if (!caption.trim() && !imageToUpload) {
      setError('Debes añadir texto o una imagen.');
      return;
    }
    addPost(imageToUpload || '', caption, mediaType);
    resetModal();
  };

  const resetModal = () => {
    setImageUrl('');
    setLocalImageBase64(null);
    setMediaType('image');
    setCaption('');
    setError('');
    setShowCreateModal(false);
  };

  const hasPreviewImage = !!localImageBase64 || (imageUrl.trim().length > 0 && (imageUrl.startsWith('http') || imageUrl.startsWith('data:')));

  return (
    <div className="flex justify-center min-h-screen bg-black text-white">
      <Sidebar onOpenPostModal={() => setShowCreateModal(true)} />
      <main className="feed-container min-h-screen relative">{children}</main>

      <aside className="hidden lg:flex flex-col w-[350px] p-4 gap-4 sticky top-0 h-screen overflow-y-auto">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#2ECC71]" />
          <Link to="/explore" className="block w-full bg-[#202327] rounded-full py-3 pl-12 pr-4 text-sm text-gray-400">Buscar en SocialApp</Link>
        </div>
      </aside>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-start justify-center p-4 pt-12 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <form onSubmit={handleCreatePost} className="bg-black border border-[#2F3336] w-full max-w-[600px] rounded-3xl overflow-hidden shadow-2xl mb-12 animate-in zoom-in duration-150">
             <div className="p-4 border-b border-[#2F3336] flex items-center justify-between sticky top-0 bg-black z-10">
                <button type="button" onClick={resetModal} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                <div className="flex items-center gap-4">
                  {error && <span className="text-red-500 text-xs font-bold">{error}</span>}
                  <button type="submit" className="bg-[#2ECC71] text-black font-extrabold px-6 py-2 rounded-full hover:bg-[#27AE60] transition-all active:scale-95">Postear</button>
                </div>
             </div>
             <div className="p-6 flex gap-4">
                <img src={currentUser?.avatar} className="w-12 h-12 rounded-full border border-transparent flex-shrink-0" />
                <div className="flex-1 space-y-4">
                    <textarea placeholder="¿Qué está pasando?" className="w-full bg-transparent text-xl outline-none placeholder:text-gray-600 resize-none h-32" value={caption} onChange={(e) => setCaption(e.target.value)} autoFocus />
                    {hasPreviewImage && (
                      <div className="relative group rounded-2xl overflow-hidden border border-[#2ECC71]/40 shadow-xl bg-black">
                        {mediaType === 'video' ? (
                          <video src={localImageBase64 || imageUrl} className="w-full h-auto max-h-[350px] object-cover" autoPlay muted loop />
                        ) : (
                          <img src={localImageBase64 || imageUrl} className="w-full h-auto max-h-[350px] object-cover" />
                        )}
                        <button type="button" onClick={() => {setLocalImageBase64(null); setImageUrl('');}} className="absolute top-3 right-3 bg-black/70 p-2 rounded-full hover:bg-red-500"><X className="w-4 h-4 text-white" /></button>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-[#2F3336]">
                      <div className="flex items-center gap-2 text-[#2ECC71]">
                        <input type="file" accept="image/*,video/*" hidden ref={fileInputRef} onChange={handleFileChange} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 hover:bg-[#2ECC71]/10 rounded-full transition-colors"><ImageIcon className="w-5 h-5" /></button>
                        <button type="button" onClick={() => setIsLocationActive(!isLocationActive)} className={`p-3 hover:bg-[#2ECC71]/10 rounded-full transition-colors ${isLocationActive ? 'bg-[#2ECC71]/10' : ''}`}><MapPin className="w-5 h-5" /></button>
                      </div>
                    </div>
                </div>
             </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Layout;
