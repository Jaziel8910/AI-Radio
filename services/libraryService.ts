

import { LibrarySong } from '../types';
import { extractInitialMetadata } from './audioService';
import { getSongId } from './historyService';
import { enhanceSongsMetadata, SongForEnhancement } from './geminiService';

declare var puter: any;

const LIBRARY_KV_KEY = 'aiRadioSongLibrary_v3';
const LIBRARY_FS_PATH = '/ai-radio/library/';

const isPuterReady = () => typeof puter !== 'undefined' && puter.kv && puter.fs;

export async function addSongs(files: File[], onProgress?: (progress: { current: number, total: number, fileName: string }) => void): Promise<void> {
    if (!isPuterReady()) throw new Error("Puter is not available.");

    await puter.fs.mkdir(LIBRARY_FS_PATH).catch((e: any) => { /* Fails silently if dir exists */ });

    const library: LibrarySong[] = await getAllSongs();
    const existingIds = new Set(library.map(s => s.id));

    const newFiles = files.filter(file => !existingIds.has(getSongId(file)));
    if (newFiles.length === 0) {
      console.log('All dropped songs are already in the library.');
      onProgress?.({ current: files.length, total: files.length, fileName: ""});
      return;
    }

    let songsWithBaseMeta: SongForEnhancement[] = await Promise.all(
        newFiles.map(async (file) => {
            const id = getSongId(file);
            const metadata = await extractInitialMetadata(file);
            return { id, file, metadata };
        })
    );

    let enhancedSongs: SongForEnhancement[];
    try {
        enhancedSongs = await enhanceSongsMetadata(songsWithBaseMeta);
    } catch (e) {
        console.error("AI Metadata enhancement failed. Storing songs with fallback data.", e);
        enhancedSongs = songsWithBaseMeta;
    }

    const newLibrarySongs: LibrarySong[] = [];
    for (let i = 0; i < enhancedSongs.length; i++) {
        const song = enhancedSongs[i];
        onProgress?.({ current: i + 1, total: enhancedSongs.length, fileName: song.file.name });
        
        const safeFileName = song.id.replace(/[^a-zA-Z0-9.-_]/g, '_');
        const fsPath = `${LIBRARY_FS_PATH}${safeFileName}`;

        try {
            await puter.fs.write(fsPath, song.file);
            newLibrarySongs.push({
                id: song.id,
                metadata: song.metadata,
                puterFsPath: fsPath,
                mimeType: song.file.type || 'audio/mpeg',
            });
        } catch (uploadError) {
            console.error(`Failed to upload ${song.file.name} to Puter FS:`, uploadError);
        }
    }
    
    const updatedLibrary = [...library, ...newLibrarySongs];
    await puter.kv.set(LIBRARY_KV_KEY, updatedLibrary);
}


export async function getAllSongs(): Promise<LibrarySong[]> {
  if (!isPuterReady()) return [];
  try {
      const songs = await puter.kv.get(LIBRARY_KV_KEY);
      return songs || [];
  } catch (error) {
      console.error("Error fetching song library from Puter KV:", error);
      return [];
  }
}

export async function updateSongs(songsToUpdate: LibrarySong[]): Promise<void> {
    if (!isPuterReady()) return;
    const library = await getAllSongs();
    const songsMap = new Map(library.map(s => [s.id, s]));
    songsToUpdate.forEach(song => songsMap.set(song.id, song));
    await puter.kv.set(LIBRARY_KV_KEY, Array.from(songsMap.values()));
}

export async function deleteSongs(songIds: string[]): Promise<void> {
    if (!isPuterReady()) return;
    const library = await getAllSongs();
    const idsToDelete = new Set(songIds);
    
    const songsToDelete = library.filter(s => idsToDelete.has(s.id));
    const updatedLibrary = library.filter(s => !idsToDelete.has(s.id));

    await Promise.all(songsToDelete.map(song => 
        puter.fs.del(song.puterFsPath).catch((e: any) => console.error(`Failed to delete ${song.puterFsPath} from Puter FS`, e))
    ));
    
    await puter.kv.set(LIBRARY_KV_KEY, updatedLibrary);
}
