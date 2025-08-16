

import React from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react';

interface FriendsProps {
    onBack: () => void;
}

const Friends: React.FC<FriendsProps> = ({ onBack }) => {
    return (
        <div className="animate-[fade-in_0.5s] max-w-4xl mx-auto">
            <div className="flex justify-start mb-6">
                 <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold bg-slate-800/50 hover:bg-slate-700/80 px-4 py-2 rounded-lg transition-colors">
                    <ArrowLeft size={16}/> Volver a la Estación
                </button>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <h2 className="text-2xl font-bold mb-4">Amigos</h2>
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Añadir Amigo</h3>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Nombre de usuario de Puter..." className="bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm w-full sm:w-64" />
                            <button className="flex items-center gap-2 bg-purple-600 font-semibold py-2 px-4 rounded-lg hover:bg-purple-500"><UserPlus size={20}/></button>
                        </div>
                    </div>
                    <div className="border-t border-slate-700 pt-4">
                        <h3 className="text-lg font-semibold mb-2">Solicitudes Pendientes (0)</h3>
                        <p className="text-sm text-slate-500">No tienes solicitudes pendientes.</p>
                    </div>
                    <div className="border-t border-slate-700 pt-4">
                        <h3 className="text-lg font-semibold mb-2">Mis Amigos (0)</h3>
                        <p className="text-sm text-slate-500">Tu lista de amigos está vacía.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Friends;
