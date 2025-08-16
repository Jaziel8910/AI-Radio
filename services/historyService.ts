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
