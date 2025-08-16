import { LibrarySong } from '../types';
import { extractInitialMetadata } from './audioService';
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

    // Step 3: Filter for new songs and process them.
    const newSongsToProcess = candidates.filter(c => !existingIds.has(c.id));
    if (newSongsToProcess.length === 0) {
      console.log('All dropped songs are already in the library.');
      return;
    }

    // 3a: Extract minimal initial metadata (duration, filename parse).
    let songsWithBaseMeta: LibrarySong[] = await Promise.all(
        newSongsToProcess.map(async ({ id, file }) => {
            const metadata = await extractInitialMetadata(file);
            return { id, file, metadata };
        })
    );

    // 3b: Unconditionally try to identify with AudD.io for better base data.
    let songsAfterAudd: LibrarySong[] = await Promise.all(
        songsWithBaseMeta.map(async (song) => {
            console.log(`Identifying "${song.file.name}" with AudD.io...`);
            const auddData = await auddService.identifySong(song.file);
            if (auddData) {
                console.log(`AudD.io found a match:`, auddData);
                // Merge AudD.io data with our initial data (especially keeping the reliable duration).
                return { ...song, metadata: { ...song.metadata, ...auddData } };
            }
            console.log(`AudD.io found no match for "${song.file.name}".`);
            return song;
        })
    );


    // 3c: Enhance with AI (Gemini) for final details like cover art, year, genre.
    let songsToAdd: LibrarySong[];
    try {
        songsToAdd = await enhanceSongsMetadata(songsAfterAudd);
    } catch (e) {
        console.error("AI Metadata enhancement failed. Storing songs with data from AudD/fallback.", e);
        songsToAdd = songsAfterAudd; // Fallback to whatever we have before Gemini
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