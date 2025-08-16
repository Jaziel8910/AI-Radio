

import { LibrarySong, SongMetadata } from '../types';
import { extractMetadataFromFile } from './audioService';
import { getSongId } from './historyService';
import { enhanceSongsMetadata } from './geminiService';
import * as auddService from './auddService';

const DB_NAME = 'AIRadioDB';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

let db: IDBDatabase;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

const isMetadataWeak = (metadata: SongMetadata, file: File): boolean => {
    if (metadata.artist === 'Artista Desconocido') return true;
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    if (metadata.title === fileNameWithoutExt || metadata.title === file.name) return true;
    return false;
};


export async function addSongs(files: File[]): Promise<void> {
    const db = await openDB();

    // Step 1: Create song candidates with IDs.
    const candidates = files.map(file => ({ id: getSongId(file), file }));

    // Step 2: Check for existence in a single read-only transaction.
    const readTx = db.transaction(STORE_NAME, 'readonly');
    const readStore = readTx.objectStore(STORE_NAME);
    const existingIds = new Set();
    await Promise.all(candidates.map(c =>
        new Promise<void>(resolve => {
            const req = readStore.get(c.id);
            req.onsuccess = () => {
                if (req.result) {
                    existingIds.add(c.id);
                }
                resolve();
            }
            req.onerror = () => resolve(); // Assume not found on error
        })
    ));

    // Step 3: Filter for new songs and process them (outside of any transaction).
    const newSongsToProcess = candidates.filter(c => !existingIds.has(c.id));
    if (newSongsToProcess.length === 0) {
      console.log('All dropped songs are already in the library.');
      return;
    }

    // 3a: Extract basic metadata.
    let songsWithInitialMeta: LibrarySong[] = await Promise.all(
        newSongsToProcess.map(async ({ id, file }) => {
            const metadata = await extractMetadataFromFile(file);
            return { id, file, metadata };
        })
    );

    // 3b: Enhance with AudD.io if metadata is weak
    songsWithInitialMeta = await Promise.all(
        songsWithInitialMeta.map(async (song) => {
            if (isMetadataWeak(song.metadata, song.file)) {
                console.log(`Weak metadata for "${song.file.name}", trying AudD.io...`);
                const auddData = await auddService.identifySong(song.file);
                if (auddData) {
                    console.log(`AudD.io found a match for "${song.file.name}":`, auddData);
                    return { ...song, metadata: { ...song.metadata, ...auddData } };
                }
            }
            return song;
        })
    );


    // 3c: Enhance with AI (Gemini). This is the slow part.
    let songsToAdd: LibrarySong[];
    try {
        songsToAdd = await enhanceSongsMetadata(songsWithInitialMeta);
    } catch (e) {
        console.error("AI Metadata enhancement failed. Storing songs with basic metadata.", e);
        songsToAdd = songsWithInitialMeta; // Fallback to basic metadata on error
    }

    // Step 4: Add the processed songs in a single write transaction.
    const writeTx = db.transaction(STORE_NAME, 'readwrite');
    const writeStore = writeTx.objectStore(STORE_NAME);
    songsToAdd.forEach(song => {
        writeStore.add(song);
    });

    return new Promise((resolve, reject) => {
        writeTx.oncomplete = () => resolve();
        writeTx.onerror = () => reject(writeTx.error);
    });
}


export async function getAllSongs(): Promise<LibrarySong[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function updateSongs(songs: LibrarySong[]): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const promises = songs.map(song => {
        return new Promise<void>((resolve, reject) => {
            const request = store.put(song);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });

    await Promise.all(promises);
}


export async function deleteSongs(songIds: string[]): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const promises = songIds.map(id => {
        return new Promise<void>((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });

    await Promise.all(promises);
}