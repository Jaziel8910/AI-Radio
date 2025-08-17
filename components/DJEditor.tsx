
import React, { useState, useEffect, useMemo } from 'react';
import { ResidentDJ, DJPersona, DJDNA } from '../types';
import { DJ_PERSONAS, AMAZON_POLLY_VOICES } from '../constants';
import { User, Mic, Save, ArrowLeft, BrainCircuit, Heart, Zap, Annoyed, Volume2, Bot, LoaderCircle, SlidersHorizontal, TestTube2, ChevronsUpDown } from 'lucide-react';

declare var puter: any;

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
    const [dna, setDna] = useState<DJDNA>(dj?.dna || { humor: 0, energy: 0, knowledge: 0, tone: 0, pace: 0, pitch: 0 });
    
    const [voiceLanguage, setVoiceLanguage] = useState(dj?.voiceLanguage || 'es-ES');
    const [voiceId, setVoiceId] = useState(dj?.voiceId || 'Lucia');
    const [voiceEngine, setVoiceEngine] = useState<'standard' | 'neural' | 'generative'>(dj?.voiceEngine || 'generative');
    
    const [isTestingVoice, setIsTestingVoice] = useState(false);
    const [activeTab, setActiveTab] = useState('persona');

    const availableVoices = useMemo(() => {
        return AMAZON_POLLY_VOICES.find(lang => lang.langCode === voiceLanguage)?.voices || [];
    }, [voiceLanguage]);

    useEffect(() => {
        // If the selected voice ID is not in the new list of available voices, default to the first one
        if (!availableVoices.some(v => v.voiceId === voiceId)) {
            setVoiceId(availableVoices[0]?.voiceId || '');
        }
    }, [availableVoices, voiceId]);

    const handleDnaChange = (field: keyof DJDNA, value: number) => {
        setDna(prev => ({ ...prev, [field]: value }));
    };

    const testVoice = async () => {
        if (typeof puter === 'undefined' || !puter.ai?.txt2speech) {
            alert("El motor de voz de Puter no está disponible. Revisa la conexión.");
            return;
        }
        setIsTestingVoice(true);
        try {
            const djName = name.trim() || "tu DJ";
            const text = `Hola, soy ${djName} y estoy probando mi nueva voz, ${voiceId}, en AI Radio.`;
            const audio = await puter.ai.txt2speech(text, {
                language: voiceLanguage,
                voice: voiceId,
                engine: voiceEngine,
            });
            
            await audio.play();

        } catch (err) {
            console.error("Error al probar la voz:", err);
            let userMessage = "No se pudo generar la muestra de voz.";
            if (err instanceof Error && err.name === 'NotAllowedError') {
                userMessage += "\n\nEl navegador bloqueó la reproducción. Por favor, haz clic en cualquier lugar de la página y vuelve a intentarlo.";
            } else if (err instanceof Error) {
                userMessage += `\nDetalles: ${err.message}`;
            }
            alert(userMessage);
        } finally {
            setIsTestingVoice(false);
        }
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const savedDJ: ResidentDJ = {
            id: dj?.id || crypto.randomUUID(),
            name: name.trim(),
            persona: selectedPersona,
            dna,
            voiceLanguage,
            voiceId,
            voiceEngine,
        };
        onSave(savedDJ);
    };

    return (
        <div className="max-w-4xl mx-auto animate-[fade-in_0.5s]">
            <div className="flex justify-start mb-6">
                 <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold bg-slate-800/50 hover:bg-slate-700/80 px-4 py-2 rounded-lg transition-colors"><ArrowLeft size={16}/> Volver a la Bóveda</button>
            </div>
            <form onSubmit={handleSubmit} className="w-full bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm">
                <div className="p-8">
                    <h2 className="text-3xl font-bold mb-2">{dj ? `DJ Studio: ${dj.name}`: 'Creando Nuevo DJ'}</h2>
                    <p className="text-slate-400">Define la esencia y la voz de tu compañero musical.</p>
                </div>
                
                 <div className="flex border-b border-slate-700 px-8">
                    <button type="button" onClick={() => setActiveTab('persona')} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'persona' ? 'text-purple-300 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white border-b-2 border-transparent'}`}><User size={16}/> Personalidad</button>
                    <button type="button" onClick={() => setActiveTab('voicelab')} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'voicelab' ? 'text-purple-300 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white border-b-2 border-transparent'}`}><TestTube2 size={16}/> Laboratorio de Voz</button>
                </div>

                <div className="p-8 space-y-6">
                    {activeTab === 'persona' && (
                        <div className="animate-[fade-in_0.3s] space-y-6">
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
                                <DNASlider label="Energía" value={dna.energy} onChange={v => handleDnaChange('energy', v)} minLabel="Chill" maxLabel="Extremo" icon={Zap} />
                                <DNASlider label="Nivel de Sabelotodo" value={dna.knowledge} onChange={v => handleDnaChange('knowledge', v)} minLabel="Cero Datos" maxLabel="Enciclopedia" icon={BrainCircuit} />
                                <DNASlider label="Tono" value={dna.tone} onChange={v => handleDnaChange('tone', v)} minLabel="Amistoso" maxLabel="Provocador" icon={Heart} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'voicelab' && (
                         <div className="animate-[fade-in_0.3s] space-y-6">
                            <p className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-md flex items-center gap-2"><Bot size={28}/>El motor de voz generativo de Puter.js (basado en Amazon Polly) ofrece la máxima calidad.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="voice-lang" className="block text-sm font-medium text-slate-300 mb-2">Idioma y Región</label>
                                    <select id="voice-lang" value={voiceLanguage} onChange={(e) => setVoiceLanguage(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg w-full p-3 appearance-none">
                                        {AMAZON_POLLY_VOICES.map(lang => (<option key={lang.langCode} value={lang.langCode}>{lang.langName}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="voice-id" className="block text-sm font-medium text-slate-300 mb-2">Voz Específica</label>
                                    <select id="voice-id" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg w-full p-3 appearance-none" disabled={availableVoices.length === 0}>
                                        {availableVoices.map(v => (<option key={v.voiceId} value={v.voiceId}>{v.name} ({v.gender})</option>))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2 items-center justify-center">
                                <button type="button" onClick={testVoice} disabled={isTestingVoice} className="bg-slate-700 h-12 px-6 rounded-lg hover:bg-slate-600 flex items-center justify-center disabled:bg-slate-800 disabled:cursor-wait">
                                    {isTestingVoice ? <LoaderCircle size={20} className="animate-spin" /> : 'Probar Voz'}
                                </button>
                            </div>
                             <div className="space-y-4 pt-4 border-t border-slate-700">
                                <h3 className="font-semibold text-lg text-center">Ajustes Finos de Voz</h3>
                                <DNASlider label="Ritmo" value={dna.pace} onChange={v => handleDnaChange('pace', v)} minLabel="Lento" maxLabel="Rápido" icon={SlidersHorizontal} />
                                <DNASlider label="Tono de Voz" value={dna.pitch} onChange={v => handleDnaChange('pitch', v)} minLabel="Grave" maxLabel="Agudo" icon={ChevronsUpDown} />
                             </div>
                         </div>
                    )}
                </div>

                <div className="p-8 border-t border-slate-700">
                    <button type="submit" disabled={!name.trim()} className="w-full bg-purple-600 text-white font-bold py-3 text-lg rounded-lg transition-all shadow-[0_4px_14px_0_rgb(124,58,237,39%)] hover:shadow-[0_6px_20px_0_rgb(124,58,237,23%)] hover:bg-purple-500 disabled:bg-slate-600 disabled:shadow-none flex items-center justify-center gap-2">
                        <Save size={20}/> {dj ? 'Guardar Cambios' : 'Crear DJ'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DJEditor;