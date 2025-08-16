
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AnalyzedSong, RadioShow, CustomizationOptions, LibrarySong, ResidentDJ } from './types';
import { createRadioShow } from './services/geminiService';
import * as djService from './services/djService';
import * as migrationService from './services/migrationService';
import Library from './components/Library';
import Loader from './components/Loader';
import Player from './components/Player';
import Onboarding from './services/Onboarding';
import DJVault from './components/DJVault';
import DJEditor from './components/DJEditor';
import DJDiary from './components/DJDiary';
import Login from './components/Login';
import SocialHub from './components/SocialHub';
import Friends from './components/Friends';
import ProfileSettings from './components/ProfileSettings';
import { PlayCircle, Users, BookUser, LogOut, Radio, Music, MessageSquare, User, Settings, ChevronDown } from 'lucide-react';

declare var puter: any;

const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [appState, setAppState] = useState<AppState>(AppState.LOADING);
  const [allDJs, setAllDJs] = useState<ResidentDJ[]>([]);
  const [activeDJId, setActiveDJId] = useState<string | null>(null);
  const [djToEdit, setDjToEdit] = useState<ResidentDJ | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);


  const [songsForPlayer, setSongsForPlayer] = useState<AnalyzedSong[]>([]);
  const [radioShow, setRadioShow] = useState<RadioShow | null>(null);
  const [currentOptions, setCurrentOptions] = useState<CustomizationOptions | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeDJ = allDJs.find(dj => dj.id === activeDJId) || null;

  const initializeApp = useCallback(async () => {
    setAppState(AppState.LOADING);
    
    await migrationService.migrateAllFromLocalStorage();

    const djs = await djService.getDJs();
    const currentId = await djService.getActiveDJId();

    setAllDJs(djs);

    if (djs.length === 0) {
      setAppState(AppState.ONBOARDING);
    } else {
      setActiveDJId(currentId || djs[0].id);
      setAppState(AppState.HOME);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (typeof puter === 'undefined') {
        setTimeout(checkAuth, 100);
        return;
      }
      try {
        const isSignedIn = await puter.auth.isSignedIn();
        if (isSignedIn) {
          const currentUser = await puter.auth.getUser();
          setUser(currentUser);
          await initializeApp();
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuth();
  }, [initializeApp]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
            setIsUserMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogin = async () => {
    setIsAuthLoading(true);
    const currentUser = await puter.auth.getUser();
    setUser(currentUser);
    await initializeApp();
    setIsAuthLoading(false);
  };
  
  const handleLogout = async () => {
      await puter.auth.signOut();
      setUser(null);
      setAppState(AppState.LOADING);
      setAllDJs([]);
      setActiveDJId(null);
      setIsUserMenuOpen(false);
  };

  const handleSaveDJ = async (dj: ResidentDJ) => {
    const existing = allDJs.find(d => d.id === dj.id);
    let newDJs;
    if (existing) {
      newDJs = allDJs.map(d => d.id === dj.id ? dj : d);
    } else {
      newDJs = [...allDJs, dj];
    }
    setAllDJs(newDJs);
    await djService.saveDJs(newDJs);

    if (!activeDJId || !existing) {
        setActiveDJId(dj.id);
        await djService.setActiveDJId(dj.id);
    }
    
    const wasOnboarding = allDJs.length === 0;
    setDjToEdit(null);
    setAppState(wasOnboarding ? AppState.HOME : AppState.DJ_VAULT);
  };
  
  const handleDeleteDJ = async (djId: string) => {
      const newDJs = allDJs.filter(d => d.id !== djId);
      setAllDJs(newDJs);
      await djService.saveDJs(newDJs);

      if(activeDJId === djId) {
          const newActiveId = newDJs.length > 0 ? newDJs[0].id : null;
          setActiveDJId(newActiveId);
          await djService.setActiveDJId(newActiveId);
      }

      if(newDJs.length === 0) setAppState(AppState.ONBOARDING);
  }

  const handleCloneDJ = async (djId: string) => {
    const djToClone = allDJs.find(d => d.id === djId);
    if (!djToClone) return;

    const newDJ: ResidentDJ = {
      ...djToClone,
      id: crypto.randomUUID(),
      name: `${djToClone.name} (Copia)`,
    };
    
    const newDJs = [...allDJs, newDJ];
    setAllDJs(newDJs);
    await djService.saveDJs(newDJs);
  };

  const handleExportAllData = async () => {
    try {
        const backupData = await migrationService.exportUserData();
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ai_radio_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Error exporting data:", error);
        alert("No se pudo exportar la información.");
    }
  };

  const handleImportData = async (file: File) => {
    try {
        const text = await file.text();
        const importedData = JSON.parse(text);
        
        if (window.confirm("Importar este archivo sobreescribirá toda tu información actual (excepto los archivos de audio locales). ¿Estás seguro?")) {
            setIsAuthLoading(true);
            await migrationService.importUserData(importedData);
            await initializeApp(); // Re-initialize app with imported data
            alert("¡Información importada con éxito!");
        }
    } catch (error) {
        console.error("Error importing data:", error);
        alert("El archivo de respaldo es inválido o está corrupto.");
    } finally {
        setIsAuthLoading(false);
    }
  };
  
  const triggerImport = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
            handleImportData(target.files[0]);
        }
    };
    fileInput.click();
  };

  const handleChangeActiveDJ = async (djId: string) => {
      setActiveDJId(djId);
      await djService.setActiveDJId(djId);
      setAppState(AppState.HOME);
  }

  const handleCreateShow = useCallback(async (songs: LibrarySong[], dj: ResidentDJ, options: CustomizationOptions) => {
    if (songs.length < 2 || songs.length > 50) {
      setError("Por favor, selecciona entre 2 y 50 canciones para el show.");
      return;
    }
    setError(null);
    setAppState(AppState.CREATING_SHOW);
    setCurrentOptions(options);

    const analyzedSongs: AnalyzedSong[] = songs.map((song, index) => ({
      index,
      song
    }));
    setSongsForPlayer(analyzedSongs);

    try {
      // We pass metadata to Gemini, but the full song object to the player.
      const songsForGemini = songs.map((song, index) => ({
        index,
        songId: song.id,
        metadata: song.metadata
      }));
      const show = await createRadioShow(songsForGemini, dj, options);
      setRadioShow(show);
      setAppState(AppState.SHOW_READY);
    } catch (err) {
      console.error(err);
      let errorMessage = "Hubo un error al crear tu estación de radio. Inténtalo de nuevo.";
      if (err instanceof Error) errorMessage = err.message;
      setError(errorMessage);
      setAppState(AppState.HOME);
    }
  }, []);

  const resetApp = () => {
    setAppState(AppState.HOME);
    setSongsForPlayer([]);
    setRadioShow(null);
    setCurrentOptions(null);
    setError(null);
  };
  
  const onBackToHome = () => setAppState(AppState.HOME);

  const renderContent = () => {
    if (isAuthLoading) return <Loader text="Sincronizando con tu cuenta de Puter..." />;
    if (!user) return <Login onLogin={handleLogin} />;

    if (!activeDJ && ![AppState.LOADING, AppState.ONBOARDING].includes(appState)) {
        return <Loader text="Cargando tu estación..." />;
    }

    switch (appState) {
      case AppState.ONBOARDING:
        return <Onboarding onHire={handleSaveDJ} onImport={triggerImport} error={error} />;
      case AppState.HOME:
        if (!activeDJ) return <Loader text="Cargando tu DJ..." />;
        return <Library activeDJ={activeDJ} onCreateShow={handleCreateShow} onManageDJs={() => setAppState(AppState.DJ_VAULT)} error={error} setError={setError} />;
      case AppState.DJ_VAULT:
        return <DJVault djs={allDJs} activeDJId={activeDJId} onSelect={handleChangeActiveDJ} onEdit={(dj) => { setDjToEdit(dj); setAppState(AppState.DJ_EDITOR); }} onDelete={handleDeleteDJ} onAdd={() => { setDjToEdit(null); setAppState(AppState.DJ_EDITOR); }} onBack={onBackToHome} onClone={handleCloneDJ} onExportSingle={djService.exportSingleDJ} />;
      case AppState.DJ_EDITOR:
        return <DJEditor dj={djToEdit} onSave={handleSaveDJ} onBack={() => setAppState(AppState.DJ_VAULT)} />;
      case AppState.DJ_DIARY:
        if (!activeDJ) return null;
        return <DJDiary dj={activeDJ} onBack={() => setAppState(AppState.PROFILE_SETTINGS)} />;
      case AppState.SOCIAL_HUB:
        return <SocialHub onBack={onBackToHome} />;
      case AppState.FRIENDS:
        return <Friends onBack={onBackToHome} />;
      case AppState.PROFILE_SETTINGS:
        return <ProfileSettings 
            onBack={onBackToHome} 
            user={user}
            setUser={setUser}
            onLogout={handleLogout}
            activeDJ={activeDJ}
            setAppState={setAppState}
            onEditDJ={(dj) => { setDjToEdit(dj); setAppState(AppState.DJ_EDITOR); }}
            onImport={triggerImport}
            onExportAll={handleExportAllData}
        />;
      case AppState.CREATING_SHOW:
        if (!activeDJ) return null;
        return <Loader text={`${activeDJ.name} está buscando datos, escribiendo guiones y preparando la sesión...`} />;
      case AppState.SHOW_READY:
      case AppState.PLAYING:
        if (!radioShow || songsForPlayer.length === 0 || !currentOptions || !activeDJ) {
          setError("No se pudo cargar la sesión. Por favor, reinicia."); setAppState(AppState.HOME); return null;
        }
        return <Player show={radioShow} songs={songsForPlayer} options={currentOptions} dj={activeDJ} setAppState={setAppState} onClose={resetApp} />;
      case AppState.LOADING:
        return <Loader text="Iniciando AI Radio..." />;
      default:
        return null;
    }
  };
  
  const NavButton = ({ targetState, label, icon: Icon }: {targetState: AppState, label: string, icon: React.ElementType}) => {
    const isActive = appState === targetState;
    return (
        <button onClick={() => setAppState(targetState)} className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${isActive ? 'bg-slate-700/80 text-white' : 'bg-slate-800/50 hover:bg-slate-700/80 text-slate-300'}`}>
            <Icon size={16} className={isActive ? 'text-purple-400' : ''}/> {label}
        </button>
    )
  }

  const isPlayerActive = appState === AppState.PLAYING || appState === AppState.SHOW_READY;
  const showHeader = !isPlayerActive && user;
  const userAvatar = user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username?.[0] || 'A')}&background=a855f7&color=fff`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/50 flex flex-col items-center p-4 selection:bg-purple-500 selection:text-white">
      <div className="w-full max-w-7xl mx-auto">
        {showHeader && (
          <header className="flex justify-between items-center p-4">
            <div className="flex items-center space-x-3">
              <PlayCircle className="w-8 h-8 text-purple-400" />
              <h1 className="text-2xl font-black tracking-wider text-white uppercase">AI Radio</h1>
            </div>
             
             <nav className="hidden md:flex items-center gap-2">
                <NavButton targetState={AppState.HOME} label="Estación" icon={Radio}/>
                <NavButton targetState={AppState.SOCIAL_HUB} label="Comunidad" icon={MessageSquare}/>
                <NavButton targetState={AppState.FRIENDS} label="Amigos" icon={Users}/>
             </nav>
              
              {user && (
                  <div ref={userMenuRef} className="relative">
                      <button onClick={() => setIsUserMenuOpen(v => !v)} className="flex items-center gap-2 text-sm font-semibold bg-slate-800/50 hover:bg-slate-700/80 pl-2 pr-3 py-2 rounded-lg transition-colors">
                        <img src={userAvatar} alt="avatar" className="w-6 h-6 rounded-full" />
                        <span>{user.username}</span>
                        <ChevronDown size={16} className={`transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}/>
                      </button>
                      {isUserMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50 animate-[fade-in_0.2s] origin-top-right">
                             <ul className="py-1 text-sm text-slate-200">
                                <li><button onClick={() => { setAppState(AppState.PROFILE_SETTINGS); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-3"><Settings size={16}/> Perfil y Ajustes</button></li>
                                <li><button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-3 text-red-400"><LogOut size={16}/> Salir</button></li>
                            </ul>
                        </div>
                      )}
                  </div>
              )}
          </header>
        )}
        <main className={!isPlayerActive ? 'mt-4' : ''}>{renderContent()}</main>
      </div>
    </div>
  );
};

export default App;
