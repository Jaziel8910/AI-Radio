
import { ResidentDJ, LibrarySong, ListeningHistory, DJDiaryEntry, CustomizationOptions, Intention } from '../types';
import * as djService from './djService';
import * as libraryService from './libraryService';

declare var puter: any;

const isPuterReady = () => typeof puter !== 'undefined' && puter.kv && puter.fs;

// --- LOCALSTORAGE MIGRATION ---

const MIGRATION_FLAG_KEY_Puter = 'aiRadioPuterMigration_v1';
const LEGACY_DJ_KEY_LS = 'aiRadioResidentDJ';
const LEGACY_HISTORY_KEY_LS = 'aiRadioListeningHistory';
const LEGACY_DIARY_KEY_PREFIX_LS = 'aiRadioDJDiary_';
const LEGACY_PREFS_KEY_PREFIX_LS = 'aiRadioUserPrefs_';


export const migrateAllFromLocalStorage = async (): Promise<void> => {
    if (!isPuterReady()) return;

    const migrationCompleted = await puter.kv.get(MIGRATION_FLAG_KEY_Puter);
    if (migrationCompleted) {
        return;
    }

    console.log("Checking for legacy data in localStorage to migrate to Puter KV...");

    try {
        // 1. Migrate DJs
        const legacyDJString = localStorage.getItem(LEGACY_DJ_KEY_LS);
        if (legacyDJString) {
            console.log("Migrating legacy DJ...");
            const legacyDJ = JSON.parse(legacyDJString);
            const newDJ: ResidentDJ = {
                id: crypto.randomUUID(),
                name: legacyDJ.name,
                persona: legacyDJ.persona,
                dna: { humor: 0, energy: 0, knowledge: 0, tone: 0 },
                voiceLanguage: 'es-ES',
                voiceEngine: 'neural',
            };
            await djService.saveDJs([newDJ]);
            await djService.setActiveDJId(newDJ.id);
            localStorage.removeItem(LEGACY_DJ_KEY_LS);
        }

        // 2. Migrate History
        const legacyHistoryString = localStorage.getItem(LEGACY_HISTORY_KEY_LS);
        if (legacyHistoryString) {
            console.log("Migrating listening history...");
            const legacyHistory = JSON.parse(legacyHistoryString);
            await puter.kv.set('aiRadioListeningHistory', legacyHistory);
            localStorage.removeItem(LEGACY_HISTORY_KEY_LS);
        }

        // 3. Migrate Diaries and Preferences (requires iterating keys)
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;

            if (key.startsWith(LEGACY_DIARY_KEY_PREFIX_LS)) {
                console.log(`Migrating diary: ${key}`);
                const content = localStorage.getItem(key);
                if (content) {
                    await puter.kv.set(key, JSON.parse(content));
                    localStorage.removeItem(key);
                    i--; // Adjust index after removal
                }
            } else if (key.startsWith(LEGACY_PREFS_KEY_PREFIX_LS)) {
                console.log(`Migrating preference: ${key}`);
                const content = localStorage.getItem(key);
                if (content) {
                    await puter.kv.set(key, JSON.parse(content));
                    localStorage.removeItem(key);
                    i--; // Adjust index after removal
                }
            }
        }
        
        console.log("Migration check complete.");

    } catch (e) {
        console.error("Error during migration from localStorage:", e);
    } finally {
        await puter.kv.set(MIGRATION_FLAG_KEY_Puter, true);
    }
};


// --- BACKUP AND RESTORE ---

interface BackupData {
    version: string;
    exportedAt: string;
    data: {
        djs: ResidentDJ[];
        activeDJId: string | null;
        library: LibrarySong[];
        history: ListeningHistory;
        diaries: Record<string, DJDiaryEntry[]>;
        preferences: Record<string, Partial<CustomizationOptions>>;
    }
}

