
import { SongMetadata } from '../types';

const getDurationFromAudioElement = (file: File): Promise<number> => {
    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        const objectUrl = URL.createObjectURL(file);
        audio.preload = 'metadata';
        audio.src = objectUrl;
        audio.onloadedmetadata = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(audio.duration);
        };
        audio.onerror = () => {
            console.error(`Error loading audio metadata for ${file.name}`);
            URL.revokeObjectURL(objectUrl);
            resolve(0); // Resolve with 0 if it fails
        };
    });
};

/**
 * Extracts the most basic metadata from a file: a fallback title/artist from the filename
 * and a reliable duration using an <audio> element.
 * This function NO LONGER uses heavy libraries to parse tags, as that will be handled by remote services.
 */
export const extractInitialMetadata = async (file: File): Promise<SongMetadata> => {
    const fileName = file.name.replace(/\.[^/.]+$/, "");
    let artist = 'Artista Desconocido';
    let title = fileName;

    // A simple guess for "Artist - Title" format. This will be corrected by remote services.
    if (fileName.includes(' - ')) {
        const parts = fileName.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
    }
    
    const duration = await getDurationFromAudioElement(file);

    return {
        title,
        artist,
        album: 'Álbum Desconocido',
        duration,
    };
};
