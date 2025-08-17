
import React from 'react';
import { ResidentDJ } from '../types';
import { User, Trash2, Edit, CheckCircle, PlusCircle, ArrowLeft, Copy, Upload, Download } from 'lucide-react';

interface DJVaultProps {
    djs: ResidentDJ[];
    activeDJId: string | null;
    onSelect: (djId: string) => void;
    onEdit: (dj: ResidentDJ) => void;
    onDelete: (djId: string) => void;
    onClone: (djId: string) => void;
    onAdd: () => void;
    onBack: () => void;
    onExportSingle: (djId: string) => void;
}

const DNABar = ({ value, label, colorClass }: { value: number, label: string, colorClass: string }) => {
    const width = (value + 1) / 2 * 100;
    return (
        <div className="w-full">
            <span className="text-xs text-slate-400">{label}</span>
            <div className="h-1.5 bg-slate-700 rounded-full w-full mt-1">
                <div className={`h-1.5 ${colorClass} rounded-full`} style={{ width: `${width}%` }}></div>
            </div>
        </div>
    )
};

const DJCard: React.FC<{ dj: ResidentDJ, isActive: boolean, onSelect: () => void, onEdit: () => void, onDelete: () => void, onClone: () => void, onExport: () => void }> = ({ dj, isActive, onSelect, onEdit, onDelete, onClone, onExport }) => {
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`¿Seguro que quieres borrar a ${dj.name}? Esta acción no se puede deshacer.`)) {
            onDelete();
        }
    }
    const handleClone = (e: React.MouseEvent) => { e.stopPropagation(); onClone(); }
    const handleEdit = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(); }
    const handleExport = (e: React.MouseEvent) => { e.stopPropagation(); onExport(); }
    
    return (
        <div className={`bg-slate-800/70 rounded-2xl p-5 border-2 transition-all flex flex-col ${isActive ? 'border-purple-500 shadow-lg shadow-purple-500/10' : 'border-slate-700 hover:border-slate-600'}`}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-white">{dj.name}</h3>
                    <p className="text-sm text-slate-400">{dj.persona.name}</p>
                </div>
                {isActive && <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300 bg-purple-500/10 px-2 py-1 rounded-full"><CheckCircle size={14}/> En Turno</div>}
            </div>
            
            <div className="mt-4 space-y-2 flex-grow">
                <DNABar value={dj.dna.humor} label="Humor" colorClass="bg-green-400"/>
                <DNABar value={dj.dna.energy} label="Energía" colorClass="bg-red-400"/>
                <DNABar value={dj.dna.knowledge} label="Profundidad" colorClass="bg-blue-400"/>
                <DNABar value={dj.dna.tone} label="Tono" colorClass="bg-yellow-400"/>
                <DNABar value={dj.dna.pace} label="Ritmo" colorClass="bg-teal-400"/>
                <DNABar value={dj.dna.pitch} label="Tono de Voz" colorClass="bg-orange-400"/>
            </div>

            <div className="mt-6 flex gap-2">
                <button onClick={onSelect} disabled={isActive} className="w-full bg-purple-600 font-semibold py-2 rounded-lg hover:bg-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed">Seleccionar</button>
                <button onClick={handleEdit} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg" aria-label="Editar DJ"><Edit size={20}/></button>
                <button onClick={handleClone} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg" aria-label="Clonar DJ"><Copy size={20}/></button>
                <button onClick={handleExport} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg" aria-label="Exportar Personalidad"><Download size={20}/></button>
                <button onClick={handleDelete} className="p-2 bg-red-900/50 hover:bg-red-900/80 text-red-300 rounded-lg" aria-label="Borrar DJ"><Trash2 size={20}/></button>
            </div>
        </div>
    );
};


const DJVault: React.FC<DJVaultProps> = ({ djs, activeDJId, onSelect, onEdit, onDelete, onClone, onAdd, onBack, onExportSingle }) => {
    
    return (
        <div className="animate-[fade-in_0.5s]">
            <div className="flex justify-start mb-6">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold bg-slate-800/50 hover:bg-slate-700/80 px-4 py-2 rounded-lg transition-colors"><ArrowLeft size={16}/> Volver a la Estación</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {djs.map(dj => (
                    <DJCard 
                        key={dj.id}
                        dj={dj}
                        isActive={dj.id === activeDJId}
                        onSelect={() => onSelect(dj.id)}
                        onEdit={() => onEdit(dj)}
                        onDelete={() => onDelete(dj.id)}
                        onClone={() => onClone(dj.id)}
                        onExport={() => onExportSingle(dj.id)}
                    />
                ))}
                 <button onClick={onAdd} className="border-2 border-dashed border-slate-600 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-800/50 hover:border-slate-500 transition-all min-h-[280px]">
                    <PlusCircle size={48} className="mb-2"/>
                    <span className="font-bold text-lg">Crear Nuevo DJ</span>
                </button>
            </div>
        </div>
    );
};

export default DJVault;