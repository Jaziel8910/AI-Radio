
import { DJDiaryEntry, ResidentDJ, AnalyzedSong, ListeningHistory, LibrarySong, SongMetadata } from '../types';
import * as geminiService from './geminiService';
import { getHistory } from './historyService';
import { getAllSongs } from './libraryService';

const DIARY_KEY_PREFIX = 'aiRadioDJDiary_';

export interface DiaryStats {
    genreRadar: { label: string; value: number }[];
    activityClock: { hour: number; value: number }[];
    keywordCloud: { text: string; value: number }[];
    memoryBox: {
        firstFavorite?: SongMetadata;
        safeBets: SongMetadata[];
    };
}

export const getDiaryEntries = (djId: string): DJDiaryEntry[] => {
    try {
        const key = `${DIARY_KEY_PREFIX}${djId}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Error reading diary entries:", e);
        return [];
    }
};

export const addDiaryEntry = (djId: string, content: string, type: 'thought' | 'milestone' = 'thought') => {
    try {
        const entries = getDiaryEntries(djId);
        const newEntry: DJDiaryEntry = {
            timestamp: new Date().toISOString(),
            content,
            type
        };
        entries.unshift(newEntry); // Add to the beginning
        localStorage.setItem(`${DIARY_KEY_PREFIX}${djId}`, JSON.stringify(entries.slice(0, 50))); // Keep last 50
    } catch (e) {
        console.error("Error saving diary entry:", e);
    }
};

export const generateAndSavePostShowEntry = async (dj: ResidentDJ, songsInShow: AnalyzedSong[]) => {
    const historySummary = await geminiService.getHistorySummaryForPrompt();
    const thought = await geminiService.createDiaryEntry(dj, songsInShow, historySummary);
    if (thought) {
        addDiaryEntry(dj.id, thought);
    }
};

export const getDiaryStats = async (): Promise<DiaryStats> => {
    const history = getHistory();
    const library = await getAllSongs();
    const libraryMap = new Map(library.map(s => [s.id, s]));

    const historyWithMeta = Object.entries(history)
        .map(([songId, stats]) => ({ ...stats, metadata: libraryMap.get(songId) }))
        .filter(item => item.metadata);

    // Genre Radar
    const genreCounts: Record<string, number> = {};
    historyWithMeta.forEach(item => {
        const genre = item.metadata?.metadata.genre || 'Other';
        if(item.finishCount > 0) {
            genreCounts[genre] = (genreCounts[genre] || 0) + item.finishCount;
        }
    });
    const genreRadar = Object.entries(genreCounts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 7);

    // Activity Clock
    const activity: Record<number, number> = {};
    for(let i=0; i<24; i++) activity[i] = 0;
    historyWithMeta.forEach(item => {
        if(item.lastPlayed) {
            const hour = new Date(item.lastPlayed).getHours();
            activity[hour] = (activity[hour] || 0) + 1;
        }
    });
    const activityClock = Object.entries(activity).map(([hour, value]) => ({ hour: parseInt(hour), value }));
    
    // Keyword Cloud (Top Artists)
    const artistCounts: Record<string, number> = {};
     historyWithMeta.forEach(item => {
        const artist = item.metadata?.metadata.artist || 'Unknown';
        if(item.playCount > 0) {
           artistCounts[artist] = (artistCounts[artist] || 0) + item.playCount;
        }
    });
    const keywordCloud = Object.entries(artistCounts).map(([text, value]) => ({ text, value })).sort((a,b) => b.value - a.value).slice(0, 15);

    // Memory Box
    const firstFavorite = historyWithMeta.filter(s => s.favoriteCount > 0).sort((a, b) => new Date(a.lastPlayed).getTime() - new Date(b.lastPlayed).getTime())[0];
    const safeBets = historyWithMeta.filter(s => s.finishCount > 2 && s.skipCount === 0).sort((a, b) => b.finishCount - a.finishCount).slice(0, 5);
    
    return {
        genreRadar, activityClock, keywordCloud,
        memoryBox: {
            firstFavorite: firstFavorite?.metadata?.metadata as SongMetadata,
            safeBets: safeBets.map(s => s.metadata?.metadata as SongMetadata)
        }
    };
};
