
import React from 'react';
import { Post, ResidentDJ } from '../types';
import { Heart, MessageSquare } from 'lucide-react';
import * as socialService from '../services/socialService';

interface PostCardProps {
    post: Post;
    currentUser: any;
    onUpdate: (updatedPosts: Post[]) => void;
}

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

const DJPresetCard: React.FC<{ dj: ResidentDJ }> = ({ dj }) => (
    <div className="mt-2 border border-purple-500/30 bg-slate-800/50 rounded-lg p-3">
        <p className="text-xs text-purple-300 font-bold">PRESET DE DJ COMPARTIDO</p>
        <h4 className="text-lg font-bold text-white">{dj.name}</h4>
        <p className="text-sm text-slate-400">{dj.persona.name}</p>
    </div>
);

const PostCard: React.FC<PostCardProps> = ({ post, currentUser, onUpdate }) => {
    const hasLiked = post.likes.includes(currentUser.uid);

    const handleLike = async () => {
        const updatedPosts = await socialService.toggleLikePost(post.id, currentUser.uid);
        onUpdate(updatedPosts);
    };

    const renderContent = () => {
        switch (post.content.type) {
            case 'image':
                return (
                    <div>
                        {post.content.text && <p className="text-slate-300 mt-1 whitespace-pre-wrap">{post.content.text}</p>}
                        {post.content.imageUrl && <img src={post.content.imageUrl} alt="Contenido de la publicación" className="mt-2 rounded-lg max-h-96 w-auto" />}
                    </div>
                );
            case 'dj_preset_share':
                return (
                    <div>
                        {post.content.text && <p className="text-slate-300 mt-1 whitespace-pre-wrap">{post.content.text}</p>}
                        {post.content.djPreset && <DJPresetCard dj={post.content.djPreset} />}
                    </div>
                );
            case 'text':
            default:
                return <p className="text-slate-300 mt-1 whitespace-pre-wrap">{post.content.text}</p>;
        }
    };
    
    return (
        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-700">
            <div className="flex gap-4">
                <img src={post.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username[0] || 'A')}`} alt="avatar" className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-grow">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{post.author.username}</span>
                        <span className="text-xs text-slate-500">&bull; {timeAgo(post.timestamp)}</span>
                    </div>
                    {renderContent()}
                    <div className="flex items-center gap-6 mt-3 text-slate-400">
                        <button onClick={handleLike} className={`flex items-center gap-1.5 transition-colors hover:text-red-400 ${hasLiked ? 'text-red-500' : ''}`}>
                            <Heart size={18} className={hasLiked ? 'fill-current' : ''} />
                            <span className="text-sm">{post.likes.length}</span>
                        </button>
                        <button onClick={() => alert("La función de comentarios llegará pronto.")} className="flex items-center gap-1.5 transition-colors hover:text-sky-400">
                            <MessageSquare size={18} />
                            <span className="text-sm">{post.comments.length}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostCard;
