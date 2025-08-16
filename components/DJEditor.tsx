import React, { useState, useEffect } from 'react';
import { ResidentDJ, DJPersona, DJDNA } from '../types';
import { DJ_PERSONAS } from '../constants';
import { User, Mic, Save, ArrowLeft, BrainCircuit, Heart, Zap, Annoyed, Volume2, FastForward, GitCommitHorizontal } from 'lucide-react';

interface DJEditorProps {
    dj: ResidentDJ | null;
    onSave: (dj: ResidentDJ) => void;
    onBack: () => void;
}

const DNASlider = ({ label, value, onChange, minLabel, maxLabel, icon: Icon, min = -1, max = 1, step = 0.05 }: { label: string, value: number, onChange: (val: number) => void, minLabel: string, maxLabel: string, icon: React.ElementType, min?:number, max?: number, step?: number }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2"><Icon size={16} className="text-purple-400"/> {label}</label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            className="w-full progress-bar h-2"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{minLabel}</span>
            <span>{maxLabel}</span>
        </div>
    </div>
);

const DJEditor: React.FC<DJEditorProps> = ({ dj, onSave, onBack }) => {
    const [name, setName] = useState(dj?.name || '');
    const [selectedPersona, setSelectedPersona] = useState<DJPersona>(dj?.persona || DJ_PERSONAS[0]);
    const [dna, setDna] = useState<DJDNA>(dj?.dna || { humor: 0, energy: 0, knowledge: 0, tone: 0 });
    const [voiceURI, setVoiceURI] = useState(dj?.voiceURI || '');
    const [speechRate, setSpeechRate] = useState(dj?.speechRate || 1);
    const [speechPitch, setSpeechPitch] = useState(dj?.speechPitch || 1);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

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


    const handleDnaChange = (field: keyof DJDNA, value: number) => {
        setDna(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const savedDJ: ResidentDJ = {
            id: dj?.id || crypto.randomUUID(),
            name: name.trim(),
            persona: selectedPersona,
            dna,
            voiceURI,
            speechRate,
            speechPitch
        };
        onSave(savedDJ);
    };

    return (
        <div className="max-w-2xl mx-auto animate-[fade-in_0.5s]">
            <div className="flex justify-start mb-6">
                 <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold bg-slate-800/50 hover:bg-slate-700/80 px-4 py-2 rounded-lg transition-colors"><ArrowLeft size={16}/> Volver a la Bóveda</button>
            </div>
            <form onSubmit={handleSubmit} className="w-full bg-slate-800/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm space-y-6">
                <div>
                    <label htmlFor="dj-name" className="block text-sm font-medium text-slate-300 mb-2">Nombre del DJ</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input type="text" id="dj-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Alex, La Jefa..." required className="bg-slate-900 border border-slate-600 rounded-lg w-full p-3 pl-10 text-lg" />
                    </div>
                </div>

                <div>
                    <label htmlFor="dj-persona" className="block text-sm font-medium text-slate-300 mb-2">Personalidad Base</label>
                     <div className="relative">
                        <Mic className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <select id="dj-persona" value={selectedPersona.name} onChange={e => setSelectedPersona(DJ_PERSONAS.find(p => p.name === e.target.value)!)} className="bg-slate-900 border border-slate-700 rounded-lg w-full p-3 pl-10 appearance-none">
                            {DJ_PERSONAS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                        </select>
                    </div>
                    <p className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-md mt-3">{selectedPersona.style}</p>
                </div>
                
                <div className="space-y-4 pt-4 border-t border-slate-700">
                    <h3 className="font-semibold text-lg text-center">ADN de Personalidad</h3>
                    <DNASlider label="Humor" value={dna.humor} onChange={v => handleDnaChange('humor', v)} minLabel="Sutil" maxLabel="Sarcástico" icon={Annoyed} />
                    <DNASlider label="Energía" value={dna.energy} onChange={v => handleDnaChange('energy', v)} minLabel="Relajado" maxLabel="Extremo" icon={Zap} />
                    <DNASlider label="Profundidad" value={dna.knowledge} onChange={v => handleDnaChange('knowledge', v)} minLabel="Superficial" maxLabel="Erudito" icon={BrainCircuit} />
                    <DNASlider label="Tono" value={dna.tone} onChange={v => handleDnaChange('tone', v)} minLabel="Amistoso" maxLabel="Provocador" icon={Heart} />
                </div>

                 <div className="space-y-4 pt-4 border-t border-slate-700">
                    <h3 className="font-semibold text-lg text-center">Ajustes de Voz</h3>
                     <div>
                        <label htmlFor="dj-voice" className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2"><Volume2 size={16} className="text-purple-400"/> Voz del DJ</label>
                        <div className="relative">
                            <select id="dj-voice" value={voiceURI} onChange={(e) => setVoiceURI(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg w-full p-3 appearance-none" disabled={voices.length === 0}>
                                {voices.length === 0 && <option>Cargando voces...</option>}
                                {voices.map(v => ( <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>))}
                            </select>
                        </div>
                    </div>
                    <DNASlider label={`Velocidad: ${speechRate.toFixed(1)}x`} value={speechRate} onChange={setSpeechRate} minLabel="Lento" maxLabel="Rápido" icon={FastForward} min={0.5} max={2} step={0.1}/>
                    <DNASlider label={`Tono: ${speechPitch.toFixed(1)}`} value={speechPitch} onChange={setSpeechPitch} minLabel="Grave" maxLabel="Agudo" icon={GitCommitHorizontal} min={0} max={2} step={0.1}/>
                </div>


                <button type="submit" disabled={!name.trim()} className="w-full bg-purple-600 text-white font-bold py-3 text-lg rounded-lg transition-all shadow-[0_4px_14px_0_rgb(124,58,237,39%)] hover:shadow-[0_6px_20px_0_rgb(124,58,237,23%)] hover:bg-purple-500 disabled:bg-slate-600 disabled:shadow-none flex items-center justify-center gap-2">
                    <Save size={20}/> {dj ? 'Guardar Cambios' : 'Crear DJ'}
                </button>
            </form>
        </div>
    );
};

export default DJEditor;