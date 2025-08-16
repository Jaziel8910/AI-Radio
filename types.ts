

export type Intention = 'Automatic' | 'Focus' | 'Relax' | 'Celebrate' | 'Nostalgia' | 'Discover';

export interface InitialMetadata {
  title: string;
  artist: string;
  album: string;
  duration: number;
  picture?: string; // base64 encoded image
}

export interface SongMetadata extends InitialMetadata {
  year?: number;
  genre?: string;
}

export interface LibrarySong {
  id: string; // from getSongId
  file: File; // The actual file object
  metadata: SongMetadata;
}

export interface AnalyzedSong {
  index: number;
  songId: string; // Unique identifier for history tracking
  fileUrl: string;
  metadata: {
    title: string;
    artist: string;
    album: string;
    duration: number;
    picture?: string; // base64 encoded image
  };
}

export type TimeOfDay = 'auto' | 'madrugada' | 'mañana' | 'tarde' | 'noche';

export interface SongHistory {
    playCount: number;
    finishCount: number;
    skipCount: number;
    favoriteCount: number;
    dislikeCount: number;
    lastPlayed: string; // ISO date string
}
export type ListeningHistory = Record<string, SongHistory>;


export interface CustomizationOptions {
  // DJ & Voice (These are now mostly for the SHOW, not the DJ's core identity)
  djVoiceURI: string; // This will be set from the active DJ
  speechRate: number; 
  speechPitch: number; 
  
  // Show Content
  intention: Intention;
  theme: string;
  showContext: string; // Replaces dedication
  audienceType: string; // e.g., "for a birthday party", "for late night coding"
  timeOfDay: TimeOfDay;
  mood: { energy: number; vibe: number }; // -1 to 1 for both
  timeCapsuleYear: string;
  commentaryLength: 'short' | 'standard' | 'long';
  commentaryPlacement: 'before' | 'intro' | 'varied';
  languageStyle: 'formal' | 'colloquial' | 'poetic';
  includeCallIns: boolean;
  mentionRelatedArtists: boolean;
  
  // Ads & Jingles
  adFrequency: 'none' | 'low' | 'medium' | 'high';
  customAds: string;
  includeJingles: boolean;

  // Visuals & Audio
  generateShowArt: boolean;
  negativeShowArtPrompt: string;
  visualizerStyle: 'bars' | 'waveform' | 'circle';
  visualizerColorPalette: 'neon_purple' | 'fire_ice' | 'emerald_forest' | 'monochrome';
  crossfadeDuration: number; // 0-5 seconds
}

export type Genre = 'Rock' | 'Electronic' | 'Pop' | 'Hip-Hop' | 'Jazz' | 'Classical' | 'Vocal' | 'Other' | string;

export interface SongItem {
  type: 'song';
  songIndex: number;
  commentary: string;
  genre: Genre;
}

export interface AdBreakItem {
  type: 'ad_break';
  adverts: string[]; // scripts for fake ads
}

export interface JingleItem {
  type: 'jingle';
  script: string;
}

export type PlaylistItem = SongItem | AdBreakItem | JingleItem;

export interface Source {
  uri: string;
  title: string;
}

export interface RadioShow {
  showTitle: string;
  showArt?: string; // base64 encoded image for the show
  playlist: PlaylistItem[];
  introCommentary: string;
  outroCommentary: string;
  userReactions?: {
    onUnmute?: string;
    onPause?: string;
    onPlay?: string;
    onSkip?: string;
    onFavorite?: string;
  };
  sources?: Source[];
}


export interface DJPersona {
  name: string;
  style: string; // Description for Gemini
}

export interface DJDNA {
  humor: number;    // -1 (Sutil) to 1 (Sarcástico)
  energy: number;   // -1 (Chill) to 1 (Extremo)
  knowledge: number;// -1 (Cero Datos) to 1 (Enciclopedia)
  tone: number;     // -1 (Amistoso) to 1 (Provocador)
}

export interface ResidentDJ {
  id: string;
  name: string;
  persona: DJPersona;
  dna: DJDNA;
  voiceURI: string;
  speechRate: number;
  speechPitch: number;
}

export enum AppState {
  LOADING = 'LOADING',
  ONBOARDING = 'ONBOARDING',
  HOME = 'HOME',
  DJ_VAULT = 'DJ_VAULT',
  DJ_EDITOR = 'DJ_EDITOR',
  CREATING_SHOW = 'CREATING_SHOW',
  SHOW_READY = 'SHOW_READY',
  PLAYING = 'PLAYING',
}