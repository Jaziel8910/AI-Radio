

import React, { useState, useMemo } from 'react';
import { DJ_PERSONAS, DJ_PERSONA_CATEGORIES } from '../constants';
import { DJPersona, ResidentDJ } from '../types';
import { Sparkles, User, ChevronRight, ChevronLeft, Check, Upload } from 'lucide-react';

interface OnboardingProps {
    onHire: (dj: ResidentDJ) => void;
    onImport: () => void;
    error: string | null;
}

const Onboarding: React.FC<OnboardingProps> = ({ onHire, onImport, error }) => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [selectedPersona, setSelectedPersona] = useState<DJPersona | null>(null);
    const [activeCategory, setActiveCategory] = useState('Todos');

    const handleSubmit = () => {
        if (name.trim() && selectedPersona) {
            const newDJ: ResidentDJ = {
                id: crypto.randomUUID(),
                name: name.trim(),
                persona: selectedPersona,
                dna: { humor: 0, energy: 0, knowledge: 0, tone: 0 },
                voiceLanguage: 'es-ES',
                voiceEngine: 'neural',
            };
            onHire(newDJ);
        }
    };

    const filteredPersonas = useMemo(() => {
        if (activeCategory === 'Todos') return DJ_PERSONAS;
        return DJ_PERSONAS.filter(p => p.category === activeCategory);
    }, [activeCategory]);
    
    const ProgressBar = () => (
        <div className="w-full max-w-sm mx-auto my-8">
            <div className="flex justify-between items-center text-sm font-bold">
                <span className={step >= 1 ? 'text-purple-300' : 'text-slate-500'}>Nombre</span>
                <span className={step >= 2 ? 'text-purple-300' : 'text-slate-500'}>Personalidad</span>
                <span className={step >= 3 ? 'text-purple-300' : 'text-slate-500'}>Confirmar</span>
            </div>
            <div className="bg-slate-700 h-1.5 rounded-full mt-2 relative">
                <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
            </div>
        </div>
    );
    
    const renderStep1 = () => (
        <div className="w-full max-w-lg text-center animate-[fade-in_0.5s]">
            <h3 className="text-3xl font-bold text-white mb-2">Crea tu Compañero de IA</h3>
            <p className="text-slate-400 mb-8">Dale un nombre para empezar a construir su personalidad.</p>
             <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                <input
                    type="text"
                    id="dj-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Alex, La Jefa, El Capi..."
                    required
                    className="bg-slate-900 border-2 border-slate-600 focus:border-purple-500 focus:ring-purple-500 rounded-lg w-full p-4 pl-14 text-xl"
                    autoFocus
                />
            </div>
            <button
                onClick={() => setStep(2)}
                disabled={!name.trim()}
                className="w-full mt-6 bg-purple-600 text-white font-bold py-3 text-lg rounded-lg transition-all shadow-[0_4px_14px_0_rgb(124,58,237,39%)] hover:shadow-[0_6px_20px_0_rgb(124,58,237,23%)] hover:bg-purple-500 disabled:bg-slate-600 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                Siguiente <ChevronRight size={20} />
            </button>
        </div>
    );
    
    const renderStep2 = () => (
        <div className="w-full max-w-4xl animate-[fade-in_0.5s]">
            <h3 className="text-3xl font-bold text-white text-center mb-2">Elige una Personalidad Base</h3>
            <p className="text-slate-400 text-center mb-6">Esta será su voz y su estilo inicial. Podrás ajustarlo y crear más DJs después.</p>
            
            <div className="flex flex-wrap justify-center gap-2 mb-6">
                {DJ_PERSONA_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-1.5 text-sm font-semibold rounded-full border-2 transition-colors ${activeCategory === cat ? 'bg-purple-500 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-300'}`}>
                        {cat}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[50vh] overflow-y-auto p-2">
                {filteredPersonas.map(persona => (
                    <div
                        key={persona.name}
                        onClick={() => setSelectedPersona(persona)}
                        className={`relative group bg-slate-800 rounded-lg p-4 text-center border cursor-pointer transition-all duration-200 ${selectedPersona?.name === persona.name ? 'ring-2 ring-purple-500 scale-105 shadow-lg shadow-purple-900/50 border-transparent' : 'border-slate-700 hover:border-slate-600'}`}
                    >
                        {selectedPersona?.name === persona.name && <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full p-1"><Check size={14}/></div>}
                        <h4 className="font-bold text-white">{persona.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-3">{persona.style}</p>
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                           <p className="text-xs p-4">{persona.style}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center mt-8">
                <button onClick={() => setStep(1)} className="bg-slate-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-600 flex items-center gap-2"><ChevronLeft size={20} /> Atrás</button>
                <button onClick={() => setStep(3)} disabled={!selectedPersona} className="bg-purple-600 text-white font-bold py-3 px-6 rounded-lg disabled:bg-slate-600 flex items-center gap-2">Siguiente <ChevronRight size={20} /></button>
            </div>
        </div>
    );

    const renderStep3 = () => (
         <div className="w-full max-w-lg text-center animate-[fade-in_0.5s]">
            <h3 className="text-3xl font-bold text-white mb-2">¡Casi Listo!</h3>
            <p className="text-slate-400 mb-8">Revisa tu nuevo DJ. Si todo está bien, dale la bienvenida a la cabina.</p>

            <div className="bg-slate-800/50 p-6 rounded-2xl border-2 border-purple-500/50 text-left space-y-4">
                <div>
                    <span className="text-sm font-semibold text-slate-400">NOMBRE</span>
                    <p className="text-2xl font-bold text-white">{name}</p>
                </div>
                <div>
                    <span className="text-sm font-semibold text-slate-400">PERSONALIDAD</span>
                    <h4 className="text-xl font-bold text-purple-300">{selectedPersona?.name}</h4>
                    <p className="text-sm text-slate-300 mt-1">{selectedPersona?.style}</p>
                </div>
            </div>
             {error && <p className="mt-4 bg-red-500/10 text-red-400 text-sm p-3 rounded-lg border border-red-500/20">{error}</p>}

             <div className="flex justify-between items-center mt-8">
                <button onClick={() => setStep(2)} className="bg-slate-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-600 flex items-center gap-2"><ChevronLeft size={20} /> Atrás</button>
                <button onClick={handleSubmit} className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-[0_4px_14px_0_rgb(34,197,94,39%)] hover:shadow-[0_6px_20px_0_rgb(34,197,94,23%)] hover:bg-green-500 flex items-center gap-2">¡Contratar a mi DJ!</button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col items-center justify-center p-4 min-h-[80vh]">
            <div className="w-full max-w-4xl text-center mb-4">
                <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h2 className="text-4xl md:text-5xl font-black text-white">Contrata a tu Primer DJ</h2>
                 <ProgressBar />
            </div>
            
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            <div className="mt-12 border-t border-slate-700 w-full max-w-lg pt-6 text-center">
                <p className="text-slate-400">¿Ya tienes una cuenta o un archivo de respaldo?</p>
                <button onClick={onImport} className="mt-2 flex items-center justify-center gap-2 w-full max-w-sm mx-auto text-sm font-semibold bg-slate-800/50 hover:bg-slate-700/80 px-4 py-2 rounded-lg transition-colors">
                    <Upload size={16}/> Importar desde archivo
                </button>
            </div>
        </div>
    );
};

export default Onboarding;
