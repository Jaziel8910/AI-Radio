
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnalyzedSong, RadioShow, AppState, PlaylistItem, SongItem, Genre, Source, CustomizationOptions, ResidentDJ, LibrarySong } from '../types';
import { Play, Pause, MoreVertical, ThumbsUp, ThumbsDown, Share2, Maximize, X, FileText, Minimize, LoaderCircle, Volume2, Volume1, VolumeX, BookOpen, Clock, Radio } from 'lucide-react';
import { logSongPlay, logSongFinish, logSongFavorite, logSongSkip, logSongDislike } from '../services/historyService';
import { getFileFromSessionStore } from '../services/sessionFileService';
import { getLyrics } from '../services/geminiService';
import { generateAndSavePostShowEntry } from '../services/diaryService';
import { getARandomJoke } from '../services/contextService';

declare var puter: any;

const FADE_INTERVAL = 50; // ms
const FADE_TIME = 1000; // ms

enum PlayerStatus { LOADING, SPEAKING, PLAYING, ENDED }

interface PlayerProps {
  show: RadioShow;
  songs: AnalyzedSong[];
  options: CustomizationOptions;
  dj: ResidentDJ;
  setAppState: (state: AppState) => void;
  onClose: () => void;
}

const Player: React.FC<PlayerProps> = ({ show, songs, options, dj, setAppState, onClose }) => {
  const [status, setStatus] = useState<PlayerStatus>(PlayerStatus.LOADING);
  const [playlistIndex, setPlaylistIndex] = useState(-1);
  const [currentCommentary, setCurrentCommentary] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [favoritedSongs, setFavoritedSongs] = useState<Set<string>>(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [isLyricsVisible, setIsLyricsVisible] = useState(false);
  const [lyrics, setLyrics] = useState<{ text: string | null, isLoading: boolean }>({ text: null, isLoading: false });
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const currentSongUrlRef = useRef<string | null>(null);

  const playerRef = useRef<HTMLDivElement>(null);
  const cancellationRef = useRef<(() => void) | null>(null);
  const lastVolumeRef = useRef(volume);
  const sleepTimerRef = useRef<number | null>(null);

  const currentPlaylistItem = playlistIndex >= 0 && playlistIndex < show.playlist.length ? show.playlist[playlistIndex] : null;
  const currentSongItem = currentPlaylistItem?.type === 'song' ? currentPlaylistItem as SongItem : null;
  const currentAnalyzedSong = currentSongItem ? songs.find(s => s.index === currentSongItem.songIndex) : null;
  const currentSong = currentAnalyzedSong?.song || null;
  const isSongFavorited = currentSong ? favoritedSongs.has(currentSong.id) : false;

  const setPlayerStatus = useCallback((newStatus: PlayerStatus) => {
    if (newStatus === PlayerStatus.PLAYING || newStatus === PlayerStatus.SPEAKING) {
        setIsTransitioning(false);
    }
    setStatus(newStatus);
  }, []);

  const cleanupCurrentTask = useCallback(() => {
    if (cancellationRef.current) {
      cancellationRef.current();
      cancellationRef.current = null;
    }
  }, []);
  
  const animateVolume = (targetVolume: number, duration: number, onComplete?: () => void) => {
      const audio = audioElementRef.current;
      if (!audio) return;
      
      const startVolume = audio.volume;
      const steps = duration / FADE_INTERVAL;
      const volumeStep = (targetVolume - startVolume) / steps;
      let currentStep = 0;
      
      const fadeInterval = setInterval(() => {
          if (currentStep >= steps) {
              clearInterval(fadeInterval);
              audio.volume = targetVolume;
              if (onComplete) onComplete();
              return;
          }
          audio.volume += volumeStep;
          currentStep++;
      }, FADE_INTERVAL);
  };

  const speak = useCallback(async (text: string, isInterruptible: boolean = false): Promise<void> => {
    if (!isInterruptible) cleanupCurrentTask();
    if (!text?.trim()) return;

    return new Promise((resolve, reject) => {
        if (!isInterruptible) setPlayerStatus(PlayerStatus.SPEAKING);
        setCurrentCommentary(text);

        const puterOptions = { language: dj.voiceLanguage || 'es-ES', engine: dj.voiceEngine || 'generative' };

        puter.ai.txt2speech(text, puterOptions).then((ttsAudio: HTMLAudioElement) => {
            const mainAudio = audioElementRef.current;
            if (!mainAudio) {
                console.error("El elemento de audio principal no existe. No se puede hablar.");
                resolve(); // Resolve to not block the show flow
                return;
            }
            
            const handleEnd = () => {
                mainAudio.removeEventListener('ended', handleEnd);
                mainAudio.removeEventListener('error', handleError);
                if (!isInterruptible) {
                    cancellationRef.current = null;
                    setCurrentCommentary('');
                }
                resolve();
            };
            
            const handleError = (e: Event) => {
                console.error("Error al reproducir el audio del DJ:", e);
                mainAudio.removeEventListener('ended', handleEnd);
                mainAudio.removeEventListener('error', handleError);
                // Resolvemos igualmente para no bloquear el show
                resolve();
            };

            mainAudio.addEventListener('ended', handleEnd);
            mainAudio.addEventListener('error', handleError);

            mainAudio.src = ttsAudio.src;
            mainAudio.volume = isMuted ? 0 : volume;
            mainAudio.play().catch(handleError);
            
            if (!isInterruptible) {
                cancellationRef.current = () => {
                    if (mainAudio) { mainAudio.pause(); mainAudio.src = ''; }
                    handleEnd();
                };
            }
        }).catch((err: any) => {
            console.error("Error en la generación de voz de Puter:", err);
            reject(err);
        });
    });
}, [cleanupCurrentTask, setPlayerStatus, dj.voiceLanguage, dj.voiceEngine, isMuted, volume]);

  
  const playSong = useCallback(async (song: LibrarySong): Promise<void> => {
      cleanupCurrentTask();
      const audio = audioElementRef.current;
      if (!audio) return Promise.resolve();

      // Revoke the previous song's URL to free up memory
      if (currentSongUrlRef.current) {
          URL.revokeObjectURL(currentSongUrlRef.current);
          currentSongUrlRef.current = null;
      }

      const file = getFileFromSessionStore(song.id);

      if (!file) {
          console.warn(`Audio file for song ID ${song.id} not found in session store.`);
          speak(`No se pudo encontrar el archivo de audio para "${song.metadata.title}". Por favor, recarga tus archivos en la librería. Saltando a la siguiente.`, true);
          return Promise.resolve();
      }

      return new Promise((resolve) => {
          const objectUrl = URL.createObjectURL(file);
          currentSongUrlRef.current = objectUrl;
          audio.src = objectUrl;
          audio.volume = 0;
          const playPromise = audio.play();

          playPromise.then(() => {
              logSongPlay(song.id);
              animateVolume(isMuted ? 0 : volume, FADE_TIME);
              setPlayerStatus(PlayerStatus.PLAYING);
              setAppState(AppState.PLAYING);

              const handleEnd = async () => {
                  audio.removeEventListener('ended', handleEnd);
                  logSongFinish(song.id);
                  cancellationRef.current = null;
                  resolve();
              };
              audio.addEventListener('ended', handleEnd);

              cancellationRef.current = () => {
                  audio.removeEventListener('ended', handleEnd);
                  try { audio.pause(); } catch (e) { /* ignore */ }
                  resolve();
              };
          }).catch(error => {
              console.error("Error playing song:", error);
              speak(`Hubo un problema al reproducir "${song.metadata.title}". Saltando a la siguiente.`, true);
              resolve();
          });
      });
  }, [cleanupCurrentTask, volume, isMuted, setAppState, setPlayerStatus, speak]);


  const advancePlaylist = useCallback((nextIndex: number) => {
    cleanupCurrentTask();
    setLyrics({ text: null, isLoading: false }); // Reset lyrics for next song
    setPlaylistIndex(nextIndex);
  }, [cleanupCurrentTask]);

  const fadeOutAndExecute = (callback: () => void) => {
      const audio = audioElementRef.current;
      if (status === PlayerStatus.PLAYING && audio && !audio.paused) {
          animateVolume(0, FADE_TIME, () => {
              audio.pause();
              callback();
          });
      } else {
          callback();
      }
  }

  const handleDislike = async () => {
    if (isTransitioning || status === PlayerStatus.ENDED || !currentSong) return;
    setIsTransitioning(true);
    if(show.userReactions?.onSkip) speak(show.userReactions.onSkip, true);
    await logSongDislike(currentSong.id);
    await logSongSkip(currentSong.id);
    fadeOutAndExecute(() => advancePlaylist(playlistIndex + 1));
  };
  
  const handleFavorite = useCallback(async () => { if(currentSong) { if(show.userReactions?.onFavorite) speak(show.userReactions.onFavorite, true); await logSongFavorite(currentSong.id); setFavoritedSongs(prev => new Set(prev).add(currentSong.id)); } }, [currentSong, show.userReactions, speak]);

  const handleShare = async () => {
    const shareText = `Estoy escuchando "${show.showTitle}", una sesión de radio generada por IA en AI Radio. Canción actual: "${currentSong?.metadata.title}" de ${currentSong?.metadata.artist}.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'AI Radio', text: shareText });
      } catch (error) { console.error('Error al compartir:', error); }
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Enlace del show copiado al portapapeles.');
    }
    setIsMenuOpen(false);
  };
  
  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };
  
  const handleShowSources = () => {
    if (!show.sources || show.sources.length === 0) return;
    const sourcesText = show.sources.map(s => `- ${s.title}: ${s.uri}`).join('\n');
    alert(`Fuentes de datos para esta sesión:\n\n${sourcesText}`);
    setIsMenuOpen(false);
  };

  const handleToggleLyrics = async () => {
    if (isClosing) return;
    const willBeVisible = !isLyricsVisible;
    setIsLyricsVisible(willBeVisible);
    if (willBeVisible && !lyrics.text && currentSong) { // fetch if opening and not already fetched
        setLyrics({ text: null, isLoading: true });
        try {
            const fetchedLyrics = await getLyrics(currentSong.metadata.title, currentSong.metadata.artist);
            setLyrics({ text: fetchedLyrics, isLoading: false });
        } catch (e) {
            setLyrics({ text: 'Error al cargar las letras.', isLoading: false });
        }
    }
  };

  const handleSetSleepTimer = (minutes: number | null) => {
    if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
        sleepTimerRef.current = null;
    }
    setSleepTimer(minutes);
    if (minutes !== null) {
        speak(`Temporizador de apagado configurado para ${minutes} minutos.`, true);
        sleepTimerRef.current = window.setTimeout(() => {
            handleClose();
        }, minutes * 60 * 1000);
    } else {
        speak(`Temporizador de apagado cancelado.`, true);
    }
    setIsMenuOpen(false);
  };
  
  const handleClose = async () => {
      if(isClosing) return;
      setIsClosing(true);
      setCurrentCommentary(`Guardando las notas de ${dj.name} sobre la sesión...`);
      try {
          // This needs the original analyzed songs, not the full LibrarySong object
          const songsForDiary = songs.map(s => ({
              index: s.index,
              songId: s.song.id,
              metadata: s.song.metadata,
          }));
          await generateAndSavePostShowEntry(dj, songsForDiary);
      } catch (e) {
          console.error("Failed to save diary entry:", e);
      } finally {
          onClose();
      }
  };

  useEffect(() => {
    if (status === PlayerStatus.LOADING || playlistIndex < 0) return;
    let isCancelled = false;
    cancellationRef.current = () => { isCancelled = true; };
    const runSequence = async () => {
        if (playlistIndex >= show.playlist.length) {
            await speak(show.outroCommentary);
            if (!isCancelled) { setPlayerStatus(PlayerStatus.ENDED); setCurrentCommentary("Fin de la sesión."); setAppState(AppState.SHOW_READY); }
            return;
        }
        const item = show.playlist[playlistIndex];
        if (item.type === 'song') {
            const songData = songs.find(s => s.index === item.songIndex)?.song;
            if (!songData) { advancePlaylist(playlistIndex + 1); return; }
            await speak(item.commentary); if (isCancelled) return;
            await playSong(songData); if (isCancelled) return;
            advancePlaylist(playlistIndex + 1);
        } else if (item.type === 'ad_break') {
            for (const ad of item.adverts) { await speak(ad); if (isCancelled) return; }
            advancePlaylist(playlistIndex + 1);
        } else if (item.type === 'jingle') {
            await speak(item.script); if(isCancelled) return;
            advancePlaylist(playlistIndex + 1);
        } else if (item.type === 'joke') {
            const jokeText = await getARandomJoke();
            if(jokeText) await speak(jokeText);
            if(isCancelled) return;
            advancePlaylist(playlistIndex + 1);
        }
    };
    runSequence();
    return () => { isCancelled = true; cleanupCurrentTask(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistIndex]);

  useEffect(() => { const fsChangeHandler = () => setIsFullScreen(!!document.fullscreenElement); document.addEventListener('fullscreenchange', fsChangeHandler); return () => document.removeEventListener('fullscreenchange', fsChangeHandler); }, []);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || isLyricsVisible) return;
          switch (e.code) {
              case 'KeyF': handleFavorite(); break;
              case 'KeyL': handleToggleLyrics(); break;
              case 'KeyD': handleDislike(); break;
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFavorite, handleToggleLyrics, handleDislike, isLyricsVisible]);

  useEffect(() => {
    const initAudioEngine = async () => {
      try {
        await speak(show.showTitle);
        await speak(show.introCommentary);
        setPlaylistIndex(0);
      } catch(e) { console.error("Error initializing audio engine:", e); setCurrentCommentary("Error al cargar el audio."); setPlayerStatus(PlayerStatus.ENDED); }
    };
    initAudioEngine();
    return () => { 
        cleanupCurrentTask(); 
        if(sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
        if (currentSongUrlRef.current) {
            URL.revokeObjectURL(currentSongUrlRef.current);
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
      if (audioElementRef.current) {
          audioElementRef.current.volume = isMuted ? 0 : volume;
      }
  }, [volume, isMuted]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => { setVolume(Number(e.target.value)); setIsMuted(false); };
  const toggleMute = () => { if(isMuted) { setIsMuted(false); setVolume(lastVolumeRef.current || 0.5); } else { lastVolumeRef.current = volume; setIsMuted(true); setVolume(0); } };
  
  const isControlDisabled = status === PlayerStatus.LOADING || status === PlayerStatus.ENDED;

  if (status === PlayerStatus.LOADING && playlistIndex < 0) {
      return (<div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center text-white"><LoaderCircle className="w-12 h-12 animate-spin text-purple-400 mb-4" /><p className="text-lg">Calentando los motores de la radio...</p></div>);
  }
  
  return (
    <div ref={playerRef} className="fixed inset-0 bg-slate-900 text-white flex flex-col font-sans overflow-hidden select-none">
      <audio ref={audioElementRef} preload="auto" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 transition-all duration-1000" style={{ backgroundImage: show.showArt ? `url(${show.showArt})` : '', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="absolute inset-0 z-0 bg-black/60 backdrop-blur-2xl"></div>
      
      {isLyricsVisible && (
        <div className="absolute inset-0 z-20 bg-slate-900/95 backdrop-blur-md flex flex-col p-4 sm:p-6 md:p-8 animate-[fade-in_0.3s]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Letra de la Canción</h3>
                <button onClick={handleToggleLyrics} className="p-2 -mr-2 text-slate-300 hover:text-white transition-colors rounded-full hover:bg-white/10"><X size={24} /></button>
            </div>
            <div className="flex-grow overflow-y-auto text-center">
                {lyrics.isLoading ? (
                    <div className="flex items-center justify-center h-full"><LoaderCircle className="w-8 h-8 animate-spin text-purple-400" /></div>
                ) : (
                    <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-300">{lyrics.text || 'No se encontraron letras.'}</p>
                )}
            </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full p-4 sm:p-6 md:p-8">
        <header className="flex justify-between items-center w-full flex-shrink-0">
          <button onClick={handleClose} aria-label="Cerrar reproductor" className="p-2 -ml-2 text-slate-300 hover:text-white transition-colors rounded-full hover:bg-white/10" disabled={isClosing}><X size={28} /></button>
          <div className="text-center"><p className="text-sm uppercase tracking-widest text-slate-400">Ahora en AI Radio</p><p className="font-bold text-white truncate max-w-[200px] sm:max-w-xs">{show.showTitle}</p></div>
          <div className="relative">
            <button onClick={() => setIsMenuOpen(v => !v)} aria-label="Más opciones" className="p-2 -mr-2 text-slate-300 hover:text-white transition-colors rounded-full hover:bg-white/10"><MoreVertical size={24} /></button>
            {isMenuOpen && (
                <div className="absolute right-0 top-12 mt-2 w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50 animate-[fade-in_0.2s] origin-top-right">
                    <ul className="py-2 text-sm text-slate-200">
                        <li><button onClick={handleShare} className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-3"><Share2 size={16}/> Compartir Show</button></li>
                        <li><button onClick={handleToggleFullScreen} className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-3">{isFullScreen ? <Minimize size={16}/> : <Maximize size={16}/>} {isFullScreen ? 'Salir de Pantalla Completa' : 'Pantalla Completa'}</button></li>
                        {show.sources && show.sources.length > 0 && <li><button onClick={handleShowSources} className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-3"><FileText size={16}/> Ver Fuentes</button></li>}
                        {currentSongItem && <li><button onClick={handleToggleLyrics} className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-3"><BookOpen size={16}/> {isLyricsVisible ? 'Ocultar Letra' : 'Mostrar Letra'}</button></li>}
                        <li className="border-t border-slate-700 my-2"></li>
                        <li className="px-4 pt-2 pb-1 text-xs text-slate-400">Temporizador</li>
                        {[15, 30, 60].map(t => (
                            <li key={t}><button onClick={() => handleSetSleepTimer(t)} className={`w-full text-left px-4 py-2 hover:bg-slate-700 ${sleepTimer === t ? 'text-purple-300' : ''}`}>Tras {t} minutos</button></li>
                        ))}
                        {sleepTimer && <li><button onClick={() => handleSetSleepTimer(null)} className="w-full text-left px-4 py-2 hover:bg-slate-700 text-red-400">Cancelar Temporizador</button></li>}
                    </ul>
                </div>
            )}
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center my-4 overflow-hidden">
             {/* Visualizer placeholder */}
             <div className="w-full max-w-4xl h-32 sm:h-48 md:h-56 flex items-center justify-center transition-opacity duration-500" style={{ opacity: status === PlayerStatus.PLAYING ? 1 : 0.4}}>
                <Radio size={64} className={`text-purple-400/80 ${status === PlayerStatus.PLAYING ? 'animate-pulse' : ''}`} />
             </div>
             <div className="text-center mt-8 sm:mt-12 transition-opacity duration-500" style={{ opacity: isControlDisabled ? 0.7 : 1}}>
                <h2 className="text-3xl sm:text-5xl font-bold text-white truncate">{currentSong?.metadata.title || 'AI Radio'}</h2>
                <p className="text-lg sm:text-xl text-slate-300 truncate">{currentSong?.metadata.artist || 'Tu DJ Personal'}</p>
             </div>
        </main>
        
        <footer className="w-full max-w-2xl mx-auto flex-shrink-0">
          <div className="h-16 flex items-center justify-center px-4">
            {currentCommentary && (<p className="bg-slate-800/60 backdrop-blur-sm border border-slate-700 text-purple-300 italic text-center text-sm rounded-lg px-4 py-3 animate-[fade-in_0.5s] line-clamp-2" key={currentCommentary}>{currentCommentary}</p>)}
          </div>
         
          <div className="flex justify-between items-center gap-4 sm:gap-6 mt-4">
            <button onClick={handleDislike} aria-label="No me gusta esta canción" className="text-slate-400 hover:text-white transition-colors p-3 disabled:text-slate-700 disabled:cursor-not-allowed" disabled={!currentSongItem || isControlDisabled || isTransitioning}><ThumbsDown size={28} /></button>
            
            <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 text-lg font-bold text-purple-300 uppercase tracking-widest">
                    <Radio size={20} className={status === PlayerStatus.PLAYING ? 'animate-pulse' : ''} />
                    <span>On Air</span>
                </div>
                {currentSongItem && <p className="text-xs text-slate-400 mt-1">{currentSongItem.genre} &bull; {currentSong?.metadata.year || 'N/A'}</p>}
            </div>

            <button onClick={handleFavorite} aria-label="Marcar como favorita" className={`p-3 transition-colors disabled:text-slate-700 ${isSongFavorited ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`} disabled={!currentSongItem || isControlDisabled || isSongFavorited}><ThumbsUp size={28} className={isSongFavorited ? "fill-purple-400" : ""} /></button>
          </div>

           <div className="flex items-center justify-center gap-2 w-full sm:w-auto mt-6">
                <button onClick={toggleMute} aria-label={isMuted || volume === 0 ? 'Quitar silencio' : 'Silenciar'} className="p-2 text-slate-300 hover:text-white">{isMuted || volume === 0 ? <VolumeX size={20}/> : volume < 0.5 ? <Volume1 size={20}/> : <Volume2 size={20}/>}</button>
                <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="progress-bar w-32" aria-label="Control de volumen" />
            </div>

        </footer>
      </div>
    </div>
  );
};

export default Player;
