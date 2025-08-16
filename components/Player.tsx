
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnalyzedSong, RadioShow, AppState, PlaylistItem, SongItem, Genre, Source, CustomizationOptions, ResidentDJ } from '../types';
import { Play, Pause, MoreVertical, ThumbsUp, ThumbsDown, Share2, Maximize, X, FileText, Minimize, LoaderCircle, Volume2, Volume1, VolumeX, BookOpen, Clock, Radio } from 'lucide-react';
import { logSongPlay, logSongFinish, logSongFavorite, logSongSkip, logSongDislike } from '../services/historyService';
import { getLyrics } from '../services/geminiService';
import { generateAndSavePostShowEntry } from '../services/diaryService';
import { VISUALIZER_PALETTES, Palette } from '../constants';

declare var puter: any;

const FADE_TIME = 0.5;
const EQ_FREQUENCIES = [60, 250, 1000, 3500, 7000, 12000];
const EQ_PRESETS: Record<string, number[]> = {
  'Rock':       [5, 3, -2, 1, 4, 6],
  'Electronic': [6, 4, 0, -1, 3, 5],
  'Pop':        [4, 2, 1, 2, 3, 4],
  'Hip-Hop':    [7, 5, 1, 0, 2, 3],
  'Jazz':       [2, 0, 3, 4, 2, 1],
  'Classical':  [0, 0, 0, 0, 0, 0],
  'Vocal':      [-2, -1, 4, 5, 3, -1],
  'Other':      [0, 0, 0, 0, 0, 0],
};

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
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const volumeGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const songBuffersRef = useRef<Map<number, AudioBuffer>>(new Map());
  
  const visualizerAnimationRef = useRef<number | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancellationRef = useRef<(() => void) | null>(null);
  const lastVolumeRef = useRef(volume);
  const sleepTimerRef = useRef<number | null>(null);
  const currentPuterAudioRef = useRef<HTMLAudioElement | null>(null);

  const currentPlaylistItem = playlistIndex >= 0 && playlistIndex < show.playlist.length ? show.playlist[playlistIndex] : null;
  const currentSongItem = currentPlaylistItem?.type === 'song' ? currentPlaylistItem as SongItem : null;
  const currentSong = currentSongItem ? songs.find(s => s.index === currentSongItem.songIndex) : null;
  const isSongFavorited = currentSong ? favoritedSongs.has(currentSong.songId) : false;

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

  const speak = useCallback(async (text: string, isInterruptible: boolean = false): Promise<void> => {
    if (!isInterruptible) cleanupCurrentTask();
    if (!text?.trim()) return Promise.resolve();
    
    if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();

    if (typeof puter === 'undefined' || !puter.ai || !puter.ai.txt2speech) {
        console.error("Puter.js AI library not available for TTS.");
        return Promise.resolve();
    }

    return new Promise((resolve) => {
      if (!isInterruptible) setPlayerStatus(PlayerStatus.SPEAKING);
      setCurrentCommentary(text);

      const handleEnd = () => {
        if (!isInterruptible) {
          cancellationRef.current = null;
          setCurrentCommentary('');
        }
        resolve();
      };
      
      const puterOptions = {
          language: dj.voiceLanguage || 'es-ES',
          engine: dj.voiceEngine || 'neural',
      };
      puter.ai.txt2speech(text, puterOptions).then((audio: HTMLAudioElement) => {
          currentPuterAudioRef.current = audio;
          audio.play().catch(playError => {
              console.error("Puter.js audio play() failed:", playError);
              handleEnd();
          });
          audio.onended = handleEnd;
          audio.onerror = (e: Event) => {
              const audioElement = e.target as HTMLAudioElement;
              let errorMessage = "An unknown playback error occurred.";
              if (audioElement && audioElement.error) {
                  errorMessage = `Code ${audioElement.error.code} - ${audioElement.error.message}`;
              }
              console.error("Puter.js TTS playback error:", errorMessage);
              handleEnd();
          };
          if (!isInterruptible) {
              cancellationRef.current = () => { if(audio) { audio.pause(); audio.src=''; } currentPuterAudioRef.current = null; };
          }
      }).catch((err: any) => {
          let errorMessage = "Puter.js TTS generation failed.";
          if (err instanceof Error) {
              errorMessage += ` Message: ${err.message}`;
          } else if (typeof err === 'object' && err !== null) {
              errorMessage += ` Details: ${JSON.stringify(err)}`;
          } else {
              errorMessage += ` Details: ${String(err)}`;
          }
          console.error(errorMessage);
          handleEnd();
      });
    });
  }, [cleanupCurrentTask, setPlayerStatus, dj]);
  
  const applyEQ = useCallback((genre: Genre) => {
    if (!eqNodesRef.current.length || !audioContextRef.current) return;
    const preset = EQ_PRESETS[genre] || EQ_PRESETS['Other'];
    eqNodesRef.current.forEach((filter, i) => {
      filter.gain.setValueAtTime(preset[i], audioContextRef.current!.currentTime);
    });
  }, []);

  const playSong = useCallback(async (songIndex: number, genre: Genre): Promise<void> => {
    cleanupCurrentTask();
    const context = audioContextRef.current;
    if (context?.state === 'suspended') await context.resume();
    
    const masterGain = masterGainRef.current;
    const songBuffer = songBuffersRef.current.get(songIndex);

    if (!context || !masterGain || !songBuffer) return Promise.resolve();
    
    return new Promise((resolve) => {
      const songData = songs.find(s => s.index === songIndex);
      if (songData) logSongPlay(songData.songId);

      const source = context.createBufferSource();
      source.buffer = songBuffer;
      source.connect(masterGainRef.current!);
      currentSourceRef.current = source;
      
      applyEQ(genre);

      source.start(0, 0);
      
      masterGain.gain.cancelScheduledValues(context.currentTime);
      masterGain.gain.setValueAtTime(masterGain.gain.value, context.currentTime);
      masterGain.gain.linearRampToValueAtTime(1, context.currentTime + FADE_TIME);
      
      setPlayerStatus(PlayerStatus.PLAYING);
      setAppState(AppState.PLAYING);
      
      const handleEnd = () => {
        if (currentSourceRef.current === source) {
            if(songData) logSongFinish(songData.songId);
            cancellationRef.current = null;
            currentSourceRef.current = null;
            resolve();
        }
      };
      
      source.onended = handleEnd;

      cancellationRef.current = () => { source.onended = null; try { source.stop(); } catch(e) { /* ignore */ } resolve(); };
    });
  }, [cleanupCurrentTask, applyEQ, songs, setAppState, setPlayerStatus]);

  const advancePlaylist = useCallback((nextIndex: number) => {
    cleanupCurrentTask();
    setLyrics({ text: null, isLoading: false }); // Reset lyrics for next song
    setPlaylistIndex(nextIndex);
  }, [cleanupCurrentTask]);

  const fadeOutAndExecute = (callback: () => void) => {
    const context = audioContextRef.current;
    const masterGain = masterGainRef.current;
    if (status === PlayerStatus.PLAYING && context && masterGain) {
        masterGain.gain.cancelScheduledValues(context.currentTime);
        masterGain.gain.setValueAtTime(masterGain.gain.value, context.currentTime);
        masterGain.gain.linearRampToValueAtTime(0, context.currentTime + FADE_TIME);
        setTimeout(() => { callback(); }, FADE_TIME * 1000);
    } else {
        callback();
    }
  }

  const handleDislike = () => {
    if (isTransitioning || status === PlayerStatus.ENDED || !currentSong) return;
    setIsTransitioning(true);
    if(show.userReactions?.onSkip) speak(show.userReactions.onSkip, true);
    logSongDislike(currentSong.songId);
    logSongSkip(currentSong.songId);
    fadeOutAndExecute(() => advancePlaylist(playlistIndex + 1));
  };
  
  const handleFavorite = useCallback(() => { if(currentSong) { if(show.userReactions?.onFavorite) speak(show.userReactions.onFavorite, true); logSongFavorite(currentSong.songId); setFavoritedSongs(prev => new Set(prev).add(currentSong.songId)); } }, [currentSong, show.userReactions, speak]);

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
          await generateAndSavePostShowEntry(dj, songs);
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
            const songData = songs.find(s => s.index === item.songIndex);
            if (!songData) { advancePlaylist(playlistIndex + 1); return; }
            await speak(item.commentary); if (isCancelled) return;
            await playSong(item.songIndex, item.genre); if (isCancelled) return;
            advancePlaylist(playlistIndex + 1);
        } else if (item.type === 'ad_break') {
            for (const ad of item.adverts) { await speak(ad); if (isCancelled) return; }
            advancePlaylist(playlistIndex + 1);
        } else if (item.type === 'jingle') {
            await speak(item.script); if(isCancelled) return;
            advancePlaylist(playlistIndex + 1);
        }
    };
    runSequence();
    return () => { isCancelled = true; cleanupCurrentTask(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistIndex]);

  // Visualizer effect
  useEffect(() => {
    if (status !== PlayerStatus.PLAYING || !analyserRef.current || !canvasRef.current) {
        if (visualizerAnimationRef.current) {
            cancelAnimationFrame(visualizerAnimationRef.current);
            visualizerAnimationRef.current = null;
        }
        return;
    }
    const analyser = analyserRef.current; 
    const canvas = canvasRef.current; 
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette: Palette = VISUALIZER_PALETTES[options.visualizerColorPalette] || VISUALIZER_PALETTES['neon_purple'];
    const bufferLength = analyser.frequencyBinCount; 
    const dataArray = new Uint8Array(bufferLength);
    
    const drawBars = () => {
        const barWidth = (canvas.clientWidth / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i];
            const grad = ctx.createLinearGradient(0, canvas.clientHeight, 0, canvas.clientHeight - barHeight);
            palette.gradient.forEach(stop => grad.addColorStop(stop[0], stop[1]));
            ctx.fillStyle = grad;
            ctx.shadowColor = palette.shadow;
            ctx.shadowBlur = 10;
            ctx.fillRect(x, canvas.clientHeight - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    };
    const drawWaveform = () => {
        ctx.lineWidth = 2;
        ctx.strokeStyle = palette.stroke || 'rgb(255, 255, 255)';
        ctx.shadowColor = palette.shadow;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        const sliceWidth = canvas.clientWidth * 1.0 / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.clientHeight / 2;
            if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
            x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    };
    const drawCircle = () => {
        const centerX = canvas.clientWidth / 2;
        const centerY = canvas.clientHeight / 2;
        const radius = Math.min(centerX, centerY) * 0.5;
        const barCount = bufferLength * 0.7;

        for (let i = 0; i < barCount; i++) {
            const barHeight = dataArray[i] * 0.5;
            const angle = (i / barCount) * Math.PI * 2;
            
            const x1 = centerX + radius * Math.cos(angle);
            const y1 = centerY + radius * Math.sin(angle);
            const x2 = centerX + (radius + barHeight) * Math.cos(angle);
            const y2 = centerY + (radius + barHeight) * Math.sin(angle);

            const grad = ctx.createLinearGradient(x1, y1, x2, y2);
            palette.gradient.forEach(stop => grad.addColorStop(stop[0], stop[1]));
            ctx.strokeStyle = grad;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    };
    const draw = () => {
        visualizerAnimationRef.current = requestAnimationFrame(draw);
        if(options.visualizerStyle === 'waveform') analyser.getByteTimeDomainData(dataArray); else analyser.getByteFrequencyData(dataArray);
        const dpr = window.devicePixelRatio || 1; canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr; ctx.scale(dpr, dpr); ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        switch(options.visualizerStyle) { case 'waveform': drawWaveform(); break; case 'circle': drawCircle(); break; case 'bars': default: drawBars(); break; }
        ctx.shadowBlur = 0;
    }; draw();
    return () => { if (visualizerAnimationRef.current) cancelAnimationFrame(visualizerAnimationRef.current); };
  }, [status, options.visualizerStyle, options.visualizerColorPalette]);


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
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = context;
        masterGainRef.current = context.createGain();
        volumeGainRef.current = context.createGain();
        analyserRef.current = context.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        let lastNode: AudioNode = volumeGainRef.current;
        eqNodesRef.current = EQ_FREQUENCIES.map(f => {
            const filter = context.createBiquadFilter();
            filter.type = 'peaking'; filter.frequency.value = f; filter.Q.value = 1.5; filter.gain.value = 0;
            lastNode.connect(filter); lastNode = filter; return filter;
        });
        
        eqNodesRef.current[eqNodesRef.current.length - 1].connect(analyserRef.current);
        masterGainRef.current.connect(lastNode);
        volumeGainRef.current.connect(context.destination);
        volumeGainRef.current.gain.value = isMuted ? 0 : volume;

        await Promise.all(songs.map(async (song) => {
          const res = await fetch(song.fileUrl); const buf = await res.arrayBuffer();
          songBuffersRef.current.set(song.index, await context.decodeAudioData(buf));
        }));
        
        await speak(show.showTitle);
        await speak(show.introCommentary);
        setPlaylistIndex(0);
      } catch(e) { console.error("Error initializing audio engine:", e); setCurrentCommentary("Error al cargar el audio."); setPlayerStatus(PlayerStatus.ENDED); }
    };
    initAudioEngine();
    return () => { cleanupCurrentTask(); audioContextRef.current?.close(); songs.forEach(s => URL.revokeObjectURL(s.fileUrl)); if(sleepTimerRef.current) clearTimeout(sleepTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (volumeGainRef.current) {
        lastVolumeRef.current = volume;
        volumeGainRef.current.gain.setValueAtTime(isMuted ? 0 : volume, audioContextRef.current?.currentTime || 0);
    }
  }, [volume, isMuted]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => { setVolume(Number(e.target.value)); setIsMuted(false); };
  const toggleMute = () => { if(isMuted) { setIsMuted(false); setVolume(lastVolumeRef.current || 0.5); } else { lastVolumeRef.current = volume; setIsMuted(true); setVolume(0); } };
  
  const isPlaying = status === PlayerStatus.PLAYING;
  const isControlDisabled = status === PlayerStatus.LOADING || status === PlayerStatus.ENDED;

  if (status === PlayerStatus.LOADING && playlistIndex < 0) {
      return (<div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center text-white"><LoaderCircle className="w-12 h-12 animate-spin text-purple-400 mb-4" /><p className="text-lg">Afinando el motor de audio...</p></div>);
  }
  
  return (
    <div ref={playerRef} className="fixed inset-0 bg-slate-900 text-white flex flex-col font-sans overflow-hidden select-none">
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
             <canvas ref={canvasRef} className="w-full max-w-4xl h-32 sm:h-48 md:h-56 transition-opacity duration-500" style={{ opacity: isPlaying ? 1 : 0.4}} />
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
                    <Radio size={20} className="animate-pulse" />
                    <span>On Air</span>
                </div>
                {currentSongItem && <p className="text-xs text-slate-400 mt-1">{currentSongItem.genre} &bull; {currentSong?.metadata.year || 'N/A'}</p>}
            </div>

            <button onClick={handleFavorite} aria-label="Marcar como favorita" className={`p-3 transition-colors disabled:text-slate-700 ${isSongFavorited ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`} disabled={!currentSongItem || isControlDisabled || isSongFavorited}><ThumbsUp size={28} className={isSongFavorited ? "fill-purple-400" : ""} /></button>
          </div>

           <div className="flex items-center justify-center gap-2 w-full sm:w-auto mt-6">
                <button onClick={toggleMute} aria-label={isMuted || volume === 0 ? 'Quitar silencio' : 'Silenciar'} className="p-2 text-slate-300 hover:text-white">{isMuted || volume === 0 ? <VolumeX size={20}/> : volume < 0.5 ? <Volume1 size={20}/> : <Volume2 size={20}/>}</button>
                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="progress-bar w-32" aria-label="Control de volumen" />
            </div>

        </footer>
      </div>
    </div>
  );
};

export default Player;
