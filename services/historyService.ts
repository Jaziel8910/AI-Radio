
import { ListeningHistory, SongHistory } from '../types';

declare var puter: any;

const HISTORY_KEY = 'aiRadioListeningHistory';

const isPuterReady = () => typeof puter !== 'undefined' && puter.kv;

// Generate a stable ID for a song file
export const getSongId = (file: File): string => {
  return `song-${file.name}-${file.size}-${file.lastModified}`;
};

// Retrieve the entire listening history from Puter KV
export const getHistory = async (): Promise<ListeningHistory> => {
  if (!isPuterReady()) return {};
  try {
    const storedHistory = await puter.kv.get(HISTORY_KEY);
    return storedHistory || {};
  } catch (error) {
    console.error("Error reading listening history from Puter KV:", error);
    return {};
  }
};

// Save the entire listening history to Puter KV
const saveHistory = async (history: ListeningHistory) => {
  if (!isPuterReady()) return;
  try {
    await puter.kv.set(HISTORY_KEY, history);
  } catch (error) {
    console.error("Error saving listening history to Puter KV:", error);
  }
};

const getOrCreateSongEntry = (history: ListeningHistory, songId: string): SongHistory => {
  return history[songId] || { playCount: 0, finishCount: 0, skipCount: 0, favoriteCount: 0, dislikeCount: 0, lastPlayed: '' };
}

// Log that a song has started playing
export const logSongPlay = async (songId: string) => {
  if (!songId) return;
  const history = await getHistory();
  const songEntry = getOrCreateSongEntry(history, songId);
  
  songEntry.playCount += 1;
  songEntry.lastPlayed = new Date().toISOString();
  
  history[songId] = songEntry;
  await saveHistory(history);
};

// Log that a song has finished playing
export const logSongFinish = async (songId: string) => {
  if (!songId) return;
  const history = await getHistory();
  const songEntry = getOrCreateSongEntry(history, songId);

  songEntry.finishCount += 1;
  history[songId] = songEntry;
  await saveHistory(history);
};

// Log that a user skipped a song
export const logSongSkip = async (songId: string) => {
  if (!songId) return;
  const history = await getHistory();
  const songEntry = getOrCreateSongEntry(history, songId);

  songEntry.skipCount += 1;
  history[songId] = songEntry;
  await saveHistory(history);
};

// Log that a user favorited a song
export const logSongFavorite = async (songId: string) => {
  if (!songId) return;
  const history = await getHistory();
  const songEntry = getOrCreateSongEntry(history, songId);

  songEntry.favoriteCount += 1;
  history[songId] = songEntry;
  await saveHistory(history);
};

// Log that a user disliked a song
export const logSongDislike = async (songId: string) => {
  if (!songId) return;
  const history = await getHistory();
  const songEntry = getOrCreateSongEntry(history, songId);

  songEntry.dislikeCount += 1;
  history[songId] = songEntry;
  await saveHistory(history);
};
