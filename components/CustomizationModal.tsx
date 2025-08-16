import React, { useState } from 'react';
import { CustomizationOptions, LibrarySong, ResidentDJ, Intention, TimeOfDay } from '../types';
import { INTENTION_CONFIGS } from '../constants';
import { Check, X, SlidersHorizontal, Wand2 } from 'lucide-react';
import * as personalizationService from '../services/personalizationService';

interface CustomizationModalProps {
    dj: ResidentDJ;
    songs: LibrarySong[];
    intention: Intention;
    onConfirm: (songs: LibrarySong[], dj: ResidentDJ, options: CustomizationOptions) => void;
    onCancel: () => void;
}

const Slider = ({ label, value, onChange, min, max, step, minLabel, maxLabel }: { label: string, value: number, onChange: (v: number) => void, min: number, max: number, step: number, minLabel: string, maxLabel: string }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300">{label}: <span className="font-bold text-purple-300">{value.toFixed(2)}</span></label>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full progress-bar h-2 mt-1" />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{minLabel}</span>
            <span>{maxLabel}</span>
        </div>
    </div>
);

const Toggle = ({ label, checked, onChange, description }: { label: string, checked: boolean, onChange: (c: boolean) => void, description?: string }) => (
    <div className="flex items-center justify-between">
        <div>
            <label className="font-medium text-slate-200">{label}</label>
            {description && <p className="text-xs text-slate-400">{description}</p>}
        </div>
        <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${checked ? 'bg-purple-600' : 'bg-slate-600'}`}>
            <span aria-hidden="true" className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);


const CustomizationModal: React.FC<CustomizationModalProps> = ({ dj, songs, intention, onConfirm, onCancel }) => {
    const getInitialOptions = (): CustomizationOptions => {
        const baseOptions = INTENTION_CONFIGS[intention];
        return {
            djVoiceURI: dj.voiceURI, speechRate: dj.speechRate, speechPitch: dj.speechPitch,
            intention: intention,
            theme: baseOptions.theme || '',
            showContext: baseOptions.showContext || `Una sesión de ${songs.length} canciones con la intención de '${intention}'.`,
            audienceType: baseOptions.audienceType || 'Para el oyente habitual.',
            timeOfDay: baseOptions.timeOfDay || 'auto',
            mood: baseOptions.mood || { energy: 0, vibe: 0 },
            timeCapsuleYear: baseOptions.timeCapsuleYear || '',
            commentaryLength: baseOptions.commentaryLength || 'standard',
            commentaryPlacement: baseOptions.commentaryPlacement || 'varied',
            languageStyle: baseOptions.languageStyle || 'colloquial',
            includeCallIns: baseOptions.includeCallIns === true,
            mentionRelatedArtists: baseOptions.mentionRelatedArtists === true,
            adFrequency: baseOptions.adFrequency || 'low',
            customAds: baseOptions.customAds || '',
            includeJingles: baseOptions.includeJingles !== false,
            generateShowArt: baseOptions.generateShowArt !== false,
            negativeShowArtPrompt: baseOptions.negativeShowArtPrompt || '',
            visualizerStyle: baseOptions.visualizerStyle || 'bars',
            visualizerColorPalette: baseOptions.visualizerColorPalette || 'neon_purple',
            crossfadeDuration: baseOptions.crossfadeDuration || 1,
        };
    };

    const [options, setOptions] = useState<CustomizationOptions>(getInitialOptions());
    const [activeTab, setActiveTab] = useState('content');
    const [automationNotice, setAutomationNotice] = useState('');


    const handleChange = (key: keyof CustomizationOptions, value: any) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    };
    
    const handleMoodChange = (key: 'energy' | 'vibe', value: number) => {
        setOptions(prev => ({ ...prev, mood: { ...prev.mood, [key]: value } }));
    };

    const handleAutomate = () => {
        const automatedPrefs = personalizationService.getAutomatedOptions(intention);
        if (automatedPrefs) {
            const currentShowContext = `Una sesión de ${songs.length} canciones con la intención de '${intention}'.`;
            const newOptions = { ...getInitialOptions(), ...automatedPrefs, showContext: currentShowContext };
            setOptions(newOptions);
            
            setAutomationNotice('¡Preferencias automáticas aplicadas!');
            setTimeout(() => setAutomationNotice(''), 2500);
        } else {
            alert("Aún no has guardado preferencias para esta intención. ¡Crea un show y la IA aprenderá para la próxima!");
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        personalizationService.saveUserPreferences(intention, options);
        onConfirm(songs, dj, options);
    };

    const renderContentTab = () => (
        <div className="space-y-4">
            <h4 className="text-lg font-semibold text-purple-300">Contenido del Show</h4>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Tema Principal</label><input type="text" value={options.theme} onChange={e => handleChange('theme', e.target.value)} placeholder="Ej: Noche de rock clásico" className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"/></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Contexto (para el DJ)</label><textarea value={options.showContext} onChange={e => handleChange('showContext', e.target.value)} rows={2} placeholder="Ej: Para una cena con amigos" className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"/></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Público Objetivo</label><input type="text" value={options.audienceType} onChange={e => handleChange('audienceType', e.target.value)} placeholder="Ej: Fans de la música indie de los 90" className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"/></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Momento del Día</label><select value={options.timeOfDay} onChange={e => handleChange('timeOfDay', e.target.value as TimeOfDay)} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"><option value="auto">Automático</option><option value="madrugada">Madrugada</option><option value="mañana">Mañana</option><option value="tarde">Tarde</option><option value="noche">Noche</option></select></div>
                {intention === 'Nostalgia' && <div><label className="block text-sm font-medium text-slate-300 mb-1">Año "Time Capsule"</label><input type="text" value={options.timeCapsuleYear} onChange={e => handleChange('timeCapsuleYear', e.target.value)} placeholder="Ej: 1995" className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"/></div>}
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
                <Slider label="Energía" value={options.mood.energy} onChange={v => handleMoodChange('energy', v)} min={-1} max={1} step={0.1} minLabel="Calmado" maxLabel="Intenso" />
                <Slider label="Vibra" value={options.mood.vibe} onChange={v => handleMoodChange('vibe', v)} min={-1} max={1} step={0.1} minLabel="Melancólico" maxLabel="Feliz" />
            </div>
        </div>
    );
    
    const renderDJStyleTab = () => (
        <div className="space-y-4">
             <h4 className="text-lg font-semibold text-purple-300">Estilo del DJ</h4>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Duración Comentarios</label><select value={options.commentaryLength} onChange={e => handleChange('commentaryLength', e.target.value)} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"><option value="short">Cortos</option><option value="standard">Estándar</option><option value="long">Largos</option></select></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Posición Comentarios</label><select value={options.commentaryPlacement} onChange={e => handleChange('commentaryPlacement', e.target.value)} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"><option value="before">Antes</option><option value="intro">En la intro</option><option value="varied">Variado</option></select></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Estilo de Lenguaje</label><select value={options.languageStyle} onChange={e => handleChange('languageStyle', e.target.value)} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"><option value="formal">Formal</option><option value="colloquial">Coloquial</option><option value="poetic">Poético</option></select></div>
             </div>
            <Toggle label="Incluir llamadas de oyentes" checked={options.includeCallIns} onChange={c => handleChange('includeCallIns', c)} description="Simula llamadas de oyentes falsos."/>
            <Toggle label="Mencionar artistas relacionados" checked={options.mentionRelatedArtists} onChange={c => handleChange('mentionRelatedArtists', c)} description="El DJ conectará con artistas similares."/>
            <hr className="border-slate-700" />
            <h4 className="text-lg font-semibold text-purple-300">Anuncios y Jingles</h4>
             <div><label className="block text-sm font-medium text-slate-300 mb-1">Frecuencia de Anuncios</label><select value={options.adFrequency} onChange={e => handleChange('adFrequency', e.target.value)} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"><option value="none">Ninguna</option><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></div>
            {options.adFrequency !== 'none' && <div><label className="block text-sm font-medium text-slate-300 mb-1">Anuncios Personalizados (uno por línea)</label><textarea value={options.customAds} onChange={e => handleChange('customAds', e.target.value)} rows={3} placeholder="Si está vacío, la IA los inventará." className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"/></div>}
             <Toggle label="Incluir Jingles de la Estación" checked={options.includeJingles} onChange={c => handleChange('includeJingles', c)} />
        </div>
    );

    const renderVisualsTab = () => (
        <div className="space-y-4">
            <h4 className="text-lg font-semibold text-purple-300">Visuales y Audio</h4>
            <Toggle label="Generar Portada para el Show" checked={options.generateShowArt} onChange={c => handleChange('generateShowArt', c)} description="La IA creará una imagen única para la sesión." />
            {options.generateShowArt && <div><label className="block text-sm font-medium text-slate-300 mb-1">Prompt Negativo para la Portada</label><input type="text" value={options.negativeShowArtPrompt} onChange={e => handleChange('negativeShowArtPrompt', e.target.value)} placeholder="Ej: texto, caras, colores apagados" className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"/></div>}
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Estilo del Visualizador</label><select value={options.visualizerStyle} onChange={e => handleChange('visualizerStyle', e.target.value)} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"><option value="bars">Barras</option><option value="waveform">Onda</option><option value="circle">Círculo</option></select></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Paleta de Colores</label><select value={options.visualizerColorPalette} onChange={e => handleChange('visualizerColorPalette', e.target.value)} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"><option value="neon_purple">Neón Púrpura</option><option value="fire_ice">Fuego y Hielo</option><option value="emerald_forest">Bosque Esmeralda</option><option value="monochrome">Monocromático</option></select></div>
            </div>
            <Slider label="Duración de Crossfade" value={options.crossfadeDuration} onChange={v => handleChange('crossfadeDuration', v)} min={0} max={5} step={0.5} minLabel="0s" maxLabel="5s" />
        </div>
    );


    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onCancel} role="dialog" aria-modal="true">
            <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl w-full max-w-3xl border border-slate-700 shadow-xl animate-[fade-in_0.2s] flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 flex justify-between items-center border-b border-slate-700">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-3"><SlidersHorizontal size={24} className="text-purple-400"/> Personaliza tu Sesión</h3>
                        <p className="text-sm text-slate-400">Ajusta los detalles para la sesión de {dj.name} con {songs.length} canciones.</p>
                    </div>
                    <button type="button" onClick={onCancel} aria-label="Cerrar" className="p-2 -mr-2 text-slate-300 hover:text-white transition-colors rounded-full hover:bg-white/10"><X size={24} /></button>
                </div>

                <div className="flex-grow p-6 overflow-y-auto">
                     <div className="mb-6 border-b border-slate-700 flex flex-wrap">
                        <button type="button" onClick={() => setActiveTab('content')} className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'content' ? 'text-purple-300 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white border-b-2 border-transparent'}`}>Contenido</button>
                        <button type="button" onClick={() => setActiveTab('style')} className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'style' ? 'text-purple-300 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white border-b-2 border-transparent'}`}>Estilo DJ y Extras</button>
                        <button type="button" onClick={() => setActiveTab('visuals')} className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'visuals' ? 'text-purple-300 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white border-b-2 border-transparent'}`}>Visual y Audio</button>
                    </div>

                    {activeTab === 'content' && renderContentTab()}
                    {activeTab === 'style' && renderDJStyleTab()}
                    {activeTab === 'visuals' && renderVisualsTab()}
                </div>

                <div className="p-6 flex justify-between items-center gap-3 border-t border-slate-700 bg-slate-800/50 rounded-b-2xl">
                    <button type="button" onClick={handleAutomate} className="bg-slate-700/50 border border-slate-600 font-semibold py-2 px-4 rounded-lg hover:bg-slate-700 flex items-center gap-2 text-slate-300 hover:text-white transition-transform hover:scale-105">
                        <Wand2 size={18}/> Automatizar
                    </button>
                    <div className="relative flex items-center gap-3">
                        {automationNotice && <span className="text-sm text-purple-300 animate-[fade-in_0.3s]">{automationNotice}</span>}
                        <button type="button" onClick={onCancel} className="bg-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-600">Cancelar</button>
                        <button type="submit" className="bg-purple-600 font-bold py-2 px-4 rounded-lg hover:bg-purple-500 flex items-center gap-2"><Check size={20}/> ¡Crear Show!</button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CustomizationModal;
