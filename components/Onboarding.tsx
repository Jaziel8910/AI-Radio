import React, { useState, useEffect } from 'react';
import { DJ_PERSONAS } from '../constants';
import { DJPersona, ResidentDJ } from '../types';
import { Sparkles, Mic, User, Volume2 } from 'lucide-react';

interface OnboardingProps {
    onHire: (dj: ResidentDJ) => void;
    error: string | null;
}

const Onboarding: React.FC<OnboardingProps> = ({ onHire, error }) => {
    const [name, setName] = useState('');
    const [selectedPersona, setSelectedPersona] = useState<DJPersona>(DJ_PERSONAS[0]);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [voiceURI, setVoiceURI] = useState('');

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('es-'));
            setVoices(availableVoices);
            if (availableVoices.length > 0 && !voiceURI) {
                setVoiceURI(availableVoices[0].voiceURI);
            }
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, [voiceURI]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && selectedPersona) {
            const newDJ: ResidentDJ = {
                id: crypto.randomUUID(),
                name: name.trim(),
                persona: selectedPersona,
                dna: { humor: 0, energy: 0, knowledge: 0, tone: 0 },
                voiceURI,
                speechRate: 1,
                speechPitch: 1,
            };
            onHire(newDJ);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 animate-[fade-in_0.5s]">
            <div className="w-full max-w-2xl text-center">
                <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h2 className="text-4xl md:text-5xl font-black text-white">Contrata a tu Primer DJ</h2>
                <p className="text-lg text-slate-300 max-w-3xl mx-auto mt-4">
                    Estás a punto de darle un alma a tu estación. Elige una personalidad base y dale un nombre a tu primer DJ.
                    Él o ella aprenderá de tus gustos con el tiempo. Podrás crear más DJs después.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full max-w-lg mt-10 bg-slate-800/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm space-y-6">
                <div>
                    <label htmlFor="dj-name" className="block text-sm font-medium text-slate-300 mb-2">1. Dale un nombre a tu DJ</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            id="dj-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Alex, La Jefa, El Capi..."
                            required
                            className="bg-slate-900 border border-slate-600 rounded-lg w-full p-3 pl-10 text-lg"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="dj-persona" className="block text-sm font-medium text-slate-300 mb-2">2. Elige su personalidad inicial</label>
                    <div className="relative">
                        <Mic className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                         <select
                            id="dj-persona"
                            value={selectedPersona.name}
                            onChange={(e) => setSelectedPersona(DJ_PERSONAS.find(p => p.name === e.target.value)!)}
                            className="bg-slate-900 border border-slate-700 rounded-lg w-full p-3 pl-10 appearance-none"
                        >
                            {DJ_PERSONAS.map(p => (
                                <option key={p.name} value={p.name}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <p className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-md mt-3">{selectedPersona.style}</p>
                </div>

                <div>
                    <label htmlFor="dj-voice" className="block text-sm font-medium text-slate-300 mb-2">3. Elige su voz</label>
                    <div className="relative">
                        <Volume2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                         <select
                            id="dj-voice"
                            value={voiceURI}
                            onChange={(e) => setVoiceURI(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg w-full p-3 pl-10 appearance-none"
                            disabled={voices.length === 0}
                        >
                            {voices.length === 0 && <option>Cargando voces...</option>}
                            {voices.map(v => (
                                <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                {error && <p className="bg-red-500/10 text-red-400 text-center text-sm p-3 rounded-lg border border-red-500/20">{error}</p>}

                <button
                    type="submit"
                    disabled={!name.trim()}
                    className="w-full bg-purple-600 text-white font-bold py-3 text-lg rounded-lg transition-all shadow-[0_4px_14px_0_rgb(124,58,237,39%)] hover:shadow-[0_6px_20px_0_rgb(124,58,237,23%)] hover:bg-purple-500 disabled:bg-slate-600 disabled:shadow-none disabled:cursor-not-allowed"
                >
                    ¡Contratar a mi DJ!
                </button>
            </form>
        </div>
    );
};

export default Onboarding;