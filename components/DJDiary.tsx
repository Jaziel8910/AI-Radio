
import React, { useState, useEffect } from 'react';
import { ResidentDJ, DJDiaryEntry, SongMetadata } from '../types';
import { getDiaryEntries, getDiaryStats, DiaryStats } from '../services/diaryService';
import { ArrowLeft, BookHeart, Bot, BrainCircuit, Calendar, Clock, Cloud, Music, Star, MicVocal } from 'lucide-react';
import Loader from './Loader';

// A simple SVG Radar Chart component
const RadarChart = ({ data }: { data: { label: string, value: number }[] }) => {
    if (!data || data.length === 0) return <div className="text-center text-sm text-slate-400">No hay datos de género todavía.</div>;

    const size = 200;
    const center = size / 2;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const angleSlice = (Math.PI * 2) / data.length;

    const points = data.map((d, i) => {
        const value = d.value || 0;
        const ratio = value / maxVal;
        const angle = angleSlice * i - Math.PI / 2;
        const x = center + center * 0.8 * ratio * Math.cos(angle);
        const y = center + center * 0.8 * ratio * Math.sin(angle);
        return `${x},${y}`;
    }).join(' ');

    const labels = data.map((d, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const x = center + center * 0.95 * Math.cos(angle);
        const y = center + center * 0.95 * Math.sin(angle);
        return <text key={i} x={x} y={y} fontSize="10" fill="#a0aec0" textAnchor="middle" dominantBaseline="middle">{d.label}</text>;
    });

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-[200px] mx-auto">
            <polygon points={points} fill="rgba(167, 139, 250, 0.4)" stroke="#a78bfa" strokeWidth="2" />
            {labels}
        </svg>
    );
};

const ActivityClock = ({ data }: { data: { hour: number, value: number }[] }) => {
    if (!data || data.length === 0) return <div className="text-center text-sm text-slate-400">No hay datos de actividad.</div>;
    const size = 200;
    const center = size / 2;
    const radius = center * 0.8;
    const maxVal = Math.max(...data.map(d => d.value), 1);

    const bars = data.map(({ hour, value }) => {
        const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
        const barHeight = (value / maxVal) * (center - radius) * 0.9;
        const x1 = center + radius * Math.cos(angle);
        const y1 = center + radius * Math.sin(angle);
        const x2 = center + (radius + barHeight) * Math.cos(angle);
        const y2 = center + (radius + barHeight) * Math.sin(angle);
        return <line key={hour} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" />
    });
    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-[200px] mx-auto">
            <circle cx={center} cy={center} r={radius} fill="none" stroke="#4a5568" strokeWidth="1" />
            {bars}
        </svg>
    );
};

interface DJDiaryProps {
    dj: ResidentDJ;
    onBack: () => void;
}

const DJDiary: React.FC<DJDiaryProps> = ({ dj, onBack }) => {
    const [entries, setEntries] = useState<DJDiaryEntry[]>([]);
    const [stats, setStats] = useState<DiaryStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const diaryEntries = getDiaryEntries(dj.id);
            const diaryStats = await getDiaryStats();
            setEntries(diaryEntries);
            setStats(diaryStats);
            setIsLoading(false);
        };
        fetchData();
    }, [dj.id]);

    if (isLoading) {
        return <Loader text={`Accediendo a los archivos secretos de ${dj.name}...`} />;
    }
    
    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
    
    const renderMemory = (song: SongMetadata, title: string) => (
        song ? <div className="bg-slate-900/50 p-3 rounded-lg flex items-center gap-3">
             <img src={song.picture || `https://ui-avatars.com/api/?name=${song.title[0]}&background=4338CA&color=fff`} alt="album" className="w-12 h-12 rounded-md object-cover flex-shrink-0"/>
            <div>
                <p className="text-xs text-purple-300 font-semibold">{title}</p>
                <p className="font-bold text-sm text-white truncate">{song.title}</p>
                <p className="text-xs text-slate-400 truncate">{song.artist}</p>
            </div>
        </div> : null
    );

    return (
        <div className="animate-[fade-in_0.5s] max-w-7xl mx-auto">
             <div className="flex justify-start mb-6">
                 <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold bg-slate-800/50 hover:bg-slate-700/80 px-4 py-2 rounded-lg transition-colors"><ArrowLeft size={16}/> Volver a la Estación</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Wall of Thoughts */}
                <div className="lg:col-span-2 bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-3"><Bot size={24} className="text-purple-400"/> El Muro de los Pensamientos</h2>
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-3">
                        {entries.length > 0 ? entries.map(entry => (
                            <div key={entry.timestamp} className="bg-slate-900/70 p-4 rounded-xl border border-slate-700">
                                <p className="text-sm text-slate-200 italic">"{entry.content}"</p>
                                <p className="text-xs text-slate-500 text-right mt-2">{formatDate(entry.timestamp)}</p>
                            </div>
                        )) : (
                            <div className="text-center py-10 text-slate-400">
                                <p>El diario está vacío.</p>
                                <p className="text-sm">Termina una sesión para que {dj.name} escriba su primera entrada.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Psychoanalysis & Memory Box */}
                <div className="space-y-6">
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                         <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><BrainCircuit size={20} className="text-purple-400"/> Psicoanálisis Musical</h3>
                         <div className="grid grid-cols-2 gap-6 text-center">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center justify-center gap-1.5"><Music size={14}/> Radar de Géneros</h4>
                                <RadarChart data={stats?.genreRadar || []} />
                            </div>
                             <div>
                                <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center justify-center gap-1.5"><Clock size={14}/> Reloj de Actividad</h4>
                                <ActivityClock data={stats?.activityClock || []} />
                            </div>
                         </div>
                         <div className="mt-6">
                             <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center justify-center gap-1.5"><MicVocal size={14}/> Artistas Clave</h4>
                              <div className="flex flex-wrap justify-center gap-2">
                                {stats?.keywordCloud && stats.keywordCloud.length > 0 ? stats.keywordCloud.map(item => (
                                    <span key={item.text} className="bg-slate-700/50 text-slate-300 text-xs font-semibold px-2 py-1 rounded-md">{item.text}</span>
                                )) : <p className="text-xs text-slate-500">Aún no hay datos.</p>}
                            </div>
                         </div>
                    </div>
                    
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><BookHeart size={20} className="text-purple-400"/> La Caja de los Recuerdos</h3>
                        <div className="space-y-3">
                           {renderMemory(stats?.memoryBox.firstFavorite!, 'Nuestro Primer Hit')}
                           {stats?.memoryBox.safeBets.map((song, i) => renderMemory(song, `Apuesta Segura #${i+1}`))}
                           {!stats?.memoryBox.firstFavorite && stats?.memoryBox.safeBets.length === 0 && <p className="text-xs text-slate-500 text-center py-4">Aún no hemos creado grandes recuerdos. ¡Dale a 'me gusta' a una canción!</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DJDiary;
