import React, { useState, useRef } from 'react';
import { ArrowLeft, User, ChevronRight, Edit, BookOpen, Users, Upload, Download, AlertTriangle, Save, LoaderCircle, Camera, Trash2 } from 'lucide-react';
import { AppState, ResidentDJ } from '../types';
import * as userService from '../services/userService';
import * as migrationService from '../services/migrationService';

declare var puter: any;

interface ProfileSettingsProps {
    onBack: () => void;
    user: any;
    setUser: (user: any) => void;
    onLogout: () => void;
    activeDJ: ResidentDJ | null;
    setAppState: (state: AppState) => void;
    onEditDJ: (dj: ResidentDJ) => void;
    onImport: () => void;
    onExportAll: () => void;
}

const SettingsCard = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
        {children}
    </div>
);

const EditProfileModal = ({ user, setUser, onClose }: { user: any, setUser: (u: any) => void, onClose: () => void }) => {
    const [newUsername, setNewUsername] = useState(user.username);
    const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState(user.photoURL || null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setNewAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        try {
            const updatedUser = await userService.updateProfile(user, { newUsername, newAvatarFile });
            setUser(updatedUser);
            onClose();
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'No se pudo guardar el perfil.');
        } finally {
            setIsSaving(false);
        }
    };

    const userAvatar = avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username[0] || 'A')}&background=a855f7&color=fff&size=128`;

    return (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-xl animate-[fade-in_0.2s]" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-6">Editar Perfil</h3>
                <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                        <img src={userAvatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover ring-4 ring-slate-700"/>
                        <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera size={24} className="text-white"/>
                        </button>
                         <input type="file" ref={fileInputRef} accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    </div>
                     <div>
                        <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">Nombre de Usuario</label>
                        <input type="text" id="username" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5 text-center"/>
                    </div>
                </div>
                 {error && <p className="mt-4 text-center text-red-400 text-sm">{error}</p>}
                <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-700">
                    <button type="button" onClick={onClose} className="bg-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-600">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-purple-600 font-bold py-2 px-4 rounded-lg hover:bg-purple-500 disabled:bg-slate-600 flex items-center gap-2">
                        {isSaving ? <LoaderCircle size={20} className="animate-spin" /> : <Save size={20}/>}
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

const DeleteDataModal = ({ username, onConfirm, onCancel }: { username: string, onConfirm: () => void, onCancel: () => void }) => {
    const [confirmationText, setConfirmationText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    
    const handleConfirm = async () => {
        setIsDeleting(true);
        await onConfirm();
        setIsDeleting(false);
    }

    return (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onCancel}>
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-red-500/50 shadow-xl animate-[fade-in_0.2s]" onClick={e => e.stopPropagation()}>
                 <div className="text-center">
                    <AlertTriangle size={40} className="text-red-400 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold">¿Estás absolutamente seguro?</h3>
                </div>
                <p className="text-sm text-slate-400 mt-4">
                    Esta acción es irreversible. Se eliminarán permanentemente todos tus DJs, el historial de escucha, las preferencias y los metadatos de tu librería de AI Radio.
                    <b className="block mt-2">Tus archivos de audio locales también serán borrados de este navegador.</b>
                    Esta acción no eliminará tu cuenta de Puter.
                </p>
                <div className="mt-4">
                    <label className="text-xs font-semibold">Para confirmar, escribe <span className="text-red-300 font-bold">{username}</span></label>
                    <input 
                        type="text" 
                        value={confirmationText}
                        onChange={e => setConfirmationText(e.target.value)}
                        className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5 mt-1"
                    />
                </div>
                <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-700">
                    <button type="button" onClick={onCancel} className="bg-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-600">Cancelar</button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={isDeleting || confirmationText !== username} 
                        className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-500 disabled:bg-red-800/50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isDeleting ? <LoaderCircle size={20} className="animate-spin" /> : <Trash2 size={20}/>}
                        Entiendo, borrar todo
                    </button>
                </div>
            </div>
         </div>
    );
};

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onBack, user, setUser, onLogout, activeDJ, setAppState, onEditDJ, onImport, onExportAll }) => {
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    const handleDeleteAllData = async () => {
        try {
            await migrationService.deleteAllUserData();
            alert("Todos los datos de AI Radio han sido eliminados.");
            onLogout();
        } catch (e) {
            console.error("Error deleting user data:", e);
            alert("No se pudieron eliminar los datos. Inténtalo de nuevo.");
        }
    };

    const userAvatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username[0] || 'A')}&background=a855f7&color=fff`;

    const renderProfile = () => (
        <SettingsCard>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Perfil Público</h3>
                <button onClick={() => setProfileModalOpen(true)} className="flex items-center gap-1 text-sm font-semibold bg-slate-700 hover:bg-slate-600/80 px-3 py-1.5 rounded-lg transition-colors">
                    <Edit size={14}/> Editar Perfil
                </button>
            </div>
            <div className="flex items-center gap-4">
                <img src={userAvatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover ring-4 ring-slate-700"/>
                <div>
                    <h3 className="text-xl font-bold">{user.username}</h3>
                    <p className="text-sm text-slate-400">Usuario de AI Radio</p>
                </div>
            </div>
        </SettingsCard>
    );

    const renderDJSettings = () => (
        <SettingsCard>
            <h3 className="text-xl font-bold mb-4">Ajustes del DJ</h3>
            {activeDJ ? (
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-slate-400">DJ en turno</p>
                        <p className="text-lg font-semibold">{activeDJ.name}</p>
                    </div>
                    <button onClick={() => activeDJ && onEditDJ(activeDJ)} className="w-full text-left p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center gap-3"><Edit size={20} className="text-purple-400"/><span>Editar Personalidad y Voz</span></div>
                        <ChevronRight size={20}/>
                    </button>
                     <button onClick={() => setAppState(AppState.DJ_DIARY)} className="w-full text-left p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center gap-3"><BookOpen size={20} className="text-purple-400"/><span>Ver Diario del DJ</span></div>
                        <ChevronRight size={20}/>
                    </button>
                    <button onClick={() => setAppState(AppState.DJ_VAULT)} className="w-full text-left p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center gap-3"><Users size={20} className="text-purple-400"/><span>Gestionar Bóveda de DJs</span></div>
                        <ChevronRight size={20}/>
                    </button>
                </div>
            ) : <p className="text-slate-400">No hay ningún DJ activo.</p>}
        </SettingsCard>
    );
    
    const renderAccountSettings = () => (
        <SettingsCard>
            <h3 className="text-xl font-bold mb-4">Cuenta y Datos</h3>
            <p className="text-sm text-slate-400 mb-4">Gestiona la información de tu cuenta. Los respaldos guardan tus DJs, librería (solo metadatos), historial y preferencias, pero no los archivos de audio locales.</p>
             <div className="flex gap-4">
                <button onClick={onImport} className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600/80 px-4 py-3 rounded-lg transition-colors"><Upload size={16}/> Importar Respaldo</button>
                <button onClick={onExportAll} className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600/80 px-4 py-3 rounded-lg transition-colors"><Download size={16}/> Exportar Respaldo</button>
            </div>
             <div className="border-t border-slate-700 mt-6 pt-4">
                <h4 className="font-semibold text-red-400">Zona de Peligro</h4>
                 <button onClick={() => setDeleteModalOpen(true)} className="mt-2 w-full text-left p-3 rounded-lg flex justify-between items-center bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors">
                    <div className="flex items-center gap-3"><AlertTriangle size={20}/><span>Eliminar Datos de la Aplicación</span></div>
                    <ChevronRight size={20}/>
                </button>
            </div>
        </SettingsCard>
    );


    return (
        <div className="animate-[fade-in_0.5s] max-w-4xl mx-auto">
            {isProfileModalOpen && <EditProfileModal user={user} setUser={setUser} onClose={() => setProfileModalOpen(false)} />}
            {isDeleteModalOpen && <DeleteDataModal username={user.username} onCancel={() => setDeleteModalOpen(false)} onConfirm={handleDeleteAllData} />}

            <div className="flex justify-start mb-6">
                 <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold bg-slate-800/50 hover:bg-slate-700/80 px-4 py-2 rounded-lg transition-colors">
                    <ArrowLeft size={16}/> Volver a la Estación
                </button>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <h2 className="text-2xl font-bold mb-6">Perfil y Ajustes</h2>
                <div className="space-y-6">
                    {renderProfile()}
                    {renderDJSettings()}
                    {renderAccountSettings()}
                </div>
            </div>
        </div>
    );
};
export default ProfileSettings;