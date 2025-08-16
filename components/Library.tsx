import React, { useState, useCallback, useEffect } from 'react';
import { CustomizationOptions, LibrarySong, SongMetadata, ResidentDJ, Intention } from '../types';
import { INTENTIONS } from '../constants';
import * as libraryService from '../services/libraryService';
import * as sessionFileService from '../services/sessionFileService';
import { getSongId } from '../services/historyService';
import { UploadCloud, Trash2, Loader2, Info, Pencil, X, Link, Link2Off, FolderSync } from 'lucide-react';
import CustomizationModal from './CustomizationModal';

const MetadataEditorModal = ({ song, onSave, onClose }: { song: LibrarySong; onSave: (updatedSong: LibrarySong) => void; onClose: () => void; }) => {
  const [metadata, setMetadata] = useState<SongMetadata>(song.metadata);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setMetadata(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ ...song, metadata }); };
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-xl animate-[fade-in_0.2s]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">Editar Metadatos</h3><button onClick={onClose} aria-label="Cerrar"><X size={24} /></button></div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">Título</label><input type="text" id="title" name="title" value={metadata.title} onChange={handleChange} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"/></div>
            <div><label htmlFor="artist" className="block text-sm font-medium text-slate-300 mb-2">Artista</label><input type="text" id="artist" name="artist" value={metadata.artist} onChange={handleChange} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"/></div>
            <div><label htmlFor="album" className="block text-sm font-medium text-slate-300 mb-2">Álbum</label><input type="text" id="album" name="album" value={metadata.album} onChange={handleChange} className="bg-slate-900 border border-slate-600 rounded-lg w-full p-2.5"/></div>
            <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={onClose} className="bg-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-600">Cancelar</button><button type="submit" className="bg-purple-600 font-bold py-2 px-4 rounded-lg hover:bg-purple-500">Guardar</button></div>
        </form>
      </div>
    </div>
  );
};


