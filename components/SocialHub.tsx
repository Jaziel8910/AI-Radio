
import React, { useState } from 'react';
import { ArrowLeft, Send, LoaderCircle } from 'lucide-react';
import { moderateContent } from '../services/geminiService';

interface SocialHubProps {
    onBack: () => void;
}

const SocialHub: React.FC<SocialHubProps> = ({ onBack }) => {
    const [postContent, setPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [moderationResult, setModerationResult] = useState('');

    const handlePost = async () => {
        if (!postContent.trim()) return;
        setIsPosting(true);
        setModerationResult('');
        try {
            const result = await moderateContent(postContent);
            setModerationResult(`Resultado de la moderación: ${result}`);
            if (result === 'TRUE' || result === 'WARNING') {
                // In a real app, you would submit the post here
                alert("¡Publicación enviada! (Simulación)");
                setPostContent('');
            } else {
                 alert("Tu publicación fue rechazada por el moderador de IA.");
            }
        } catch (error) {
            console.error(error);
            setModerationResult('Error al moderar el contenido.');
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
                {moderationResult && <p className="text-center text-sm mt-4 text-slate-400 animate-pulse">{moderationResult}</p>}
                <div className="mt-8 text-center text-slate-500 border-t border-slate-700 pt-6">
                    <h3 className="text-lg font-semibold">Feed de la Comunidad</h3>
                    <p>El feed de la comunidad y las publicaciones de otros usuarios aparecerán aquí pronto.</p>
                </div>
            </div>
        </div>
    );
};

export default SocialHub;
