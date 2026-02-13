
import React, { useState, useEffect, useMemo } from 'react';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Search, UserPlus, TrendingUp, Grid, Heart, MessageCircle, MoreHorizontal } from 'lucide-react';

const Explore: React.FC = () => {
  const { posts, users, toggleFollow } = useSocial();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [displayCount, setDisplayCount] = useState(12);
  const [shuffledPosts, setShuffledPosts] = useState([...posts]);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  // 1. FILTRO DE USUARIOS MEJORADO
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return users.filter(user => 
      (user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
       user.username.toLowerCase().includes(searchTerm.toLowerCase())) &&
       user.id !== currentUser?.id
    );
  }, [searchTerm, users, currentUser]);

  // 2. BARAJADO DE CONTENIDO
  useEffect(() => {
    setShuffledPosts([...posts].sort(() => Math.random() - 0.5));
  }, [posts]);

  const allPossibleSuggestions = users
    .filter(u => u.id !== currentUser?.id && !currentUser?.following.includes(u.id));
  
  const suggestedUsers = showAllSuggestions 
    ? allPossibleSuggestions 
    : allPossibleSuggestions.slice(0, 5);

  return (
    <div className="w-full min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-[#2F3336] p-4">
        <div className="relative group max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#2ECC71] transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, apellido o @usuario..."
            className="w-full bg-[#16181C] border border-transparent rounded-full py-3 pl-12 pr-4 text-sm outline-none focus:bg-black focus:ring-1 focus:ring-[#2ECC71] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-10">
        {searchTerm.trim() !== '' ? (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <h2 className="text-xs font-bold text-[#2ECC71] uppercase tracking-[0.2em] mb-6">Resultados encontrados</h2>
            {filteredUsers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredUsers.map(user => (
                  <div key={user.id} className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-4 flex items-center justify-between hover:border-[#2ECC71]/30 transition-all group">
                    <Link to={`/profile/${user.username}`} className="flex items-center gap-4 flex-1 overflow-hidden">
                      <img src={user.avatar} className="w-12 h-12 rounded-full object-cover border border-[#2F3336] group-hover:border-[#2ECC71]" />
                      <div className="overflow-hidden">
                        <div className="font-bold truncate text-white text-[15px]">{user.fullName}</div>
                        <div className="text-sm text-gray-500 truncate">@{user.username}</div>
                      </div>
                    </Link>
                    <button 
                      onClick={() => toggleFollow(user.id)}
                      className={`text-xs font-bold px-4 py-2 rounded-full transition-all ${currentUser?.following.includes(user.id) ? 'border border-[#2F3336] text-white hover:bg-red-500/10 hover:text-red-500' : 'bg-white text-black hover:bg-[#2ECC71]'}`}
                    >
                      {currentUser?.following.includes(user.id) ? 'Siguiendo' : 'Seguir'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-[#0A0A0A] rounded-3xl border border-dashed border-[#2F3336]">
                <p className="text-gray-500 text-lg">No encontramos a ningún usuario con "{searchTerm}"</p>
                <button onClick={() => setSearchTerm('')} className="text-[#2ECC71] mt-2 font-bold hover:underline">Ver sugerencias</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Personas que podrías conocer</h2>
                <button 
                  onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                  className="text-[13px] text-[#2ECC71] font-bold hover:underline transition-all"
                >
                  {showAllSuggestions ? 'Ver menos' : 'Ver todo'}
                </button>
              </div>
              <div className={`flex ${showAllSuggestions ? 'flex-wrap' : 'overflow-x-auto'} gap-4 pb-6 no-scrollbar transition-all`}>
                {suggestedUsers.map(user => (
                  <div key={user.id} className={`${showAllSuggestions ? 'w-[calc(50%-8px)] md:w-[calc(33.33%-11px)]' : 'flex-shrink-0 w-44'} bg-[#16181C] border border-[#2F3336] rounded-2xl p-5 flex flex-col items-center text-center space-y-4 hover:border-[#2ECC71]/20 transition-all group animate-in zoom-in-95`}>
                    <Link to={`/profile/${user.username}`}>
                      <img src={user.avatar} className="w-20 h-20 rounded-full object-cover border-2 border-transparent group-hover:border-[#2ECC71] transition-all" />
                    </Link>
                    <div className="w-full">
                      <div className="text-[15px] font-bold truncate">{user.fullName}</div>
                      <div className="text-xs text-gray-500 truncate">@{user.username}</div>
                    </div>
                    <button 
                      onClick={() => toggleFollow(user.id)}
                      className="w-full bg-white text-black text-[11px] font-bold py-2 rounded-full hover:bg-[#2ECC71] transition-all active:scale-95"
                    >
                      Seguir
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-4 h-4 text-[#2ECC71]" />
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Tendencias de hoy</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {shuffledPosts.slice(0, displayCount).map(post => (
                  <div key={post.id} className="relative aspect-square group cursor-pointer overflow-hidden bg-[#0A0A0A] rounded-xl border border-[#2F3336]">
                    {post.imageUrl ? (
                      <>
                        <img src={post.imageUrl} alt="explore content" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 text-white transition-opacity backdrop-blur-[2px]">
                          <div className="flex items-center gap-4 font-bold">
                            <span className="flex items-center gap-1"><Heart className="w-5 h-5 fill-[#2ECC71] text-[#2ECC71]" /> {post.likes.length}</span>
                            <span className="flex items-center gap-1"><MessageCircle className="w-5 h-5 fill-white" /> {post.comments.length}</span>
                          </div>
                          <div className="text-[10px] font-bold text-gray-300">@{post.username}</div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center group-hover:bg-[#16181C] transition-colors">
                        {/* Fix: Changed post.caption to post.content */}
                        <p className="text-[12px] text-gray-400 italic line-clamp-5 leading-relaxed font-serif">"{post.content}"</p>
                        <div className="mt-3 text-[10px] font-bold text-[#2ECC71] tracking-widest uppercase">@{post.username}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {shuffledPosts.length > displayCount && (
                <div className="mt-10 text-center">
                  <button 
                    onClick={() => setDisplayCount(prev => prev + 6)}
                    className="px-8 py-3 bg-[#16181C] border border-[#2F3336] rounded-full text-sm font-bold hover:bg-white/5 hover:border-[#2ECC71] transition-all active:scale-95"
                  >
                    Cargar más publicaciones
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Explore;