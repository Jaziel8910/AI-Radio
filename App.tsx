import React, { useState, useCallback, useEffect } from 'react';
import { AppState, AnalyzedSong, RadioShow, CustomizationOptions, LibrarySong, ResidentDJ } from './types';
import { createRadioShow } from './services/geminiService';
import * as djService from './services/djService';
import Library from './components/Library';
import Loader from './components/Loader';
import Player from './components/Player';
import Onboarding from './components/Onboarding';
import DJVault from './components/DJVault';
import DJEditor from './components/DJEditor';
import { PlayCircle, Users } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOADING);
  const [allDJs, setAllDJs] = useState<ResidentDJ[]>([]);
  const [activeDJId, setActiveDJId] = useState<string | null>(null);
  const [djToEdit, setDjToEdit] = useState<ResidentDJ | null>(null);

  const [songsForPlayer, setSongsForPlayer] = useState<AnalyzedSong[]>([]);
  const [radioShow, setRadioShow] = useState<RadioShow | null>(null);
  const [currentOptions, setCurrentOptions] = useState<CustomizationOptions | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeDJ = allDJs.find(dj => dj.id === activeDJId) || null;

  useEffect(() => {
    const initializeApp = async () => {
      // Warm up TTS
      if (window.speechSynthesis && typeof window.speechSynthesis.getVoices === 'function') {
        const warmUp = () => window.speechSynthesis.getVoices();
        warmUp();
        window.speechSynthesis.onvoiceschanged = warmUp;
      }

      // Migrate legacy single DJ if necessary
      await djService.migrateLegacyDJ();

      const djs = djService.getDJs();
      const currentId = djService.getActiveDJId();

      setAllDJs(djs);

      if (djs.length === 0) {
        setAppState(AppState.ONBOARDING);
      } else {
        setActiveDJId(currentId || djs[0].id);
        setAppState(AppState.HOME);
      }
    };
    initializeApp();
  }, []);

  const handleSaveDJ = (dj: ResidentDJ) => {
    const existing = allDJs.find(d => d.id === dj.id);
    let newDJs;
    if (existing) {
      newDJs = allDJs.map(d => d.id === dj.id ? dj : d);
    } else {
      newDJs = [...allDJs, dj];
    }
    setAllDJs(newDJs);
    djService.saveDJs(newDJs);

    if (!activeDJId || !existing) {
        setActiveDJId(dj.id);
        djService.setActiveDJId(dj.id);
    }

    setDjToEdit(null);
    setAppState(allDJs.length === 0 ? AppState.HOME : AppState.DJ_VAULT);
    if(allDJs.length === 0) setAppState(AppState.HOME);
  };
  
  const handleDeleteDJ = (djId: string) => {
      const newDJs = allDJs.filter(d => d.id !== djId);
      setAllDJs(newDJs);
      djService.saveDJs(newDJs);

      if(activeDJId === djId) {
          const newActiveId = newDJs.length > 0 ? newDJs[0].id : null;
          setActiveDJId(newActiveId);
          if (newActiveId) djService.setActiveDJId(newActiveId);
          else localStorage.removeItem('aiRadioActiveDJId');
      }

      if(newDJs.length === 0) setAppState(AppState.ONBOARDING);
  }

  const handleCloneDJ = (djId: string) => {
    const djToClone = allDJs.find(d => d.id === djId);
    if (!djToClone) return;

    const newDJ: ResidentDJ = {
      ...djToClone,
      id: crypto.randomUUID(),
      name: `${djToClone.name} (Copia)`,
    };
    
    const newDJs = [...allDJs, newDJ];
    setAllDJs(newDJs);
    djService.saveDJs(newDJs);
  };

  const handleExportDJs = () => {
    const djs = djService.getDJs();
    if(djs.length === 0) {
      alert("No hay DJs para exportar.");
      return;
    }
    const jsonString = JSON.stringify(djs, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai_radio_djs.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportDJs = (importedDJs: ResidentDJ[]) => {
      const currentDJs = djService.getDJs();
      const currentDJIds = new Set(currentDJs.map(dj => dj.id));
      const newDJs = importedDJs.filter(dj => !currentDJIds.has(dj.id));

      if (newDJs.length === 0) {
          alert('No se encontraron DJs nuevos para importar (basado en ID).');
          return;
      }
      
      const combinedDJs = [...currentDJs, ...newDJs];
      setAllDJs(combinedDJs);
      djService.saveDJs(combinedDJs);
      alert(`${newDJs.length} DJs importados con éxito.`);
  };


  const handleChangeActiveDJ = (djId: string) => {
      setActiveDJId(djId);
      djService.setActiveDJId(djId);
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
      songId: song.id,
      fileUrl: URL.createObjectURL(song.file),
      metadata: { title: song.metadata.title, artist: song.metadata.artist, album: song.metadata.album, duration: song.metadata.duration, picture: song.metadata.picture, }
    }));
    setSongsForPlayer(analyzedSongs);

    try {
      const show = await createRadioShow(analyzedSongs, dj, options);
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

  const renderContent = () => {
    switch (appState) {
      case AppState.ONBOARDING:
        return <Onboarding onHire={handleSaveDJ} error={error} />;
      case AppState.HOME:
        if (!activeDJ) return <Loader text="Cargando tu estación..." />;
        return <Library activeDJ={activeDJ} onCreateShow={handleCreateShow} onManageDJs={() => setAppState(AppState.DJ_VAULT)} error={error} setError={setError} />;
      case AppState.DJ_VAULT:
        return <DJVault djs={allDJs} activeDJId={activeDJId} onSelect={handleChangeActiveDJ} onEdit={(dj) => { setDjToEdit(dj); setAppState(AppState.DJ_EDITOR); }} onDelete={handleDeleteDJ} onAdd={() => { setDjToEdit(null); setAppState(AppState.DJ_EDITOR); }} onBack={() => setAppState(AppState.HOME)} onClone={handleCloneDJ} onImport={handleImportDJs} onExport={handleExportDJs} />;
      case AppState.DJ_EDITOR:
        return <DJEditor dj={djToEdit} onSave={handleSaveDJ} onBack={() => setAppState(AppState.DJ_VAULT)} />;
      case AppState.CREATING_SHOW:
        if (!activeDJ) return null;
        return <Loader text={`${activeDJ.name} está buscando datos, escribiendo guiones y preparando la sesión...`} />;
      case AppState.SHOW_READY:
      case AppState.PLAYING:
        if (!radioShow || songsForPlayer.length === 0 || !currentOptions) {
          setError("No se pudo cargar la sesión. Por favor, reinicia."); setAppState(AppState.HOME); return null;
        }
        return <Player show={radioShow} songs={songsForPlayer} options={currentOptions} setAppState={setAppState} onClose={resetApp} />;
      case AppState.LOADING:
        return <Loader text="Iniciando AI Radio..." />;
      default:
        return null;
    }
  };

  const isPlayerActive = appState === AppState.PLAYING || appState === AppState.SHOW_READY;
  const showHeader = !isPlayerActive;
  const getHeaderTitle = () => {
    switch (appState) {
        case AppState.HOME: return activeDJ ? `La Estación de ${activeDJ.name}` : 'AI Radio';
        case AppState.DJ_VAULT: return 'La Bóveda de DJs';
        case AppState.DJ_EDITOR: return djToEdit ? `Editando a ${djToEdit.name}` : 'Creando Nuevo DJ';
        default: return 'AI Radio';
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/50 flex flex-col items-center p-4 selection:bg-purple-500 selection:text-white">
      <div className="w-full max-w-7xl mx-auto">
        {showHeader && (
          <header className="flex justify-between items-center p-4">
            <div className="flex items-center space-x-3">
              <PlayCircle className="w-8 h-8 text-purple-400" />
              <h1 className="text-2xl font-black tracking-wider text-white uppercase">{getHeaderTitle()}</h1>
            </div>
             {appState === AppState.HOME && <button onClick={() => setAppState(AppState.DJ_VAULT)} className="flex items-center gap-2 text-sm font-semibold bg-slate-800/50 hover:bg-slate-700/80 px-4 py-2 rounded-lg transition-colors"><Users size={16}/> Gestionar DJs</button>}
          </header>
        )}
        <main className={!isPlayerActive ? 'mt-4' : ''}>{renderContent()}</main>
      </div>
    </div>
  );
};

export default App;