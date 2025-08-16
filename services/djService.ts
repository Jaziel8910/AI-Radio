

import { ResidentDJ } from '../types';

declare var puter: any;

const DJS_KEY = 'aiRadioDJs';
const ACTIVE_DJ_ID_KEY = 'aiRadioActiveDJId';

const isPuterReady = () => typeof puter !== 'undefined' && puter.kv;

// Cargar todos los DJs desde Puter KV
export const getDJs = async (): Promise<ResidentDJ[]> => {
  if (!isPuterReady()) return [];
  try {
    const stored = await puter.kv.get(DJS_KEY);
    return stored ? (stored as ResidentDJ[]) : [];
  } catch (e) {
    console.error("Error reading DJs from Puter KV:", e);
    return [];
  }
};

// Guardar todos los DJs en Puter KV
export const saveDJs = async (djs: ResidentDJ[]): Promise<void> => {
  if (!isPuterReady()) return;
  try {
    await puter.kv.set(DJS_KEY, djs);
  } catch (e) {
    console.error("Error saving DJs to Puter KV:", e);
  }
};

// Obtener el ID del DJ activo
export const getActiveDJId = async (): Promise<string | null> => {
  if (!isPuterReady()) return null;
  return await puter.kv.get(ACTIVE_DJ_ID_KEY) || null;
};

// Establecer el ID del DJ activo
export const setActiveDJId = async (id: string | null): Promise<void> => {
  if (!isPuterReady()) return;
  if (id) {
    await puter.kv.set(ACTIVE_DJ_ID_KEY, id);
  } else {
    await puter.kv.del(ACTIVE_DJ_ID_KEY);
  }
};

export const exportSingleDJ = async (djId: string) => {
    const djs = await getDJs();
    const dj = djs.find(d => d.id === djId);
    if (!dj) return;
    const jsonString = JSON.stringify(dj, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dj.name.replace(/\s/g, '_')}_personality.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
