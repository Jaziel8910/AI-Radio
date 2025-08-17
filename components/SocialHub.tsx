
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Send, LoaderCircle, Image as ImageIcon, Wind } from 'lucide-react';
import * as socialService from '../services/socialService';
import { Post, AuthorProfile, PostContent } from '../types';
import PostCard from './PostCard';

interface SocialHubProps {
    user: any;
    onBack: () => void;
}

const CreatePost: React.FC<{ user: any, onPostCreated: (newPost: Post) => void }> = ({ user, onPostCreated }) => {
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handlePost = async () => {
        if (!content.trim() && !imageFile) return;
        setIsPosting(true);
        setError('');
        try {
            const author: AuthorProfile = { uid: user.uid, username: user.username, avatar: user.photoURL };
            const postContent: PostContent = {
                type: imageFile ? 'image' : 'text',
                text: content,
            };
            const newPost = await socialService.addPost(author, postContent, imageFile || undefined);
            if (newPost) {
                onPostCreated(newPost);
                setContent('');
                setImageFile(null);
                setImagePreview(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo publicar.');
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-700">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="¿Qué está sonando en tu cabeza, o qué DJ has creado?"
                className="bg-transparent w-full p-2 border-0 focus:ring-0 resize-none text-slate-200 placeholder:text-slate-500"
                rows={3}
                disabled={isPosting}
            />
            {imagePreview && (
                <div className="mt-2 relative w-fit">
                    <img src={imagePreview} alt="Preview" className="max-h-40 rounded-lg" />
                    <button onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white leading-none">&times;</button>
                </div>
            )}
            {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
            <div className="flex justify-between items-center mt-2">
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-purple-400 rounded-full hover:bg-slate-800">
                    <ImageIcon size={20} />
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                </button>
                <button onClick={handlePost} disabled={isPosting || (!content.trim() && !imageFile)} className="flex items-center gap-2 bg-purple-600 font-semibold py-2 px-4 rounded-lg hover:bg-purple-500 disabled:bg-slate-600">
                    {isPosting ? <LoaderCircle size={20} className="animate-spin" /> : <Send size={20}/>}
                    <span>Publicar</span>
                </button>
            </div>
        </div>
    );
};

const SocialHub: React.FC<SocialHubProps> = ({ user, onBack }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoadingFeed, setIsLoadingFeed] = useState(true);

    const updatePosts = (updatedPosts: Post[]) => {
        setPosts(updatedPosts);
    };

    const fetchPosts = useCallback(async () => {
        setIsLoadingFeed(true);
        const fetchedPosts = await socialService.getPosts();
        setPosts(fetchedPosts);
        setIsLoadingFeed(false);
    }, []);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    return (
        <div className="animate-[fade-in_0.5s] max-w-4xl mx-auto">
            <div className="flex justify-start mb-6">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold bg-slate-800/50 hover:bg-slate-700/80 px-4 py-2 rounded-lg transition-colors">
                    <ArrowLeft size={16}/> Volver a la Estación
                </button>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <h2 className="text-2xl font-bold mb-4">Comunidad AI Radio</h2>
                <CreatePost user={user} onPostCreated={(newPost) => setPosts(prev => [newPost, ...prev])} />
                
                <div className="mt-8 border-t border-slate-700 pt-6">
                    <h3 className="text-lg font-semibold mb-4">Última Actividad</h3>
                    {isLoadingFeed ? (
                        <div className="flex justify-center items-center py-10"><LoaderCircle className="w-8 h-8 animate-spin text-purple-400" /></div>
                    ) : posts.length > 0 ? (
                        <div className="space-y-4">
                            {posts.map(post => <PostCard key={post.id} post={post} currentUser={user} onUpdate={updatePosts} />)}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-500"><Wind className="mx-auto w-10 h-10 mb-2" /><p>¡El feed está muy tranquilo! Sé el primero en publicar.</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SocialHub;
