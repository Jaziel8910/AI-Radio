
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, LoaderCircle, Heart } from 'lucide-react';
import * as socialService from '../services/socialService';

interface SocialHubProps {
    user: any;
    onBack: () => void;
}

const PostCard: React.FC<{ post: socialService.Post }> = ({ post }) => {
    const timeAgo = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return `hace ${Math.floor(interval)} años`;
        interval = seconds / 2592000;
        if (interval > 1) return `hace ${Math.floor(interval)} meses`;
        interval = seconds / 86400;
        if (interval > 1) return `hace ${Math.floor(interval)} días`;
        interval = seconds / 3600;
        if (interval > 1) return `hace ${Math.floor(interval)} horas`;
        interval = seconds / 60;
        if (interval > 1) return `hace ${Math.floor(interval)} min`;
        return 'justo ahora';
    };

    return (
        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-700 flex gap-4">
            <img src={post.authorAvatar} alt="avatar" className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-grow">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{post.authorUsername}</span>
                    <span className="text-xs text-slate-500">&bull; {timeAgo(post.timestamp)}</span>
                </div>
                <p className="text-slate-300 mt-1 whitespace-pre-wrap">{post.content}</p>
            </div>
        </div>
    );
};


const SocialHub: React.FC<SocialHubProps> = ({ user, onBack }) => {
    const [postContent, setPostContent] = useState('');
    const [posts, setPosts] = useState<socialService.Post[]>([]);
    const [isPosting, setIsPosting] = useState(false);
    const [isLoadingFeed, setIsLoadingFeed] = useState(true);
    const [error, setError] = useState('');

    const fetchPosts = useCallback(async () => {
        setIsLoadingFeed(true);
        const fetchedPosts = await socialService.getPosts();
        setPosts(fetchedPosts);
        setIsLoadingFeed(false);
    }, []);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handlePost = async () => {
        if (!postContent.trim()) return;
        setIsPosting(true);
        setError('');
        try {
            const newPost = await socialService.addPost(user, postContent);
            if (newPost) {
                setPosts(prev => [newPost, ...prev]);
                setPostContent('');
            }
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'No se pudo publicar.');
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="animate-[fade-in_0.5s] max-w-4xl mx-auto">
            <div className="flex justify-start mb-6">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold bg-slate-800/50 hover:bg-slate-700/80 px-4 py-2 rounded-lg transition-colors">
                    <ArrowLeft size={16}/> Volver a la Estación
                </button>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <h2 className="text-2xl font-bold mb-4">Comunidad AI Radio</h2>
                <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-700">
                    <textarea
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        placeholder="Comparte tus presets de DJ, citas favoritas o ideas..."
                        className="bg-transparent w-full p-2 border-0 focus:ring-0 resize-none text-slate-200 placeholder:text-slate-500"
                        rows={4}
                        disabled={isPosting}
                    />
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-slate-400">El contenido será revisado por una IA.</p>
                        <button onClick={handlePost} disabled={isPosting || !postContent.trim()} className="flex items-center gap-2 bg-purple-600 font-semibold py-2 px-4 rounded-lg hover:bg-purple-500 disabled:bg-slate-600">
                            {isPosting ? <LoaderCircle size={20} className="animate-spin" /> : <Send size={20}/>}
                            <span>Publicar</span>
                        </button>
                    </div>
                </div>
                {error && <p className="text-center text-sm mt-4 text-red-400">{error}</p>}
                
                <div className="mt-8 border-t border-slate-700 pt-6">
                    <h3 className="text-lg font-semibold mb-4">Feed de la Comunidad</h3>
                    {isLoadingFeed ? (
                        <div className="flex justify-center items-center py-10">
                            <LoaderCircle className="w-8 h-8 animate-spin text-purple-400" />
                        </div>
                    ) : posts.length > 0 ? (
                        <div className="space-y-4">
                            {posts.map(post => <PostCard key={post.id} post={post} />)}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-500">
                           <p>¡El feed está muy tranquilo!</p>
                           <p className="text-sm">Sé el primero en publicar algo.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SocialHub;