interface LibraryProps {
  activeDJ: ResidentDJ;
  onCreateShow: (songs: LibrarySong[], dj: ResidentDJ, options: CustomizationOptions) => void;
  onManageDJs: () => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const Library: React.FC<LibraryProps> = ({ activeDJ, onCreateShow, onManageDJs, error, setError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [songs, setSongs] = useState<LibrarySong[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<LibrarySong[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number, fileName: string } | null>(null);
  const [editingSong, setEditingSong] = useState<LibrarySong | null>(null);
  const [playableSongIds, setPlayableSongIds] = useState<Set<string>>(new Set());
  
  const [customizationState, setCustomizationState] = useState<{ intention: Intention; songs: LibrarySong[] } | null>(null);

  const checkPlayableStatus = useCallback(() => {
    const newPlayable = new Set<string>();
    songs.forEach(song => {
        if (sessionFileService.isFileInSessionStore(song.id)) {
            newPlayable.add(song.id);
        }
    });
    setPlayableSongIds(newPlayable);
  }, [songs]);

  const loadSongs = useCallback(async () => { 
    const allSongs = await libraryService.getAllSongs(); 
    setSongs(allSongs); 
    setFilteredSongs(allSongs);
    checkPlayableStatus();
  }, [checkPlayableStatus]);

  useEffect(() => { loadSongs(); }, [loadSongs]);
  useEffect(() => { checkPlayableStatus(); }, [songs, checkPlayableStatus]);

  useEffect(() => {
      const results = songs.filter(song => 
        song.metadata.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.metadata.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.metadata.album.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSongs(results);
  }, [searchTerm, songs]);

  const handleActivateFiles = useCallback(async (files: File[]) => {
    setError(null);
    files.forEach(file => {
      const id = getSongId(file);
      sessionFileService.addFileToSessionStore(id, file);
    });
    checkPlayableStatus();
  }, [checkPlayableStatus, setError]);


  const handleFileDrop = useCallback(async (files: File[]) => { 
    setIsImporting(true); 
    setUploadProgress({ current: 0, total: files.length, fileName: "" });
    setError(null); 
    try { 
        await libraryService.addSongs(files, (progress) => {
            setUploadProgress(progress);
        }); 
        await loadSongs(); 
    } catch (e) { 
        setError(e instanceof Error ? e.message : 'Error al importar.'); 
    } finally { 
        setIsImporting(false); 
        setUploadProgress(null);
    } 
  }, [loadSongs, setError]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleFileDrop(Array.from(e.dataTransfer.files)); }, [handleFileDrop]);
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); }; const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); }; const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
  
  const handleSongSelection = (songId: string) => { const newSelection = new Set(selectedSongIds); if (newSelection.has(songId)) newSelection.delete(songId); else newSelection.add(songId); setSelectedSongIds(newSelection); }
  const handleSelectAll = () => setSelectedSongIds(selectedSongIds.size === filteredSongs.length ? new Set() : new Set(filteredSongs.map(s => s.id)));
  const handleDeleteSelected = async () => { if (selectedSongIds.size > 0 && window.confirm(`Borrar ${selectedSongIds.size} canciones? Se eliminará la información de tu librería (los archivos locales no se verán afectados).`)) { await libraryService.deleteSongs(Array.from(selectedSongIds)); setSelectedSongIds(new Set()); await loadSongs(); } }
  const handleSaveMetadata = async (updatedSong: LibrarySong) => { await libraryService.updateSongs([updatedSong]); setEditingSong(null); await loadSongs(); };
  
  const handleIntentionClick = (intention: Intention) => {
      setError(null);
      let songsForShow: LibrarySong[];

      const selectedSongsFromLib = songs.filter(s => selectedSongIds.has(s.id));
      
      if (selectedSongIds.size > 0) {
          const unplayable = selectedSongsFromLib.filter(s => !playableSongIds.has(s.id));
          if (unplayable.length > 0) {
              setError(`Las siguientes canciones no están activas en esta sesión: ${unplayable.map(s => s.metadata.title).slice(0, 2).join(', ')}${unplayable.length > 2 ? '...' : ''}. Por favor, vuelve a vincular tus archivos de audio.`);
              return;
          }
          songsForShow = selectedSongsFromLib;
      } else {
          const playableSongs = songs.filter(s => playableSongIds.has(s.id));
          if(playableSongs.length < 2) {
            setError("Necesitas al menos 2 canciones activas en tu librería para el modo automático. Arrastra tus archivos para activarlos.");
            return;
          }
          const shuffled = [...playableSongs].sort(() => 0.5 - Math.random());
          songsForShow = shuffled.slice(0, Math.min(playableSongs.length, 15));
      }

      if (songsForShow.length < 2 || songsForShow.length > 50) {
          setError("Por favor, selecciona entre 2 y 50 canciones para el show.");
          return;
      }

      setCustomizationState({ intention, songs: songsForShow });
  };

  const handleConfirmCustomization = (songs: LibrarySong[], dj: ResidentDJ, options: CustomizationOptions) => {
    onCreateShow(songs, dj, options);
    setCustomizationState(null);
  };

  const renderEmptyState = () => (
     <div className="w-full text-center p-8"><h2 className="text-4xl md:text-5xl font-black text-white">¡Bienvenido a tu Estación!</h2><p className="text-lg text-slate-300 max-w-3xl mx-auto mt-4">Aquí es donde vive tu música. Arrastra tus archivos de audio para añadirlos a tu librería personal. {activeDJ.name} los analizará para preparar tu próxima sesión.</p>
        <div onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all mt-8 max-w-2xl mx-auto ${isDragging ? 'border-purple-500 bg-purple-500/10 scale-105' : 'border-slate-600'}`}>
            <input type="file" id="file-upload" multiple accept="audio/*" onChange={(e) => e.target.files && handleFileDrop(Array.from(e.target.files))} className="absolute inset-0 opacity-0 cursor-pointer"/>
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer"><UploadCloud className={`w-12 h-12 mb-3 ${isDragging ? 'text-purple-400' : 'text-slate-500'}`} /><p className="text-lg font-semibold">Añade Tus Primeras Canciones</p><p className="text-sm text-slate-400">Arrastra o haz clic para añadir a tu librería</p></label>
            {isImporting && (<div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center rounded-xl">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              <p className="mt-2 text-sm">Analizando y guardando metadatos...</p>
              {uploadProgress && uploadProgress.total > 0 && 
                  <p className="mt-1 text-xs text-slate-400 w-full px-4 truncate">
                      {uploadProgress.fileName ? `Procesando: ${uploadProgress.fileName}` : 'Preparando...'} ({uploadProgress.current}/{uploadProgress.total})
                  </p>
              }
            </div>)}
        </div>
     </div>
  );

  const renderLibrary = () => (
     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
              <h2 className="text-2xl font-bold">Librería de {activeDJ.name} ({songs.length})</h2>
              <input type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar en la librería..." className="bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm w-full sm:w-64" />
              {selectedSongIds.size > 0 && (<button onClick={handleDeleteSelected} className="bg-red-500/20 hover:bg-red-500/40 text-red-300 font-semibold py-2 px-3 rounded-lg flex items-center gap-2 text-sm"><Trash2 className="w-4 h-4" />Borrar ({selectedSongIds.size})</button>)}
            </div>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                <table className="w-full text-left text-sm">
                    <thead><tr className="border-b border-slate-700 text-slate-400"><th className="p-3 w-10"><input type="checkbox" onChange={handleSelectAll} checked={filteredSongs.length > 0 && selectedSongIds.size === filteredSongs.length} disabled={filteredSongs.length === 0}/></th><th className="p-3 w-10 text-center" title="Estado de Reproducción"><Link size={16}/></th><th className="p-3 w-16"></th><th className="p-3">Título / Artista</th><th className="p-3 hidden md:table-cell">Álbum</th><th className="p-3 hidden sm:table-cell">Año</th><th className="p-3 text-right">Dur.</th><th className="p-3 w-12"></th></tr></thead>
                    <tbody>{filteredSongs.map(song => {
                        const isPlayable = playableSongIds.has(song.id);
                        const pictureUrl = song.metadata.picture 
                            ? (song.metadata.picture.startsWith('http') || song.metadata.picture.startsWith('data:') ? song.metadata.picture : `data:image/jpeg;base64,${song.metadata.picture}`)
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(song.metadata.title[0] || 'A')}&background=4338CA&color=fff`;
                        
                        return (<tr key={song.id} className={`border-b border-slate-800 hover:bg-slate-700/50 ${selectedSongIds.has(song.id) ? 'bg-purple-500/10' : ''}`}>
                        <td className="p-3"><input type="checkbox" onChange={() => handleSongSelection(song.id)} checked={selectedSongIds.has(song.id)}/></td>
                        <td className="p-3 text-center" title={isPlayable ? 'Lista para reproducir' : 'Archivo no cargado en esta sesión'}>{isPlayable ? <Link size={16} className="text-green-400"/> : <Link2Off size={16} className="text-red-400"/>}</td>
                        <td className="p-3"><img src={pictureUrl} alt="album" className="w-10 h-10 rounded-md object-cover"/></td>
                        <td className="p-3 font-medium truncate max-w-xs">{song.metadata.title}<span className="block text-slate-400 font-normal">{song.metadata.artist}</span></td>
                        <td className="p-3 text-slate-300 hidden md:table-cell truncate max-w-xs">{song.metadata.album}</td>
                        <td className="p-3 text-slate-400 hidden sm:table-cell">{song.metadata.year || '-'}</td>
                        <td className="p-3 text-slate-400 text-right">{new Date(song.metadata.duration * 1000).toISOString().substr(14, 5)}</td>
                        <td className="p-3 text-center"><button onClick={() => setEditingSong(song)} className="p-2 rounded-full hover:bg-slate-700" aria-label={`Editar ${song.metadata.title}`}><Pencil size={16} /></button></td>
                    </tr>
                    )})
                    }</tbody>
                </table>
                 <div onDrop={(e) => { e.preventDefault(); handleActivateFiles(Array.from(e.dataTransfer.files)); }} onDragOver={handleDragOver} className="relative border-2 border-dashed rounded-xl p-4 text-center mt-4 border-slate-600">
                    <input type="file" id="file-activate-more" multiple accept="audio/*" onChange={(e) => e.target.files && handleActivateFiles(Array.from(e.target.files))} className="absolute inset-0 opacity-0 cursor-pointer"/>
                     <label htmlFor="file-activate-more" className="flex items-center justify-center cursor-pointer text-sm text-slate-400 gap-2"><FolderSync className="w-5 h-5 text-slate-500" />Activa tu música para esta sesión arrastrando tus archivos aquí.</label>
                </div>
            </div>
        </div>

        <div className="lg:col-span-1 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex flex-col gap-4 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-center">Motor de Intención de {activeDJ.name}</h3>
            <p className="text-sm text-slate-400 text-center">¿Qué quieres sentir? Elige una intención y deja que {activeDJ.name} se encargue del resto.</p>
            <div className="flex-grow grid grid-cols-2 gap-4 mt-4">
                {INTENTIONS.map(({ id, label, icon: Icon, color }) => (
                    <button key={id} onClick={() => handleIntentionClick(id)} className={`group relative rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all overflow-hidden bg-slate-800/80 border border-slate-700 hover:border-purple-500/50 hover:scale-105`}>
                       <div className={`absolute -inset-2 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-20 blur-xl transition-opacity`}></div>
                       <Icon className="w-10 h-10 mb-2" />
                       <span className="font-bold text-lg">{label}</span>
                    </button>
                ))}
            </div>
            <div className="mt-auto pt-4">
                 {error && <p className="bg-red-500/10 text-red-400 text-center mb-4 text-sm p-3 rounded-lg border border-red-500/20 animate-[fade-in_0.2s]">{error}</p>}
                 <p className="text-xs text-slate-500 text-center"><Info className="w-3 h-3 inline mr-1"/>Si no seleccionas canciones, el modo automático elegirá hasta 15 de tus canciones activas.</p>
            </div>
        </div>
     </div>
  );

  return (
    <div>
        {songs.length === 0 && !isImporting ? renderEmptyState() : renderLibrary()}
        {editingSong && (<MetadataEditorModal song={editingSong} onSave={handleSaveMetadata} onClose={() => setEditingSong(null)} />)}
        {customizationState && (
            <CustomizationModal 
                dj={activeDJ} 
                songs={customizationState.songs}
                intention={customizationState.intention}
                onConfirm={handleConfirmCustomization} 
                onCancel={() => setCustomizationState(null)} 
            />
        )}
    </div>
  );
};

export default Library;