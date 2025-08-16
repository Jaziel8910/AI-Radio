import { ResidentDJ, DJPersona } from '../types';

const DJS_KEY = 'aiRadioDJs';
const ACTIVE_DJ_ID_KEY = 'aiRadioActiveDJId';
const LEGACY_DJ_KEY = 'aiRadioResidentDJ';

// Cargar todos los DJs desde localStorage
export const getDJs = (): ResidentDJ[] => {
  try {
    const stored = localStorage.getItem(DJS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error reading DJs from localStorage:", e);
    return [];
  }
};

// Guardar todos los DJs en localStorage
export const saveDJs = (djs: ResidentDJ[]): void => {
  try {
    localStorage.setItem(DJS_KEY, JSON.stringify(djs));
  } catch (e) {
    console.error("Error saving DJs to localStorage:", e);
  }
};

// Obtener el ID del DJ activo
export const getActiveDJId = (): string | null => {
  return localStorage.getItem(ACTIVE_DJ_ID_KEY);
};

// Establecer el ID del DJ activo
export const setActiveDJId = (id: string): void => {
  localStorage.setItem(ACTIVE_DJ_ID_KEY, id);
};

// Migra un DJ del sistema antiguo (un solo objeto) al nuevo sistema (array)
export const migrateLegacyDJ = async (): Promise<void> => {
  return new Promise(resolve => {
    try {
        const legacyDJString = localStorage.getItem(LEGACY_DJ_KEY);
        if (legacyDJString) {
            console.log("Legacy DJ found, migrating...");
            // Check if new system already has DJs, to prevent overwriting
            const existingDJs = getDJs();
            if (existingDJs.length > 0) {
                console.log("New DJ system already populated. Skipping migration.");
                localStorage.removeItem(LEGACY_DJ_KEY);
                resolve();
                return;
            }

            const legacyDJ: { name: string; persona: DJPersona } = JSON.parse(legacyDJString);
            const newDJ: ResidentDJ = {
                ...legacyDJ,
                id: crypto.randomUUID(),
                dna: { humor: 0, energy: 0, knowledge: 0, tone: 0 },
                voiceURI: '',
                speechRate: 1,
                speechPitch: 1,
            };

            saveDJs([newDJ]);
            setActiveDJId(newDJ.id);
            localStorage.removeItem(LEGACY_DJ_KEY);
            console.log("Migration complete.");
        }
    } catch (e) {
        console.error("Error migrating legacy DJ:", e);
        // If migration fails, remove the broken legacy key to prevent loops
        localStorage.removeItem(LEGACY_DJ_KEY);
    }
    resolve();
  });
};