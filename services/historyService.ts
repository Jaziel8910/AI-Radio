import { LibrarySong, ListeningHistory, SongHistory } from '../types';
import { getAllSongs } from './libraryService';

const HISTORY_KEY = 'aiRadioListeningHistory';

// Generate a stable ID for a song file
export const getSongId = (file: File): string => {
  return `song-${file.name}-${file.size}-${file.lastModified}`;
};

// Retrieve the entire listening history
export const getHistory = (): ListeningHistory => {
  try {
    const storedHistory = localStorage.getItem(HISTORY_KEY);
    return storedHistory ? JSON.parse(storedHistory) : {};
  } catch (error) {
    console.error("Error reading listening history from localStorage:", error);
    return {};
  }
};

// Save the entire listening history
const saveHistory = (history: ListeningHistory) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Error saving listening history to localStorage:", error);
  }
};

const getOrCreateSongEntry = (history: ListeningHistory, songId: string): SongHistory => {
  return history[songId] || { playCount: 0, finishCount: 0, skipCount: 0, favoriteCount: 0, dislikeCount: 0, lastPlayed: '' };
}

// Log that a song has started playing
export const logSongPlay = (songId: string) => {
  if (!songId) return;
  const history = getHistory();
  const songEntry = getOrCreateSongEntry(history, songId);
  
  songEntry.playCount += 1;
  songEntry.lastPlayed = new Date().toISOString();
  
  history[songId] = songEntry;
  saveHistory(history);
};

// Log that a song has finished playing
export const logSongFinish = (songId: string) => {
  if (!songId) return;
  const history = getHistory();
  const songEntry = getOrCreateSongEntry(history, songId);

  songEntry.finishCount += 1;
  history[songId] = songEntry;
  saveHistory(history);
};

// Log that a user skipped a song
export const logSongSkip = (songId: string) => {
  if (!songId) return;
  const history = getHistory();
  const songEntry = getOrCreateSongEntry(history, songId);

  songEntry.skipCount += 1;
  history[songId] = songEntry;
  saveHistory(history);
};

// Log that a user favorited a song
export const logSongFavorite = (songId: string) => {
  if (!songId) return;
  const history = getHistory();
  const songEntry = getOrCreateSongEntry(history, songId);

  songEntry.favoriteCount += 1;
  history[songId] = songEntry;
  saveHistory(history);
};

// Log that a user disliked a song
export const logSongDislike = (songId: string) => {
  if (!songId) return;
  const history = getHistory();
  const songEntry = getOrCreateSongEntry(history, songId);

  songEntry.dislikeCount += 1;
  history[songId] = songEntry;
  saveHistory(history);
};


// Get a summary of top songs for the AI prompt
export const getHistorySummaryForPrompt = async (): Promise<string> => {
    const history = getHistory();
    const library = await getAllSongs();
    
    if (Object.keys(history).length === 0) {
        return "El usuario es nuevo, no hay historial de escucha. ¡Haz que su primera experiencia sea genial!";
    }

    const libraryMap = new Map(library.map(song => [song.id, song.metadata]));

    const allSongHistories = Object.entries(history).map(([songId, songHistory]) => ({
      songId,
      metadata: libraryMap.get(songId),
      ...songHistory
    })).filter(s => s.metadata); // Filter out songs no longer in library

    const globalFavorited = allSongHistories.sort((a,b) => b.favoriteCount - a.favoriteCount).slice(0, 5).filter(s => s.favoriteCount > 0);
    const globalSkipped = allSongHistories.sort((a,b) => b.skipCount - a.skipCount).slice(0, 5).filter(s => s.skipCount > 2);
    const globalDisliked = allSongHistories.sort((a,b) => b.dislikeCount - a.dislikeCount).slice(0, 5).filter(s => s.dislikeCount > 0);
    
    let summary = "Aquí tienes un resumen de la relación que tienes con este oyente. Úsalo para personalizar tus comentarios y demostrar que le conoces:\n";
    
    const formatSong = (s: typeof globalFavorited[0]) => `- "${s.metadata?.title}" por ${s.metadata?.artist}`;

    if(globalFavorited.length > 0) {
      summary += `\n**Canciones Favoritas de Siempre:** El oyente ADORA estas canciones. Si alguna de ellas está en la sesión de hoy, celébralo por todo lo alto. Son aciertos seguros.\n${globalFavorited.map(formatSong).join('\n')}\n`;
    }
    if(globalDisliked.length > 0) {
      summary += `\n**Canciones en la Lista Negra:** El oyente ha marcado explícitamente que NO le gustan estas. Reconoce si pones una, quizás en tono de broma.\n${globalDisliked.map(formatSong).join('\n')}\n`;
    }
     if(globalSkipped.length > 0) {
      summary += `\n**Canciones que Suele Saltar:** El oyente tiene una relación complicada con estas. Si pones una, puedes mencionarlo de forma juguetona, como "¿Le damos otra oportunidad a esta?"\n${globalSkipped.map(formatSong).join('\n')}\n`;
    }
    
    if (summary.length < 200) {
      return "El usuario es un oyente recurrente, pero no hay un historial destacable. Basa tus comentarios en el mood actual y sé genial."
    }

    return summary.trim();
};