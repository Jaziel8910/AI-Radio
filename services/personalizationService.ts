import { CustomizationOptions, Intention } from '../types';

const PREFS_KEY_PREFIX = 'aiRadioUserPrefs_';

// Guarda las preferencias del usuario para una intención específica
export const saveUserPreferences = (intention: Intention, options: CustomizationOptions): void => {
  try {
    const key = `${PREFS_KEY_PREFIX}${intention}`;
    // Crea una copia para modificar
    const prefsToSave = { ...options };
    // Elimina propiedades transitorias/específicas de la sesión que no deberían convertirse en preferencias a largo plazo
    delete (prefsToSave as Partial<CustomizationOptions>).intention;
    delete (prefsToSave as Partial<CustomizationOptions>).showContext;
    
    localStorage.setItem(key, JSON.stringify(prefsToSave));
  } catch (error) {
    console.error("Error al guardar las preferencias del usuario en localStorage:", error);
  }
};

// Recupera las preferencias del usuario para una intención específica (función interna)
const getUserPreferences = (intention: Intention): CustomizationOptions | null => {
  try {
    const key = `${PREFS_KEY_PREFIX}${intention}`;
    const storedPrefs = localStorage.getItem(key);
    if (storedPrefs) {
      const parsed = JSON.parse(storedPrefs);
      return { ...parsed, intention };
    }
    return null;
  } catch (error) {
    console.error("Error al leer las preferencias del usuario de localStorage:", error);
    return null;
  }
};


// Recupera y ajusta inteligentemente las preferencias del usuario
export const getAutomatedOptions = (intention: Intention): CustomizationOptions | null => {
    const savedPrefs = getUserPreferences(intention);
    if (!savedPrefs) return null;

    // Empezamos con las preferencias guardadas
    const automated = { ...savedPrefs };

    // --- Lógica Inteligente de Ajuste ---

    // 1. Ajuste basado en la hora del día
    const h = new Date().getHours();
    const isNight = h > 22 || h < 6;
    const isMorning = h >= 6 && h < 12;

    if (isNight && intention !== 'Celebrate') {
        // Bajar la energía para sesiones nocturnas
        automated.mood.energy = Math.max(-1, (automated.mood.energy || 0) - 0.2);
        // Cambiar a un estilo más poético y calmado
        if (automated.languageStyle !== 'formal') {
            automated.languageStyle = 'poetic';
        }
    } else if (isMorning && intention !== 'Relax') {
        // Ligeramente más energía por la mañana
        automated.mood.energy = Math.min(1, (automated.mood.energy || 0) + 0.1);
    }
    
    // 2. Reforzar la intención principal
    // Asegura que las opciones clave para una intención se respeten, incluso si el usuario las cambió la última vez
    if (intention === 'Relax') {
        automated.crossfadeDuration = Math.max(automated.crossfadeDuration || 0, 3);
        if (automated.mood.energy > 0) automated.mood.energy = -0.2; // No puede ser enérgico
    }
    if (intention === 'Focus') {
        automated.adFrequency = 'none'; // La concentración es clave
        automated.commentaryLength = 'short';
    }
    if (intention === 'Celebrate') {
        if(automated.mood.energy < 0) automated.mood.energy = 0.5; // No puede ser calmado
        automated.includeCallIns = true; // La fiesta necesita gente
    }

    return automated;
}
