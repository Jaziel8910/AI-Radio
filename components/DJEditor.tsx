

import React, { useState, useEffect } from 'react';
import { ResidentDJ, DJPersona, DJDNA } from '../types';
import { DJ_PERSONAS, PUTER_LANGUAGES } from '../constants';
import { User, Mic, Save, ArrowLeft, BrainCircuit, Heart, Zap, Annoyed, Volume2, FastForward, GitCommitHorizontal, Bot, LoaderCircle } from 'lucide-react';

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
    const [dna, setDna] = useState<DJDNA>(dj?.dna || { humor: 0, energy: 0, knowledge: 0, tone: 0 });
    
    const [voiceEngine, setVoiceEngine] = useState(dj?.voiceEngine || 'generative');
    const [voiceLanguage, setVoiceLanguage] = useState(dj?.voiceLanguage || 'es-ES');
    const [isTestingVoice, setIsTestingVoice] = useState(false);

    const handleDnaChange = (field: keyof DJDNA, value: number) => {
        setDna(prev => ({ ...prev, [field]: value }));
    };

    const testVoice = async () => {
        if (typeof puter === 'undefined' || !puter.ai || !puter.ai.txt2speech) {
            alert("Puter.js no está disponible. Asegúrate de que estás conectado a internet y que el script se ha cargado correctamente.");
            return;
        }
        setIsTestingVoice(true);
        try {
            const djName = name.trim() || "tu DJ";
            const text = `Hola, soy ${djName} y estoy probando mi nueva voz en AI Radio.`;
            const audio = await puter.ai.txt2speech(text, {
                language: voiceLanguage,
                engine: voiceEngine,
            });
    
            // Wrap playback in a promise to await its completion
            await new Promise<void>((resolve, reject) => {
                audio.onended = () => resolve();
                audio.onerror = () => reject(new Error("Error al reproducir el archivo de audio."));
                audio.play().catch(reject);
            });
    
        } catch (err: any) {
            let errorDetails = "Ocurrió un error desconocido.";
            
            // Log the raw error to the console for debugging
            console.error("Error al probar la voz (raw):", err);

            if (err instanceof Error) {
                // For DOMException and other Error types
                errorDetails = `${err.name}: ${err.message}`;
            } else if (err && typeof err === 'object') {
                // For other objects, try to extract a message or stringify
                if (err.message) {
                    errorDetails = String(err.message);
                } else {
                    try {
                        errorDetails = JSON.stringify(err);
                    } catch (e) {
                        errorDetails = "El objeto de error no se puede mostrar (posiblemente una referencia circular).";
                    }
                }
            } else if (err) {
                // For primitive types
                errorDetails = String(err);
            }
            
            let userMessage = `No se pudo generar la muestra de voz.\nDetalles: ${errorDetails}`;

            // Add specific advice for common errors
            if (err?.name === 'NotAllowedError' || (typeof errorDetails === 'string' && errorDetails.includes('NotAllowedError'))) {
                userMessage += "\n\nSugerencia: El navegador bloqueó la reproducción automática. Por favor, interactúa con la página (haz clic en cualquier lugar) y vuelve a intentarlo.";
            } else if (typeof errorDetails === 'string' && errorDetails.toLowerCase().includes('failed to fetch')) {
                userMessage += "\n\nSugerencia: Este error ('Failed to fetch') suele indicar un problema de red o permisos (CORS). Asegúrate de tener conexión a internet y que la aplicación se ejecuta en un entorno compatible (como Puter OS).";
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
            voiceEngine,
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
                    <DNASlider label="Energía" value={dna.energy} onChange={v => handleDnaChange('energy', v)} minLabel="Chill" maxLabel="Extremo" icon={Zap} />
                    <DNASlider label="Nivel de Sabelotodo" value={dna.knowledge} onChange={v => handleDnaChange('knowledge', v)} minLabel="Cero Datos" maxLabel="Enciclopedia" icon={BrainCircuit} />
                    <DNASlider label="Tono" value={dna.tone} onChange={v => handleDnaChange('tone', v)} minLabel="Amistoso" maxLabel="Provocador" icon={Heart} />
                </div>

                 <div className="space-y-4 pt-4 border-t border-slate-700">
                    <h3 className="font-semibold text-lg text-center">Ajustes de Voz (IA)</h3>
                     <p className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-md flex items-center gap-2"><Bot size={28}/>El motor Puter.js ofrece voces de IA de alta calidad.</p>
                     <div className="flex gap-2 items-end">
                        <div className="flex-grow">
                            <label htmlFor="puter-voice" className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2"><Volume2 size={16} className="text-purple-400"/> Idioma y Región</label>
                            <select id="puter-voice" value={voiceLanguage} onChange={(e) => setVoiceLanguage(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg w-full p-3 appearance-none">
                                {PUTER_LANGUAGES.map(lang => (<option key={lang.code} value={lang.code}>{lang.name}</option>))}
                            </select>
                        </div>
                        <button type="button" onClick={testVoice} disabled={isTestingVoice} className="bg-slate-700 h-12 px-4 rounded-lg hover:bg-slate-600 flex items-center justify-center disabled:bg-slate-800 disabled:cursor-wait">
                            {isTestingVoice ? <LoaderCircle size={20} className="animate-spin" /> : 'Probar'}
                        </button>
                     </div>
                     <div>
                        <label htmlFor="puter-engine" className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2"><BrainCircuit size={16} className="text-purple-400"/> Calidad del Motor</label>
                        <select id="puter-engine" value={voiceEngine} onChange={(e) => setVoiceEngine(e.target.value as any)} className="bg-slate-900 border border-slate-700 rounded-lg w-full p-3 appearance-none">
                            <option value="generative">Generativo (Recomendado)</option>
                            <option value="neural">Neural (Obsoleto)</option>
                            <option value="standard">Estándar (Obsoleto)</option>
                        </select>
                     </div>
                </div>


                <button type="submit" disabled={!name.trim()} className="w-full bg-purple-600 text-white font-bold py-3 text-lg rounded-lg transition-all shadow-[0_4px_14px_0_rgb(124,58,237,39%)] hover:shadow-[0_6px_20px_0_rgb(124,58,237,23%)] hover:bg-purple-500 disabled:bg-slate-600 disabled:shadow-none flex items-center justify-center gap-2">
                    <Save size={20}/> {dj ? 'Guardar Cambios' : 'Crear DJ'}
                </button>
            </form>
        </div>
    );
};

export default DJEditor;
