

import { LibrarySong } from '../types';
import { extractInitialMetadata } from './audioService';
import { getSongId } from './historyService';
import { enhanceSongsMetadata, SongForEnhancement } from './geminiService';
import * as sessionFileService from './sessionFileService';

declare var puter: any;

const LIBRARY_KV_KEY = 'aiRadioSongLibrary_v4_local';

const isPuterReady = () => typeof puter !== 'undefined' && puter.kv;

export async function addSongs(files: File[], onProgress?: (progress: { current: number, total: number, fileName: string }) => void): Promise<void> {
    if (!isPuterReady()) throw new Error("Puter is not available.");

    const library: LibrarySong[] = await getAllSongs();
    const existingIds = new Set(library.map(s => s.id));

    const newFiles = files.filter(file => !existingIds.has(getSongId(file)));
    if (newFiles.length === 0) {
      console.log('All dropped songs are already in the library.');
      onProgress?.({ current: files.length, total: files.length, fileName: ""});
      // Activate existing files in session store
      files.forEach(file => sessionFileService.addFileToSessionStore(getSongId(file), file));
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
        
        // Add file to in-memory session store for playback
        sessionFileService.addFileToSessionStore(song.id, song.file);

        newLibrarySongs.push({
            id: song.id,
            metadata: song.metadata,
        });
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
    
    const updatedLibrary = library.filter(s => !idsToDelete.has(s.id));

    // Remove from session store as well
    songIds.forEach(id => sessionFileService.removeFileFromSessionStore(id));
    
    await puter.kv.set(LIBRARY_KV_KEY, updatedLibrary);
}