export const exportUserData = async (): Promise<BackupData> => {
    if (!isPuterReady()) throw new Error("Puter is not available for export.");

    const djs = await djService.getDJs();
    const activeDJId = await djService.getActiveDJId();
    const library = await libraryService.getAllSongs();
    const history = await puter.kv.get('aiRadioListeningHistory') || {};

    const diaries: Record<string, DJDiaryEntry[]> = {};
    for (const dj of djs) {
        const diary = await puter.kv.get(`aiRadioDJDiary_${dj.id}`);
        if (diary) {
            diaries[dj.id] = diary;
        }
    }
    
    const preferences: Record<string, Partial<CustomizationOptions>> = {};
    const intentions: Intention[] = ['Automatic', 'Focus', 'Relax', 'Celebrate', 'Nostalgia', 'Discover'];
    for (const intention of intentions) {
        const pref = await puter.kv.get(`aiRadioUserPrefs_${intention}`);
        if(pref) {
            preferences[intention] = pref;
        }
    }

    return {
        version: "1.2-puter-fs",
        exportedAt: new Date().toISOString(),
        data: { djs, activeDJId, library, history, diaries, preferences }
    };
};


export const importUserData = async (backup: BackupData): Promise<void> => {
    if (!isPuterReady()) throw new Error("Puter is not available for import.");
    if (!backup || !backup.version || !backup.data) {
        throw new Error("Invalid or incompatible backup file.");
    }
    if (backup.version !== "1.2-puter-fs") {
        throw new Error("Backup file is from an old/incompatible version. Only v1.2-puter-fs is supported.");
    }


    const { djs, activeDJId, library, history, diaries, preferences } = backup.data;
    
    // Clear existing remote audio files before importing new metadata
    const currentLibrary = await libraryService.getAllSongs();
    for (const song of currentLibrary) {
        if (song.puterFsPath) {
           await puter.fs.del(song.puterFsPath).catch((e: any) => console.error(`Failed to delete old file ${song.puterFsPath}`, e));
        }
    }

    await djService.saveDJs(djs);
    await djService.setActiveDJId(activeDJId);
    await puter.kv.set('aiRadioSongLibrary_v3', library);
    await puter.kv.set('aiRadioListeningHistory', history);

    for (const [djId, entries] of Object.entries(diaries)) {
        await puter.kv.set(`aiRadioDJDiary_${djId}`, entries);
    }
    
    for (const [intention, prefs] of Object.entries(preferences)) {
        await puter.kv.set(`aiRadioUserPrefs_${intention}`, prefs);
    }
};

export const deleteAllUserData = async (): Promise<void> => {
    if (!isPuterReady()) throw new Error("Puter no está disponible.");

    console.log("Borrando todos los datos de usuario de AI Radio...");

    // 1. Delete audio files from Puter FS
    const library = await libraryService.getAllSongs();
    for (const song of library) {
        if(song.puterFsPath) {
            await puter.fs.del(song.puterFsPath).catch((e: any) => console.error(`Error borrando archivo de FS ${song.puterFsPath}:`, e));
        }
    }
    console.log("Archivos de audio de Puter FS borrados.");


    // 2. Borrar datos de Puter KV
    const djs = await djService.getDJs();
    for (const dj of djs) {
        await puter.kv.del(`aiRadioDJDiary_${dj.id}`);
    }
    console.log("Diarios de DJs borrados.");

    const intentions: Intention[] = ['Automatic', 'Focus', 'Relax', 'Celebrate', 'Nostalgia', 'Discover'];
    for (const intention of intentions) {
        await puter.kv.del(`aiRadioUserPrefs_${intention}`);
    }
    console.log("Preferencias borradas.");
    
    await puter.kv.del('aiRadioSongLibrary_v3');
    await puter.kv.del('aiRadioDJs');
    await puter.kv.del('aiRadioActiveDJId');
    await puter.kv.del('aiRadioListeningHistory');
    
    console.log("Datos principales de KV borrados. Proceso completado.");
};
