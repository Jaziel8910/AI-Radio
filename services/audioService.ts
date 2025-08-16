
import { SongMetadata } from '../types';
import * as musicMetadata from 'music-metadata';

const uint8ArrayToBase64 = (data: Uint8Array): string => {
    let binary = '';
    const len = data.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
};

const createFallbackMetadata = (file: File): SongMetadata => {
  const fileName = file.name.replace(/\.[^/.]+$/, "");
  let artist = 'Artista Desconocido';
  let title = fileName;

  // Intenta adivinar por el formato "Artista - Título"
  if (fileName.includes(' - ')) {
    const parts = fileName.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim(); // Handle titles with hyphens
  }

  return {
    title: title,
    artist: artist,
    album: 'Álbum Desconocido',
    duration: 0,
  };
};

const getDurationFromAudioElement = (file: File): Promise<number> => {
    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        const objectUrl = URL.createObjectURL(file);
        audio.src = objectUrl;
        audio.onloadedmetadata = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(audio.duration);
        };
        audio.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(0); // Resolve with 0 if it fails
        };
    });
};

export const extractMetadataFromFile = async (file: File): Promise<SongMetadata> => {
    try {
        const metadata = await musicMetadata.parseBlob(file);
        const common = metadata.common;
        const picture = common.picture?.[0];
        const pictureBase64 = picture ? `data:${picture.format};base64,${uint8ArrayToBase64(picture.data)}` : undefined;
        return {
            title: common.title || file.name.replace(/\.[^/.]+$/, ""),
            artist: common.artist || 'Artista Desconocido',
            album: common.album || 'Álbum Desconocido',
            duration: metadata.format.duration || await getDurationFromAudioElement(file),
            picture: pictureBase64,
            year: common.year,
        };
    } catch (error) {
        console.warn(`Could not parse metadata for ${file.name} using music-metadata. Falling back. Error:`, error);
        const fallbackMetadata = createFallbackMetadata(file);
        fallbackMetadata.duration = await getDurationFromAudioElement(file);
        return fallbackMetadata;
    }
};