
import React, { useState, useMemo } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Trash2, Repeat2, Trash, X } from 'lucide-react';
import { Post } from './types';
import { useAuth } from './context/AuthContext';
import { useSocial } from './SocialContext';
import { formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';

const PostCard: React.FC<{ post: Post; initiallyShowComments?: boolean }> = ({ post, initiallyShowComments = false }) => {
  const { currentUser } = useAuth();
  const { toggleLike, addComment, deletePost, deleteComment, repostPost, users, posts } = useSocial();
  const navigate = useNavigate();
  const [commentText, setCommentText] = useState('');
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [showComments, setShowComments] = useState(initiallyShowComments);
  const [showLikesModal, setShowLikesModal] = useState(false);

  // Asegurar que post.likes siempre sea un array
  const likesArray = useMemo(() => Array.isArray(post.likes) ? post.likes : [], [post.likes]);
  
  const author = useMemo(() => users.find(u => u.id === post.userId), [users, post.userId]);
  const displayAvatar = author?.avatar || post.userAvatar;
  const displayUsername = author?.username || post.username;

  const isLiked = currentUser ? likesArray.includes(currentUser.id) : false;
  const isOwnPost = currentUser ? post.userId === currentUser.id : false;

  const likedByUsers = users.filter(u => likesArray.includes(u.id));
  const otherLikesCount = Math.max(0, likesArray.length - 1);
  const firstLiker = likedByUsers[0];

  const repostCount = posts.filter(p => p.repostOf === post.id).length;
  const recentComments = Array.isArray(post.comments) ? post.comments.slice(-3) : [];

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(post.id, commentText);
    setCommentText('');
    setShowComments(true);
  };

  const handleRepost = () => {
    repostPost(post.repostOf || post.id);
  };

  return (
    <>
      <div className="post-transition border-b border-[#2F3336] p-4 flex flex-col">
        {post.repostOf && (
          <div className="flex items-center gap-2 ml-10 mb-2 text-xs font-bold text-gray-500">
            <Repeat2 className="w-4 h-4" />
            <span>{post.repostedBy} reposteó</span>
          </div>
        )}

        <div className="flex gap-3">
          <Link to={`/profile/${displayUsername}`} className="flex-shrink-0">
            <img src={displayAvatar} className="w-11 h-11 rounded-full object-cover hover:brightness-90 transition-all border border-transparent hover:border-[#2ECC71]" alt="Avatar" />
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1 text-[15px] truncate">
                <Link to={`/profile/${displayUsername}`} className="font-bold text-white hover:underline truncate">{author?.fullName || post.username}</Link>
                <span className="text-gray-500">@{displayUsername}</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-500 hover:underline">{formatDistanceToNow(post.createdAt)}</span>
              </div>
              <div className="relative">
                <button onClick={() => setShowDeleteMenu(!showDeleteMenu)} className="p-2 hover:bg-[#2ECC71]/10 hover:text-[#2ECC71] rounded-full transition-colors text-gray-500">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showDeleteMenu && isOwnPost && (
                  <div className="absolute right-0 top-full mt-1 bg-black border border-[#2F3336] rounded-xl shadow-[0_8px_30px_rgb(255,255,255,0.1)] z-10 w-40 overflow-hidden">
                    <button 
                      onClick={() => { deletePost(post.id); setShowDeleteMenu(false); }}
                      className="flex items-center gap-2 p-3 text-red-500 hover:bg-white/5 w-full text-left text-sm font-semibold"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar post
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="text-[15px] text-white leading-normal mb-3 whitespace-pre-wrap">
              {post.content}
            </div>

            {post.imageUrl && post.imageUrl.trim() !== "" && (
              <div className="mb-3 rounded-2xl overflow-hidden border border-[#2F3336] bg-black hover:border-[#2ECC71]/50 transition-colors relative">
                 {post.type === 'video' ? (
                   <video src={post.imageUrl} controls className="w-full h-auto max-h-[600px] object-cover" />
                 ) : (
                   <img src={post.imageUrl} alt="post content" className="w-full h-auto max-h-[600px] object-cover" />
                 )}
              </div>
            )}

            <div className="flex items-center justify-between max-w-md text-gray-500 mb-2">
               <button onClick={() => setShowComments(!showComments)} className={`flex items-center gap-2 group transition-colors ${showComments ? 'text-[#2ECC71]' : 'hover:text-[#2ECC71]'}`}>
                  <div className="p-2 group-hover:bg-[#2ECC71]/10 rounded-full">
                    <MessageCircle className={`w-[18px] h-[18px] ${showComments ? 'fill-[#2ECC71]' : ''}`} />
                  </div>
                  <span className="text-[13px] group-hover:text-[#2ECC71] font-medium">{post.comments?.length || 0}</span>
               </button>

               <button onClick={handleRepost} className="flex items-center gap-2 group transition-colors hover:text-green-500">
                  <div className="p-2 group-hover:bg-green-500/10 rounded-full">
                    <Repeat2 className={`w-[18px] h-[18px] ${post.repostOf ? 'text-green-500' : ''}`} />
                  </div>
                  <span className="text-[13px] group-hover:text-green-500 font-medium">{repostCount > 0 ? repostCount : 'Repost'}</span>
               </button>

               <button onClick={(e) => { e.stopPropagation(); toggleLike(post.id); }} className={`flex items-center gap-2 group transition-colors ${isLiked ? 'text-[#2ECC71]' : 'hover:text-[#2ECC71]'}`}>
                  <div className={`p-2 ${isLiked ? '' : 'group-hover:bg-[#2ECC71]/10'} rounded-full`}>
                    <Heart className={`w-[18px] h-[18px] transition-transform active:scale-125 ${isLiked ? 'fill-[#2ECC71] text-[#2ECC71]' : ''}`} />
                  </div>
                  <span className={`text-[13px] ${isLiked ? 'text-[#2ECC71] font-bold' : 'font-medium'}`}>{likesArray.length}</span>
               </button>

               <div className="flex">
                  <button className="p-2 hover:bg-[#2ECC71]/10 hover:text-[#2ECC71] rounded-full transition-colors"><Bookmark className="w-[18px] h-[18px]" /></button>
                  <button className="p-2 hover:bg-[#2ECC71]/10 hover:text-[#2ECC71] rounded-full transition-colors"><Send className="w-[18px] h-[18px]" /></button>
               </div>
            </div>

            {likesArray.length > 0 && (
              <div onClick={() => setShowLikesModal(true)} className="text-[13px] text-gray-400 mb-2 cursor-pointer hover:underline">
                Le gusta a <span className="font-bold text-white">{firstLiker?.username || 'alguien'}</span>
                {otherLikesCount > 0 && (<> y <span className="font-bold text-white">{otherLikesCount} {otherLikesCount === 1 ? 'persona' : 'personas'} más</span></>)}
              </div>
            )}

            <div className="mt-2 space-y-2">
              {!showComments && post.comments?.length > 0 && (
                <>
                  {post.comments.length > 3 && (
                    <button onClick={() => setShowComments(true)} className="text-[13px] text-gray-500 hover:text-[#2ECC71] transition-colors mb-1">
                      Ver los {post.comments.length} comentarios
                    </button>
                  )}
                  {recentComments.map(comment => (
                    <div key={comment.id} className="text-[13px] flex gap-2">
                      <span className="font-bold text-white hover:underline cursor-pointer" onClick={() => navigate(`/profile/${comment.username}`)}>{comment.username}</span>
                      <span className="text-gray-300">{comment.text}</span>
                    </div>
                  ))}
                </>
              )}

              {showComments && (
                <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {post.comments?.length > 0 ? (
                    post.comments.map((comment) => {
                      const commentUser = users.find(u => u.id === comment.userId);
                      const canDeleteComment = currentUser?.id === comment.userId || currentUser?.id === post.userId;
                      return (
                        <div key={comment.id} className="flex gap-3 relative group/comment">
                          <img 
                            src={commentUser?.avatar || 'https://www.gravatar.com/avatar?d=mp'} 
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-[#2F3336]" 
                            alt="Commenter" 
                          />
                          <div className="flex-1 bg-white/5 p-3 rounded-2xl rounded-tl-none border border-[#2F3336]/50">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white hover:underline cursor-pointer" onClick={() => navigate(`/profile/${comment.username}`)}>{comment.username}</span>
                                <span className="text-[10px] text-gray-500">{formatDistanceToNow(comment.createdAt)}</span>
                              </div>
                              {canDeleteComment && (
                                <button onClick={() => deleteComment(post.id, comment.id)} className="opacity-0 group-hover/comment:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-all">
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-gray-200">{comment.text}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (<p className="text-xs text-gray-500 italic py-2">No hay comentarios aún.</p>)}
                  <button onClick={() => setShowComments(false)} className="text-[11px] font-bold text-[#2ECC71] uppercase tracking-wider hover:underline">Ocultar comentarios</button>
                </div>
              )}
            </div>

            <form onSubmit={handleComment} className="mt-4 flex items-center gap-3 bg-[#16181C] p-2 pr-4 rounded-full border border-transparent focus-within:border-[#2ECC71]/30 transition-all">
               <img src={currentUser?.avatar} className="w-8 h-8 rounded-full object-cover border border-[#2F3336]" alt="Current User" />
               <input 
                type="text" 
                placeholder="Añade un comentario..." 
                className="bg-transparent text-[14px] outline-none flex-1 border-none placeholder:text-gray-600 text-white" 
                value={commentText} 
                onChange={(e) => setCommentText(e.target.value)} 
              />
               <button disabled={!commentText.trim()} className="text-[#2ECC71] font-bold text-sm disabled:opacity-30 hover:text-[#27AE60] transition-colors active:scale-95">Publicar</button>
            </form>
          </div>
        </div>
      </div>

      {showLikesModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-black border border-[#2F3336] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-[#2F3336] flex items-center justify-between">
              <h2 className="font-bold text-lg">Le gusta a</h2>
              <button onClick={() => setShowLikesModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-2 no-scrollbar">
              {likedByUsers.length > 0 ? (
                likedByUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-colors group">
                    <div onClick={() => { setShowLikesModal(false); navigate(`/profile/${user.username}`); }} className="flex items-center gap-3 cursor-pointer flex-1">
                      <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-[#2F3336] group-hover:border-[#2ECC71]" alt="Liker" />
                      <div>
                        <div className="font-bold text-sm text-white">{user.fullName}</div>
                        <div className="text-xs text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (<div className="py-20 text-center text-gray-500"><p className="text-sm">No hay likes todavía.</p></div>)}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PostCard;
