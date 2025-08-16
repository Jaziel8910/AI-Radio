

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
  metadata: SongMetadata;
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
  // Show Content
  intention: Intention;
  theme: string;
  showContext: string;
  audienceType: string;
  timeOfDay: TimeOfDay;
  mood: { energy: number; vibe: number }; // -1 to 1 for both
  timeCapsuleYear: string;
  dataRichness: 'low' | 'medium' | 'high'; // NEW
  
  // DJ Style
  djBanterStyle: 'standard' | 'storyteller' | 'interviewer'; // NEW
  songIntroductionStyle: 'direct' | 'teaser' | 'lyrical_quote'; // NEW
  commentaryLength: 'short' | 'standard' | 'long';
  commentaryPlacement: 'before' | 'intro' | 'varied';
  languageStyle: 'formal' | 'colloquial' | 'poetic';
  
  // Station Elements
  includeCallIns: boolean;
  mentionRelatedArtists: boolean;
  adFrequency: 'none' | 'low' | 'medium' | 'high';
  customAds: string;
  includeJingles: boolean;
  stationIdentificationFrequency: 'none' | 'low' | 'high'; // NEW
  includeWeatherReports: boolean; // NEW
  includeTimeAnnouncements: boolean; // NEW

  // Pacing & Flow
  showPacing: 'fast' | 'medium' | 'slow'; // NEW
  endingStyle: 'abrupt' | 'fade_out' | 'cliffhanger'; // NEW

  // Visuals & Audio
  generateShowArt: boolean;
  negativeShowArtPrompt: string;
  visualizerStyle: 'bars' | 'waveform' | 'circle';
  visualizerColorPalette: 'neon_purple' | 'fire_ice' | 'emerald_forest' | 'monochrome';
  crossfadeDuration: number; // 0-5 seconds
  soundEffectLevel: 'none' | 'subtle' | 'immersive'; // NEW
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
  category: string;
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
  voiceLanguage?: string; // e.g., 'es-ES' language code
  voiceEngine?: 'standard' | 'neural' | 'generative';
}

export interface DJDiaryEntry {
    timestamp: string;
    content: string;
    type: 'thought' | 'milestone' | 'analysis';
}


export enum AppState {
  LOADING = 'LOADING',
  ONBOARDING = 'ONBOARDING',
  HOME = 'HOME',
  DJ_VAULT = 'DJ_VAULT',
  DJ_EDITOR = 'DJ_EDITOR',
  DJ_DIARY = 'DJ_DIARY',
  CREATING_SHOW = 'CREATING_SHOW',
  SHOW_READY = 'SHOW_READY',
  PLAYING = 'PLAYING',
}