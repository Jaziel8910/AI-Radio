import { DJPersona, Intention, CustomizationOptions } from './types';
import { Zap, Brain, Heart, Wind, Star, Radio } from 'lucide-react';

export const DJ_PERSONAS: DJPersona[] = [
  {
    name: 'El Analista Musical',
    style:
      'Eres un locutor de radio experto, con un conocimiento enciclopédico de la música. Tu tono es cálido, inteligente y un poco irónico. Conectas canciones con anécdotas, datos técnicos y contexto histórico. Eres como un amigo culto que te descubre los secretos de tu propia música.',
  },
  {
    name: 'La Host Sarcástica',
    style:
      'Eres una DJ de radio con un humor muy seco y sarcástico. Te burlas amistosamente de las elecciones musicales del usuario, de las letras de las canciones y de las transiciones de género. Tus comentarios son agudos, ingeniosos y a veces un poco pasivo-agresivos, pero siempre divertidos. No eres cruel, eres brutalmente honesta.',
  },
  {
    name: 'El Motivador Energético',
    style:
      'Eres un presentador de radio lleno de energía y positivismo. Tu objetivo es animar al oyente. Celebras cada canción como si fuera el mayor éxito del mundo. Tus comentarios son entusiastas, motivadores y siempre buscan levantar el ánimo. Usas exclamaciones y frases que inspiran acción y buen rollo.',
  },
  {
    name: 'Dúo Dinámico',
    style:
      'Eres DOS locutores de radio que presentan el show juntos. Crea dos personalidades distintas (ej: "El Experto" y "El Entusiasta") y escribe sus diálogos. Deben interactuar, estar de acuerdo o en desacuerdo sobre las canciones, y hacerse bromas. Sus conversaciones deben fluir de forma natural antes de presentar la siguiente canción. Usa etiquetas como "[Locutor 1]:" y "[Locutor 2]:" para diferenciar quién habla.',
  },
  {
    name: 'Personalizada',
    style: 'El usuario definirá tu personalidad. Sigue las instrucciones que te den.',
  },
];

type ColorStop = [number, string]; // [offset, color]
export type Palette = {
  gradient: ColorStop[];
  shadow: string;
  stroke?: string;
};

export const VISUALIZER_PALETTES: Record<string, Palette> = {
  neon_purple: {
    gradient: [
      [0, `hsla(270, 100%, 50%, 0.4)`],
      [1, `hsla(280, 100%, 80%, 0.8)`]
    ],
    shadow: `hsla(275, 100%, 70%, 0.5)`,
    stroke: `hsla(280, 100%, 80%, 1)`
  },
  fire_ice: {
    gradient: [
      [0, `hsla(210, 100%, 50%, 0.5)`],
      [0.5, `hsla(190, 100%, 80%, 0.8)`],
      [1, `hsla(45, 100%, 60%, 0.7)`]
    ],
    shadow: `hsla(25, 100%, 70%, 0.5)`,
    stroke: `hsla(30, 100%, 80%, 1)`
  },
  emerald_forest: {
    gradient: [
      [0, `hsla(140, 100%, 30%, 0.5)`],
      [1, `hsla(150, 80%, 70%, 0.8)`]
    ],
    shadow: `hsla(145, 100%, 50%, 0.4)`,
    stroke: `hsla(150, 100%, 80%, 1)`
  },
  monochrome: {
    gradient: [
      [0, `hsla(0, 0%, 70%, 0.4)`],
      [1, `hsla(0, 0%, 100%, 0.9)`]
    ],
    shadow: `hsla(0, 0%, 100%, 0.5)`,
    stroke: `hsla(0, 0%, 100%, 1)`
  }
};


export const INTENTIONS: { id: Intention, label: string, icon: React.ElementType, description: string, color: string }[] = [
    { id: 'Automatic', label: "Automático", icon: Radio, description: "Deja que tu DJ cree la sesión perfecta para este momento basándose en la hora y tus gustos.", color: "from-purple-500 to-indigo-500" },
    { id: 'Focus', label: "Enfocarme", icon: Brain, description: "Música instrumental y un DJ poco hablador para máxima concentración.", color: "from-sky-500 to-cyan-500" },
    { id: 'Relax', label: "Relajarme", icon: Wind, description: "Sonidos tranquilos y una atmósfera serena para desconectar.", color: "from-emerald-500 to-teal-500" },
    { id: 'Celebrate', label: "Celebrar", icon: Zap, description: "¡Sube el volumen! Ritmos enérgicos y un ambiente de fiesta.", color: "from-amber-500 to-orange-500" },
    { id: 'Nostalgia', label: "Nostalgia", icon: Heart, description: "Un viaje al pasado con clásicos y canciones que marcaron una época.", color: "from-rose-500 to-pink-500" },
    { id: 'Discover', label: "Descubrir", icon: Star, description: "Explora nuevos horizontes musicales con joyas ocultas de tu librería.", color: "from-slate-500 to-gray-500" },
];

export const INTENTION_CONFIGS: Record<Intention, Omit<Partial<CustomizationOptions>, 'djVoiceURI' | 'speechRate' | 'speechPitch'>> = {
  Automatic: { 
    theme: "Una selección musical sorpresa, adaptada a ti y a este momento del día.",
    mood: { energy: 0.1, vibe: 0.2 },
    commentaryLength: 'standard',
  },
  Focus: {
    theme: "Música para máxima concentración y productividad.",
    mood: { energy: -0.6, vibe: 0.1 },
    commentaryLength: 'short',
    adFrequency: 'none',
    includeJingles: false,
    showContext: 'Sesión de trabajo o estudio profundo.',
    languageStyle: 'formal',
  },
  Relax: {
    theme: "Una sesión tranquila para relajarse y desconectar.",
    mood: { energy: -0.8, vibe: -0.2 },
    commentaryLength: 'standard',
    languageStyle: 'poetic',
    crossfadeDuration: 3,
  },
  Celebrate: {
    theme: "¡Esto es una fiesta! La mejor música para celebrar y pasarlo bien.",
    mood: { energy: 0.8, vibe: 0.8 },
    commentaryLength: 'standard',
    languageStyle: 'colloquial',
    includeCallIns: true,
  },
  Nostalgia: {
    theme: "Un viaje sonoro al pasado.",
    mood: { energy: -0.2, vibe: -0.4 },
    commentaryLength: 'long',
    timeCapsuleYear: '',
  },
  Discover: {
    theme: "Explorando los tesoros menos escuchados de tu librería.",
    mood: { energy: 0.3, vibe: 0.4 },
    commentaryLength: 'standard',
    mentionRelatedArtists: true,
  },
};
