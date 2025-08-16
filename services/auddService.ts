
import { SongMetadata } from '../types';

const AUDD_API_KEY = '59d18ae8b1fe039e08de33d6484bd7ae';

interface AudDResult {
    artist: string;
    title: string;
    album?: string;
}

interface AudDResponse {
    status: 'success' | 'error';
    result?: AudDResult;
    error?: object;
}

export async function identifySong(file: File): Promise<Partial<SongMetadata> | null> {
  const form = new FormData();
  form.append('file', file);
  form.append('api_token', AUDD_API_KEY);
  form.append('return', 'spotify');

  try {
    const res = await fetch('https://api.audd.io/', {
      method: 'POST',
      body: form
    });

    const data: AudDResponse = await res.json();

    if (data.status === 'success' && data.result) {
      const song = data.result;
      const metadataUpdate: Partial<SongMetadata> = {};
      if (song.artist) metadataUpdate.artist = song.artist;
      if (song.title) metadataUpdate.title = song.title;
      if (song.album) metadataUpdate.album = song.album;
      
      if (Object.keys(metadataUpdate).length > 0) {
        return metadataUpdate;
      }
    }
    return null;
  } catch (err) {
    console.error('Error contacting AudD.io API:', err);
    return null;
  }
}
