
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, User, ChevronRight, Edit, BookOpen, Users, Upload, Download, AlertTriangle, Save, LoaderCircle, Camera, Trash2, SlidersHorizontal, Info, Settings, RefreshCw } from 'lucide-react';
import { AppState, ResidentDJ, AppSettings, Intention } from '../types';
import * as userService from '../services/userService';
import * as migrationService from '../services/migrationService';
import { useAppSettings } from '../App';

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

const Toggle = ({ label, checked, onChange, description }: { label: string, checked: boolean, onChange: (c: boolean) => void, description?: string }) => (
    <div className="flex items-center justify-between py-2">
        <div>
            <label className="font-medium text-slate-200">{label}</label>
            {description && <p className="text-xs text-slate-400 max-w-xs">{description}</p>}
        </div>
        <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${checked ? 'bg-purple-600' : 'bg-slate-600'}`}>
            <span aria-hidden="true" className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);

const AppSettingsCard = () => {
    const { settings: appSettings, saveSettings: onSaveSettings, resetSettings: onResetSettings, isLoading } = useAppSettings();
    const [settings, setSettings] = useState<AppSettings>(appSettings);
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => { setSettings(appSettings); }, [appSettings]);
    
    if (isLoading) {
        return <SettingsCard><LoaderCircle className="w-8 h-8 animate-spin text-purple-400 mx-auto" /></SettingsCard>
    }

    const handleChange = (key: keyof AppSettings, value: any) => setSettings(prev => ({ ...prev, [key]: value }));
    const handleSave = () => onSaveSettings(settings);

    const renderGeneral = () => (
        <div className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Idioma</label><select value={settings.appLanguage} onChange={e => handleChange('appLanguage', e.target.value)} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"><option value="es">Español</option><option value="en" disabled>English (Próximamente)</option></select></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Tema Visual</label><select value={settings.appTheme} onChange={e => handleChange('appTheme', e.target.value)} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"><option value="dark">Oscuro</option><option value="light" disabled>Claro (Próximamente)</option><option value="system" disabled>Sistema (Próximamente)</option></select></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Intención por Defecto</label><select value={settings.defaultIntention} onChange={e => handleChange('defaultIntention', e.target.value as Intention)} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"><option value="Automatic">Automático</option><option value="Focus">Enfocarme</option><option value="Relax">Relajarme</option><option value="Celebrate">Celebrar</option><option value="Nostalgia">Nostalgia</option><option value="Discover">Descubrir</option></select></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Vista de Inicio</label><select value={settings.startupView} onChange={e => handleChange('startupView', e.target.value)} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"><option value="HOME">Estación</option><option value="SOCIAL_HUB">Comunidad</option><option value="DJ_VAULT">Bóveda de DJs</option></select></div>
            <Toggle label="Activar Analíticas de Uso" checked={settings.enableAnalytics} onChange={c => handleChange('enableAnalytics', c)} description="Ayúdanos a mejorar AI Radio enviando datos de uso anónimos." />
        </div>
    );
    const renderPlayback = () => (
        <div className="space-y-4">
             <div><label className="block text-sm font-medium text-slate-300 mb-1">Calidad de Audio</label><select value={settings.audioQuality} onChange={e => handleChange('audioQuality', e.target.value)} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"><option value="high">Alta</option><option value="medium" disabled>Media (Próximamente)</option><option value="low" disabled>Baja (Próximamente)</option></select></div>
             <div><label className="block text-sm font-medium text-slate-300">Volumen por Defecto: <span className="font-bold text-purple-300">{Math.round(settings.defaultVolume * 100)}%</span></label><input type="range" min={0} max={1} step={0.01} value={settings.defaultVolume} onChange={e => handleChange('defaultVolume', parseFloat(e.target.value))} className="w-full progress-bar h-2 mt-1"/></div>
             <div><label className="block text-sm font-medium text-slate-300">Duración de Crossfade Global: <span className="font-bold text-purple-300">{settings.globalCrossfadeDuration.toFixed(1)}s</span></label><input type="range" min={0} max={5} step={0.1} value={settings.globalCrossfadeDuration} onChange={e => handleChange('globalCrossfadeDuration', parseFloat(e.target.value))} className="w-full progress-bar h-2 mt-1"/></div>
             <Toggle label="Normalización de Audio" checked={settings.enableAudioNormalization} onChange={c => handleChange('enableAudioNormalization', c)} description="Intenta igualar el volumen de todas las canciones."/>
             <Toggle label="Reproducción sin Pausas" checked={settings.enableGaplessPlayback} onChange={c => handleChange('enableGaplessPlayback', c)} description="Elimina los silencios entre pistas."/>
             <Toggle label="Precargar Siguiente Canción" checked={settings.preloadNextSong} onChange={c => handleChange('preloadNextSong', c)} description="Mejora la fluidez de las transiciones."/>
             <Toggle label="Recordar Posición de Reproducción" checked={settings.rememberPlaybackPosition} onChange={c => handleChange('rememberPlaybackPosition', c)} description="Vuelve donde lo dejaste en el último show."/>
        </div>
    );
    const renderInterface = () => (
        <div className="space-y-4">
            <Toggle label="Vista Compacta de Librería" checked={settings.compactLibraryView} onChange={c => handleChange('compactLibraryView', c)} description="Muestra más canciones en la misma pantalla."/>
            <Toggle label="Reducir Movimiento" checked={settings.reduceMotion} onChange={c => handleChange('reduceMotion', c)} description="Desactiva animaciones y efectos visuales."/>
            <Toggle label="Usar Carátula como Fondo del Reproductor" checked={settings.showAlbumArtAsPlayerBackground} onChange={c => handleChange('showAlbumArtAsPlayerBackground', c)}/>
            <Toggle label="Mostrar Estado de Reproducibilidad" checked={settings.libraryShowPlayability} onChange={c => handleChange('libraryShowPlayability', c)} description="Muestra qué canciones están activas en la librería."/>
            <Toggle label="Notificaciones del Diario del DJ" checked={settings.showDJDiaryNotifications} onChange={c => handleChange('showDJDiaryNotifications', c)} description="Recibe un aviso cuando tu DJ escriba algo nuevo."/>
        </div>
    );
    const renderAccessibility = () => (
        <div className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Tamaño de Fuente</label><select value={settings.fontSize} onChange={e => handleChange('fontSize', e.target.value)} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"><option value="small">Pequeño</option><option value="medium">Mediano</option><option value="large">Grande</option></select></div>
            <Toggle label="Modo de Alto Contraste" checked={settings.highContrastMode} onChange={c => handleChange('highContrastMode', c)} description="Aumenta el contraste de colores para mejorar la legibilidad."/>
            <Toggle label="Fuente para Dislexia" checked={settings.dyslexicFriendlyFont} onChange={c => handleChange('dyslexicFriendlyFont', c)} description="Usa una fuente diseñada para facilitar la lectura."/>
            <Toggle label="Foco de Navegación Mejorado" checked={settings.enhancedFocusRings} onChange={c => handleChange('enhancedFocusRings', c)} description="Hace más visible el elemento seleccionado con el teclado."/>
            <Toggle label="Controles Más Grandes" checked={settings.useBiggerControls} onChange={c => handleChange('useBiggerControls', c)} description="Aumenta el tamaño de botones y deslizadores."/>
            <Toggle label="Mostrar Siempre Transcripciones del DJ" checked={settings.alwaysShowDJTranscripts} onChange={c => handleChange('alwaysShowDJTranscripts', c)} description="Muestra los comentarios del DJ como texto en el reproductor."/>
        </div>
    );
    const renderData = () => (
        <div className="space-y-4">
            <Toggle label="Pausar Historial de Escucha" checked={settings.pauseListeningHistory} onChange={c => handleChange('pauseListeningHistory', c)} description="Tu actividad no se registrará mientras esté activado."/>
            <Toggle label="Contenido Basado en Ubicación" checked={settings.enableLocationBasedContent} onChange={c => handleChange('enableLocationBasedContent', c)} description="Permite que la app use tu ubicación para funciones como el tiempo."/>
            <Toggle label="Anuncios Personalizados" checked={settings.enablePersonalizedAds} onChange={c => handleChange('enablePersonalizedAds', c)} description="Permite a la IA usar tu historial para generar anuncios (falsos) más relevantes."/>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Auto-eliminar Historial</label><select value={settings.autoDeleteHistory} onChange={e => handleChange('autoDeleteHistory', e.target.value)} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"><option value="never">Nunca</option><option value="1m">Después de 1 mes</option><option value="3m">Después de 3 meses</option><option value="1y">Después de 1 año</option></select></div>
            <button className="w-full text-left p-3 rounded-lg flex justify-between items-center bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors"><div className="flex items-center gap-3"><Info size={20}/><span>Gestionar historial y datos cacheados</span></div><ChevronRight size={20}/></button>
        </div>
    );
    
    return (
        <SettingsCard>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings size={20} className="text-purple-400"/> Ajustes de la Aplicación</h3>
            <div className="flex flex-wrap border-b border-slate-700 mb-4">
                {[{id: 'general', label: 'General'}, {id: 'playback', label: 'Reproducción'}, {id: 'interface', label: 'Interfaz'}, {id: 'accessibility', label: 'Accesibilidad'}, {id: 'data', label: 'Datos'}].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'text-purple-300 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white border-b-2 border-transparent'}`}>{tab.label}</button>
                ))}
            </div>
            <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-4">
                {activeTab === 'general' && renderGeneral()}
                {activeTab === 'playback' && renderPlayback()}
                {activeTab === 'interface' && renderInterface()}
                {activeTab === 'accessibility' && renderAccessibility()}
                {activeTab === 'data' && renderData()}
            </div>
            <div className="border-t border-slate-700 mt-6 pt-4 flex justify-end gap-3">
                 <button onClick={onResetSettings} className="flex items-center gap-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600/80 px-3 py-1.5 rounded-lg transition-colors"><RefreshCw size={14}/> Restaurar</button>
                 <button onClick={handleSave} className="bg-purple-600 font-bold py-2 px-4 rounded-lg hover:bg-purple-500 flex items-center gap-2"><Save size={18}/> Guardar Ajustes</button>
            </div>
        </SettingsCard>
    )
}

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
                    <AppSettingsCard />
                    {renderAccountSettings()}
                </div>
            </div>
        </div>
    );
};
export default ProfileSettings;
