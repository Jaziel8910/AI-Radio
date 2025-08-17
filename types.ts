
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
  metadata: SongMetadata;
}

// A version of AnalyzedSong passed to Gemini, without the full file info.
export interface GeminiAnalyzedSong {
  index: number;
  songId: string;
  metadata: SongMetadata;
}

// The version passed to the Player, with the full LibrarySong object.
export interface AnalyzedSong {
  index: number;
  song: LibrarySong;
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
  contextualEventsLevel: 'none' | 'subtle' | 'immersive'; // NEW
  
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

export interface JokeItem {
  type: 'joke';
}

export type PlaylistItem = SongItem | AdBreakItem | JingleItem | JokeItem;

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
  pace: number;     // -1 (Lento) to 1 (Rápido)
  pitch: number;    // -1 (Grave) to 1 (Agudo)
}

export interface ResidentDJ {
  id: string;
  name: string;
  persona: DJPersona;
  dna: DJDNA;
  voiceLanguage: string;
  voiceId: string; 
  voiceEngine: 'standard' | 'neural' | 'generative' | 'long-form';
}

export interface DJDiaryEntry {
    timestamp: string;
    content: string;
    type: 'thought' | 'milestone' | 'analysis';
}

export interface AppSettings {
  // General
  appLanguage: 'es' | 'en';
  appTheme: 'dark' | 'light' | 'system';
  defaultIntention: Intention;
  startupView: 'HOME' | 'SOCIAL_HUB' | 'DJ_VAULT';
  enableAnalytics: boolean;
  
  // Playback & Audio
  audioQuality: 'low' | 'medium' | 'high';
  defaultVolume: number; // 0 to 1
  globalCrossfadeDuration: number; // 0 to 5
  enableAudioNormalization: boolean;
  enableGaplessPlayback: boolean;
  preloadNextSong: boolean;
  rememberPlaybackPosition: boolean;
  autoPlayOnStart: boolean;
  showEndBehavior: 'return' | 'replay' | 'similar';
  djVoiceVolumeBoost: number; // 0 to 1
  musicDuckingAggressiveness: number; // 0 to 1

  // Interface & Visuals
  defaultVisualizerStyle: 'bars' | 'waveform' | 'circle';
  defaultVisualizerColorPalette: 'neon_purple' | 'fire_ice' | 'emerald_forest' | 'monochrome';
  reduceMotion: boolean;
  showAlbumArtAsPlayerBackground: boolean;
  compactLibraryView: boolean;
  libraryShowPlayability: boolean;
  libraryShowDuration: boolean;
  libraryShowYear: boolean;
  libraryShowAlbum: boolean;
  timestampFormat: '24h' | '12h';
  showDJDiaryNotifications: boolean;

  // Accessibility
  highContrastMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  dyslexicFriendlyFont: boolean;
  enhancedFocusRings: boolean;
  screenReaderVerbosity: 'terse' | 'standard' | 'verbose';
  alwaysShowDJTranscripts: boolean;
  useBiggerControls: boolean;

  // Data & Privacy
  pauseListeningHistory: boolean;
  autoDeleteHistory: 'never' | '1m' | '3m' | '1y';
  enableLocationBasedContent: boolean;
  enablePersonalizedAds: boolean;
}


export enum AppState {
  LOADING = 'LOADING',
  ONBOARDING = 'ONBOARDING',
  HOME = 'HOME',
  DJ_VAULT = 'DJ_VAULT',
  DJ_EDITOR = 'DJ_EDITOR',
  DJ_DIARY = 'DJ_DIARY',
  SOCIAL_HUB = 'SOCIAL_HUB',
  FRIENDS = 'FRIENDS',
  PROFILE_SETTINGS = 'PROFILE_SETTINGS',
  CREATING_SHOW = 'CREATING_SHOW',
  SHOW_READY = 'SHOW_READY',
  PLAYING = 'PLAYING',
}

// --- NUEVOS TIPOS PARA LA FUNCIÓN SOCIAL ---

export interface AuthorProfile {
  uid: string;
  username: string;
  avatar: string;
}

export interface Comment {
  id: string;
  author: AuthorProfile;
  content: string;
  timestamp: string; // ISO String
}

export interface PostContent {
  type: 'text' | 'image' | 'dj_preset_share';
  text?: string;
  imageUrl?: string;
  djPreset?: ResidentDJ; // ¡Para compartir presets de DJs!
}

export interface Post {
  id: string;
  author: AuthorProfile;
  content: PostContent;
  timestamp: string; // ISO String
  likes: string[]; // Array de user uids
  comments: Comment[];
}

export interface ChatMessage {
    id: string;
    fromUid: string;
    toUid: string;
    text: string;
    timestamp: string; // ISO string
    read: boolean;
}