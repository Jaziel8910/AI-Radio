
import React, { useState, useEffect } from 'react';
import { ResidentDJ } from '../types';
import * as libraryService from '../services/libraryService';
import { Database, ArrowRight, Trash2, LoaderCircle } from 'lucide-react';

interface AccountRecoveryProps {
    user: any;
    djs: ResidentDJ[];
    onContinue: () => void;
    onStartOver: () => void;
}

const AccountRecovery: React.FC<AccountRecoveryProps> = ({ user, djs, onContinue, onStartOver }) => {
    const [librarySize, setLibrarySize] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLibrarySize = async () => {
            const songs = await libraryService.getAllSongs();
            setLibrarySize(songs.length);
            setIsLoading(false);
        };
        fetchLibrarySize();
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4 animate-[fade-in_0.5s]">
            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 max-w-2xl w-full">
                <Database size={48} className="text-purple-400 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white">¡Te damos la bienvenida de nuevo, {user.username}!</h2>
                <p className="text-slate-300 mt-2">Hemos encontrado datos existentes en tu cuenta de AI Radio.</p>

                {isLoading ? (
                    <div className="my-6">
                        <LoaderCircle className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
                        <p className="text-sm text-slate-400 mt-2">Analizando tus datos...</p>
                    </div>
                ) : (
                    <div className="my-6 bg-slate-900/50 p-4 rounded-lg text-left">
                        <p className="font-semibold text-lg">Resumen de la cuenta:</p>
                        <ul className="list-disc list-inside text-slate-300 mt-2 space-y-1">
                            <li><span className="font-bold">{djs.length}</span> {djs.length === 1 ? 'DJ Residente' : 'DJs Residentes'}</li>
                            <li><span className="font-bold">{librarySize}</span> {librarySize === 1 ? 'canción' : 'canciones'} en la librería</li>
                        </ul>
                         <p className="text-xs text-slate-500 mt-3">Tus DJs encontrados: {djs.slice(0, 3).map(d => d.name).join(', ')}{djs.length > 3 ? '...' : ''}</p>
                    </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                    <button 
                        onClick={onContinue}
                        disabled={isLoading}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 font-bold py-3 px-6 text-lg rounded-lg transition-all shadow-[0_4px_14px_0_rgb(124,58,237,39%)] hover:shadow-[0_6px_20px_0_rgb(124,58,237,23%)] hover:bg-purple-500 disabled:bg-slate-600"
                    >
                        Continuar con mis datos <ArrowRight size={20} />
                    </button>
                    <button
                        onClick={onStartOver}
                        disabled={isLoading}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-700 font-semibold py-3 px-6 rounded-lg hover:bg-red-900/80 hover:text-red-300 transition-colors disabled:bg-slate-800"
                    >
                        <Trash2 size={18}/> Empezar de Cero
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountRecovery;
