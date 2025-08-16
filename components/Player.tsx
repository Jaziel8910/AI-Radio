import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnalyzedSong, RadioShow, AppState, PlaylistItem, SongItem, Genre, Source, CustomizationOptions } from '../types';
import { Play, Pause, SkipBack, SkipForward, MoreVertical, ThumbsUp, ThumbsDown, Share2, Maximize, X, FileText, Minimize, LoaderCircle, Volume2, Volume1, VolumeX, BookOpen, Clock } from 'lucide-react';
import { logSongPlay, logSongFinish, logSongFavorite, logSongSkip, logSongDislike } from '../services/historyService';
import { getLyrics } from '../services/geminiService';
import { VISUALIZER_PALETTES, Palette } from '../constants';

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

enum PlayerStatus { LOADING, SPEAKING, PLAYING, PAUSED, ENDED }

interface PlayerProps {
  show: RadioShow;
  songs: AnalyzedSong[];
  options: CustomizationOptions;
  setAppState: (state: AppState) => void;
  onClose: () => void;
}

const Player: React.FC<PlayerProps> = ({ show, songs, options, setAppState, onClose }) => {
  const [status, setStatus] = useState<PlayerStatus>(PlayerStatus.LOADING);
  const [playlistIndex, setPlaylistIndex] = useState(-1);
  const [currentCommentary, setCurrentCommentary] = useState('');
  const [progress, setProgress] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [favoritedSongs, setFavoritedSongs] = useState<Set<string>>(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [isLyricsVisible, setIsLyricsVisible] = useState(false);
  const [lyrics, setLyrics] = useState<{ text: string | null, isLoading: boolean }>({ text: null, isLoading: false });
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const volumeGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const songBuffersRef = useRef<Map<number, AudioBuffer>>(new Map());
  
  const songStartedAtRef = useRef(0);
  const songPausedAtRef = useRef(0);
  const progressAnimationRef = useRef<number | null>(null);
  const visualizerAnimationRef = useRef<number | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancellationRef = useRef<(() => void) | null>(null);
  const lastVolumeRef = useRef(volume);
  const sleepTimerRef = useRef<number | null>(null);

  const currentPlaylistItem = playlistIndex >= 0 && playlistIndex < show.playlist.length ? show.playlist[playlistIndex] : null;
  const currentSongItem = currentPlaylistItem?.type === 'song' ? currentPlaylistItem as SongItem : null;
  const currentSong = currentSongItem ? songs.find(s => s.index === currentSongItem.songIndex) : null;
  const currentSongDuration = currentSong?.metadata.duration || 0;
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

  const speak = useCallback((text: string, isInterruptible: boolean = false): Promise<void> => {
    if(!isInterruptible) cleanupCurrentTask();
    if (!text?.trim() || !window.speechSynthesis) return Promise.resolve();
    
    return new Promise((resolve) => {
        if(!isInterruptible) setPlayerStatus(PlayerStatus.SPEAKING);
        setCurrentCommentary(text);
        
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.voiceURI === options.djVoiceURI);
        
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.lang = selectedVoice?.lang || 'es-ES';
        utterance.pitch = options.speechPitch;
        utterance.rate = options.speechRate;

        const handleEnd = () => { clearTimeout(speakTimeout); if(!isInterruptible) {cancellationRef.current = null; setCurrentCommentary('');} resolve(); };
        const speakTimeout = setTimeout(() => { window.speechSynthesis.cancel(); }, 15000);

        utterance.onend = handleEnd;
        utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
            if (e.error !== 'canceled') console.error(`Speech synthesis error: ${e.error}.`);
            handleEnd();
        };
        
        if(!isInterruptible) cancellationRef.current = () => { clearTimeout(speakTimeout); window.speechSynthesis.cancel(); };
        window.speechSynthesis.speak(utterance);
    });
  }, [cleanupCurrentTask, setPlayerStatus, options]);
  
  const applyEQ = useCallback((genre: Genre) => {
    if (!eqNodesRef.current.length || !audioContextRef.current) return;
    const preset = EQ_PRESETS[genre] || EQ_PRESETS['Other'];
    eqNodesRef.current.forEach((filter, i) => {
      filter.gain.setValueAtTime(preset[i], audioContextRef.current!.currentTime);
    });
  }, []);

  const playSong = useCallback((songIndex: number, genre: Genre): Promise<void> => {
    cleanupCurrentTask();
    const context = audioContextRef.current;
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

      const offset = songPausedAtRef.current;
      source.start(0, offset);
      songStartedAtRef.current = context.currentTime - offset;
      
      masterGain.gain.cancelScheduledValues(context.currentTime);
      masterGain.gain.setValueAtTime(masterGain.gain.value, context.currentTime);
      masterGain.gain.linearRampToValueAtTime(1, context.currentTime + FADE_TIME);
      
      setPlayerStatus(PlayerStatus.PLAYING);
      setAppState(AppState.PLAYING);
      
      const handleEnd = () => {
        if (currentSourceRef.current === source) {
            const elapsed = context.currentTime - songStartedAtRef.current;
            if (elapsed >= songBuffer.duration - 0.5) if(songData) logSongFinish(songData.songId);
            cancellationRef.current = null;
            currentSourceRef.current = null;
            songPausedAtRef.current = 0;
            resolve();
        }
      };
      
      source.onended = handleEnd;

      cancellationRef.current = () => { source.onended = null; try { source.stop(); } catch(e) { /* ignore */ } resolve(); };
    });
  }, [cleanupCurrentTask, applyEQ, songs, setAppState, setPlayerStatus]);

  const advancePlaylist = useCallback((nextIndex: number) => {
    cleanupCurrentTask();
    setProgress(0);
    setLyrics({ text: null, isLoading: false }); // Reset lyrics for next song
    songPausedAtRef.current = 0;
    if (progressAnimationRef.current) cancelAnimationFrame(progressAnimationRef.current);
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

  const handleSkipForward = () => {
    if (isTransitioning || status === PlayerStatus.ENDED) return;
    setIsTransitioning(true);
    if(show.userReactions?.onSkip) speak(show.userReactions.onSkip, true);
    if (currentSong) logSongSkip(currentSong.songId);
    fadeOutAndExecute(() => advancePlaylist(playlistIndex + 1));
  };
  
  const handleSkipBack = () => {
    if (isTransitioning || playlistIndex <= 0) return;
    setIsTransitioning(true);
    fadeOutAndExecute(() => advancePlaylist(playlistIndex - 1));
  };
  
  const handleTogglePlayPause = useCallback(async () => {
    const context = audioContextRef.current;
    if (!context || !currentSongItem) return;
    if (context.state === 'suspended') await context.resume();

    if (status === PlayerStatus.PLAYING) {
      if(show.userReactions?.onPause) speak(show.userReactions.onPause, true);
      songPausedAtRef.current = context.currentTime - songStartedAtRef.current;
      fadeOutAndExecute(() => { cleanupCurrentTask(); setPlayerStatus(PlayerStatus.PAUSED); });
    } else if (status === PlayerStatus.PAUSED) {
        if(show.userReactions?.onPlay) speak(show.userReactions.onPlay, true);
        playSong(currentSongItem.songIndex, currentSongItem.genre)
          .then(() => advancePlaylist(playlistIndex + 1));
    }
  }, [status, currentSongItem, playlistIndex, cleanupCurrentTask, playSong, advancePlaylist, setPlayerStatus, show.userReactions, speak]);
  
  const handleFavorite = useCallback(() => { if(currentSong) { if(show.userReactions?.onFavorite) speak(show.userReactions.onFavorite, true); logSongFavorite(currentSong.songId); setFavoritedSongs(prev => new Set(prev).add(currentSong.songId)); } }, [currentSong, show.userReactions, speak]);

  const handleDislikeAndSkip = () => {
    if (isTransitioning || status === PlayerStatus.ENDED || !currentSong) return;
    logSongDislike(currentSong.songId);
    handleSkipForward();
  };
  
  const handleShare = async () => { if (!navigator.share) return; try { await navigator.share({ title: 'AI Radio', text: `Estoy escuchando "${show.showTitle}" con "${currentSong?.metadata.title}" en AI Radio!`, url: window.location.href }); } catch (err) { console.error("Error al compartir:", err); } finally { setIsMenuOpen(false); } };
  
  const handleToggleFullScreen = () => { if (!playerRef.current) return; if (!document.fullscreenElement) { playerRef.current.requestFullscreen(); } else { document.exitFullscreen(); } setIsMenuOpen(false); };
  
  const handleShowSources = () => { if (!show.sources?.length) return; alert(`Fuentes de IA:\n\n${show.sources.map(s => `- ${s.title}: ${s.uri}`).join('\n')}`); setIsMenuOpen(false); }
  
  const handleToggleLyrics = async () => {
    if (!currentSong) return;
    if (isLyricsVisible) { setIsLyricsVisible(false); return; }
    setIsLyricsVisible(true);
    setIsMenuOpen(false);
    if (lyrics.text) return;
    setLyrics({ text: null, isLoading: true });
    try {
        const fetchedLyrics = await getLyrics(currentSong.metadata.title, currentSong.metadata.artist);
        setLyrics({ text: fetchedLyrics, isLoading: false });
    } catch(e) {
        setLyrics({ text: "No se pudieron encontrar las letras.", isLoading: false });
    }
  };

  const handleSetSleepTimer = (minutes: number | null) => {
    setSleepTimer(minutes);
    setIsMenuOpen(false);
    if(sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    if(minutes !== null) {
      sleepTimerRef.current = window.setTimeout(onClose, minutes * 60 * 1000);
      speak(`Temporizador activado. La música se detendrá en ${minutes} minutos.`, true);
    } else {
      speak(`Temporizador desactivado.`, true);
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
  }, [playlistIndex, status]);

  useEffect(() => {
    const updateProgress = () => {
      if (status === PlayerStatus.PLAYING && audioContextRef.current && currentSongDuration > 0) {
        const elapsed = songPausedAtRef.current > 0 ? songPausedAtRef.current : (audioContextRef.current.currentTime - songStartedAtRef.current);
        setProgress(Math.min((elapsed / currentSongDuration) * 100, 100));
      }
      progressAnimationRef.current = requestAnimationFrame(updateProgress);
    };
    if(status === PlayerStatus.PLAYING) progressAnimationRef.current = requestAnimationFrame(updateProgress);
    else if (progressAnimationRef.current) cancelAnimationFrame(progressAnimationRef.current);
    return () => { if (progressAnimationRef.current) cancelAnimationFrame(progressAnimationRef.current) };
  }, [status, currentSongDuration]);

  // Visualizer effect
  useEffect(() => {
    if (status !== PlayerStatus.PLAYING || !analyserRef.current || !canvasRef.current) {
        if (visualizerAnimationRef.current) cancelAnimationFrame(visualizerAnimationRef.current);
        visualizerAnimationRef.current = null;
        return;
    }
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const palette: Palette = VISUALIZER_PALETTES[options.visualizerColorPalette] || VISUALIZER_PALETTES['neon_purple'];
    if (!ctx) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const drawBars = () => {
        const width = canvas.clientWidth; const height = canvas.clientHeight;
        const barWidth = 4; const gap = 2; const numBarsToShow = 80;
        const step = Math.floor(bufferLength / numBarsToShow); const centerX = width / 2;
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        palette.gradient.forEach(stop => gradient.addColorStop(stop[0], stop[1]));

        for (let i = 0; i < numBarsToShow / 2; i++) {
            let barHeight = (dataArray[i * step] / 255) * height * 0.9; if (barHeight < 2) barHeight = 2;
            ctx.fillStyle = gradient; ctx.shadowBlur = 8; ctx.shadowColor = palette.shadow;
            const xRight = centerX + i * (barWidth + gap); const xLeft = centerX - (i + 1) * (barWidth + gap);
            ctx.fillRect(xRight, height - barHeight, barWidth, barHeight); ctx.fillRect(xLeft, height - barHeight, barWidth, barHeight);
        }
    };
    const drawWaveform = () => {
        const width = canvas.clientWidth; const height = canvas.clientHeight;
        ctx.lineWidth = 3;
        ctx.strokeStyle = palette.stroke || palette.shadow; ctx.shadowBlur = 10; ctx.shadowColor = palette.shadow;
        ctx.beginPath();
        const sliceWidth = width * 1.0 / bufferLength; let x = 0;
        for(let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0; const y = v * height/2;
            if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            x += sliceWidth;
        }
        ctx.lineTo(width, height/2); ctx.stroke();
    };
    const drawCircle = () => {
        const width = canvas.clientWidth; const height = canvas.clientHeight;
        const centerX = width/2; const centerY = height/2;
        const radius = Math.min(width, height) / 4;
        const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius * 1.5);
        palette.gradient.forEach(stop => gradient.addColorStop(stop[0], stop[1]));

        ctx.beginPath();
        for (let i = 0; i <= 360; i++) {
            const index = Math.floor((i / 360) * bufferLength);
            const amplitude = dataArray[index] / 255;
            const r = radius * (1 + amplitude * 0.5);
            const angle = (i - 90) * (Math.PI / 180);
            const x = centerX + r * Math.cos(angle);
            const y = centerY + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        
        ctx.strokeStyle = palette.stroke || palette.shadow; ctx.fillStyle = gradient; ctx.lineWidth = 3;
        ctx.shadowColor = palette.shadow; ctx.shadowBlur = 15;
        ctx.stroke(); ctx.fill();
    };

    const draw = () => {
        visualizerAnimationRef.current = requestAnimationFrame(draw);
        if(options.visualizerStyle === 'waveform') analyser.getByteTimeDomainData(dataArray);
        else analyser.getByteFrequencyData(dataArray);
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

        switch(options.visualizerStyle) {
            case 'waveform': drawWaveform(); break;
            case 'circle': drawCircle(); break;
            case 'bars': default: drawBars(); break;
        }
        ctx.shadowBlur = 0;
    };
    draw();

    return () => { if (visualizerAnimationRef.current) cancelAnimationFrame(visualizerAnimationRef.current); };
  }, [status, options.visualizerStyle, options.visualizerColorPalette]);


  useEffect(() => { const fsChangeHandler = () => setIsFullScreen(!!document.fullscreenElement); document.addEventListener('fullscreenchange', fsChangeHandler); return () => document.removeEventListener('fullscreenchange', fsChangeHandler); }, []);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || isLyricsVisible) return;
          switch (e.code) {
              case 'Space': e.preventDefault(); handleTogglePlayPause(); break;
              case 'ArrowRight': handleSkipForward(); break;
              case 'ArrowLeft': handleSkipBack(); break;
              case 'KeyF': handleFavorite(); break;
              case 'KeyL': handleToggleLyrics(); break;
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlayPause, handleSkipForward, handleSkipBack, handleFavorite, handleToggleLyrics, isLyricsVisible]);


  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentSongItem) return;
    const newTime = (Number(e.target.value) / 100) * currentSongDuration;
    cleanupCurrentTask();
    songPausedAtRef.current = newTime;
    playSong(currentSongItem.songIndex, currentSongItem.genre).then(() => advancePlaylist(playlistIndex + 1));
  };

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

  const formatTime = (seconds: number) => { if (isNaN(seconds) || seconds < 0) return '0:00'; const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60); return `${m}:${s < 10 ? '0' : ''}${s}`; };
  const elapsedSeconds = status === PlayerStatus.PLAYING ? (audioContextRef.current?.currentTime || 0) - songStartedAtRef.current : songPausedAtRef.current;
  const isPlaying = status === PlayerStatus.PLAYING;
  const isControlDisabled = status === PlayerStatus.LOADING || status === PlayerStatus.SPEAKING || status === PlayerStatus.ENDED;

  if (status === PlayerStatus.LOADING && playlistIndex < 0) {
      return (<div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center text-white"><LoaderCircle className="w-12 h-12 animate-spin text-purple-400 mb-4" /><p className="text-lg">Afinando el motor de audio...</p></div>);
  }
  
  return (
    <div ref={playerRef} className="fixed inset-0 bg-slate-900 text-white flex flex-col font-sans overflow-hidden select-none">
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 transition-all duration-1000" style={{ backgroundImage: show.showArt ? `url(${show.showArt})` : '', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="absolute inset-0 z-0 bg-black/60 backdrop-blur-2xl"></div>
      
      {isLyricsVisible && (
        <div className="absolute inset-0 z-20 bg-slate-900/90 backdrop-blur-md flex flex-col p-4 sm:p-8" onClick={handleToggleLyrics}>
            <div className="flex justify-between items-center flex-shrink-0">
              <h3 className="text-xl font-bold text-white">{currentSong?.metadata.title} - Letras</h3>
              <button onClick={handleToggleLyrics} className="p-2 -mr-2 text-slate-300 hover:text-white transition-colors rounded-full hover:bg-white/10"><X size={28} /></button>
            </div>
            <div className="flex-grow overflow-y-auto mt-4 pr-4 text-slate-200 text-lg sm:text-2xl leading-relaxed whitespace-pre-wrap font-semibold">
                {lyrics.isLoading ? <LoaderCircle className="w-12 h-12 animate-spin text-purple-400 mx-auto mt-8" /> : lyrics.text}
            </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full p-4 sm:p-6 md:p-8">
        <header className="flex justify-between items-center w-full flex-shrink-0">
          <button onClick={onClose} aria-label="Cerrar reproductor" className="p-2 -ml-2 text-slate-300 hover:text-white transition-colors rounded-full hover:bg-white/10"><X size={28} /></button>
          <div className="text-center"><p className="text-sm uppercase tracking-widest text-slate-400">Ahora en AI Radio</p><p className="font-bold text-white truncate max-w-[200px] sm:max-w-xs">{show.showTitle}</p></div>
          <div className="relative">
            <button onClick={() => setIsMenuOpen(v => !v)} aria-label="Más opciones" className="p-2 -mr-2 text-slate-300 hover:text-white transition-colors rounded-full hover:bg-white/10"><MoreVertical size={24} /></button>
            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-lg py-2 z-20 border border-slate-700">
                <button onClick={handleToggleLyrics} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-left hover:bg-slate-700/80 disabled:text-slate-500" disabled={!currentSong}><BookOpen size={16}/> Ver Letras</button>
                <div className="relative group">
                  <button className="flex items-center gap-3 w-full px-4 py-2 text-sm text-left hover:bg-slate-700/80"><Clock size={16}/> Temporizador</button>
                  <div className="absolute bottom-0 right-full mr-2 w-40 bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-lg py-2 z-30 border border-slate-700 hidden group-hover:block">
                    <button onClick={() => handleSetSleepTimer(15)} className="w-full px-4 py-2 text-sm text-left hover:bg-slate-700/80">15 minutos</button>
                    <button onClick={() => handleSetSleepTimer(30)} className="w-full px-4 py-2 text-sm text-left hover:bg-slate-700/80">30 minutos</button>
                    <button onClick={() => handleSetSleepTimer(60)} className="w-full px-4 py-2 text-sm text-left hover:bg-slate-700/80">60 minutos</button>
                    {sleepTimer && <button onClick={() => handleSetSleepTimer(null)} className="w-full px-4 py-2 text-sm text-left text-red-400 hover:bg-red-500/20">Cancelar</button>}
                  </div>
                </div>
                {show.sources?.length && (<button onClick={handleShowSources} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-left hover:bg-slate-700/80"><FileText size={16}/> Ver Fuentes de IA</button>)}
                <button onClick={handleShare} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-left hover:bg-slate-700/80"><Share2 size={16}/> Compartir Show</button>
                <button onClick={handleToggleFullScreen} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-left hover:bg-slate-700/80">{isFullScreen ? <><Minimize size={16}/> Salir</> : <><Maximize size={16}/> Pantalla Completa</>}</button>
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
          <div className="mt-2">
            <input type="range" min="0" max="100" value={progress} onInput={handleSeek} disabled={!currentSongItem || isControlDisabled} className="progress-bar w-full" aria-label="Progreso de la canción" />
            <div className="flex justify-between text-xs text-slate-400 mt-2 px-1"><span>{formatTime(elapsedSeconds)}</span><span>{formatTime(currentSongDuration)}</span></div>
          </div>
          <div className="flex justify-between items-center gap-4 sm:gap-6 mt-4">
              <button onClick={handleDislikeAndSkip} aria-label="No me gusta esta canción" className="text-slate-400 hover:text-white transition-colors p-3 disabled:text-slate-700 disabled:cursor-not-allowed hidden sm:block" disabled={!currentSongItem || isControlDisabled || isTransitioning}><ThumbsDown size={28} /></button>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button onClick={toggleMute} aria-label={isMuted || volume === 0 ? 'Quitar silencio' : 'Silenciar'} className="p-2 text-slate-300 hover:text-white">{isMuted || volume === 0 ? <VolumeX size={20}/> : volume < 0.5 ? <Volume1 size={20}/> : <Volume2 size={20}/>}</button>
                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="progress-bar w-24" aria-label="Control de volumen" />
              </div>
          </div>
          <div className="flex justify-center items-center gap-4 sm:gap-6 mt-4">
              <button onClick={handleDislikeAndSkip} aria-label="No me gusta esta canción" className="text-slate-400 hover:text-white transition-colors p-3 disabled:text-slate-700 disabled:cursor-not-allowed sm:hidden" disabled={!currentSongItem || isControlDisabled || isTransitioning}><ThumbsDown size={28} /></button>
              <button onClick={handleSkipBack} aria-label="Canción anterior" className="text-slate-300 hover:text-white p-3 disabled:text-slate-600" disabled={playlistIndex <= 0 || isTransitioning}><SkipBack size={36} /></button>
              <button onClick={handleTogglePlayPause} aria-label={isPlaying ? 'Pausar' : 'Reproducir'} disabled={!currentSongItem || isControlDisabled} className="bg-purple-600 text-white w-20 h-20 rounded-full flex items-center justify-center transition shadow-lg hover:scale-105 disabled:bg-slate-500 disabled:cursor-not-allowed shadow-purple-500/30 hover:shadow-purple-500/50">{isPlaying ? <Pause size={40} className="fill-white" /> : <Play size={40} className="fill-white ml-1" />}</button>
              <button onClick={handleSkipForward} aria-label="Siguiente canción" className="text-slate-300 hover:text-white p-3 disabled:text-slate-600" disabled={status === PlayerStatus.ENDED || isTransitioning}><SkipForward size={36} /></button>
              <button onClick={handleFavorite} aria-label="Marcar como favorita" className={`p-3 transition-colors disabled:text-slate-700 ${isSongFavorited ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`} disabled={!currentSongItem || isControlDisabled || isSongFavorited}><ThumbsUp size={28} className={isSongFavorited ? "fill-purple-400" : ""} /></button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Player;