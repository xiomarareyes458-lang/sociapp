
import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocial } from '../context/SocialContext';
import PostCard from '../components/PostCard';
import { ArrowLeft } from 'lucide-react';

const PostDetail: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const { posts } = useSocial();
  const navigate = useNavigate();

  const post = useMemo(() => posts.find(p => p.id === postId), [posts, postId]);

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-500">
        <p className="text-xl font-bold">Publicación no encontrada</p>
        <button onClick={() => navigate('/')} className="text-[#2ECC71] mt-4 hover:underline">Volver al inicio</button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black text-white">
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-[#2F3336] p-4 flex items-center gap-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Publicación</h1>
      </div>
      
      <div className="max-w-2xl mx-auto">
        <PostCard post={post} initiallyShowComments={true} />
      </div>
    </div>
  );
};

export default PostDetail;
