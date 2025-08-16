import { GoogleGenAI, Type } from "@google/genai";
import { AnalyzedSong, ResidentDJ, RadioShow, CustomizationOptions, Source, TimeOfDay, LibrarySong, SongMetadata, DJDNA, Intention } from '../types';
import { getHistorySummaryForPrompt } from "./historyService";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function generateShowArt(title: string, theme: string, negativePrompt: string): Promise<string | undefined> {
    try {
        console.log(`Generating show art for title: "${title}" and theme: "${theme}"`);
        const fullPrompt = `Crea una portada atmosférica y artística para un programa de radio. El título del programa es "${title}" y el tema es "${theme}". Evita usar texto en la imagen. El estilo debe ser evocador, abstracto y moderno, usando colores vibrantes y texturas interesantes. ${negativePrompt ? `No incluyas: ${negativePrompt}.` : ''}`;
        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: fullPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '16:9',
            },
        });
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (e) {
        console.error("Error generating show art:", e);
        return undefined;
    }
}

async function imageUrlToBase64(url: string): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return undefined;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error(`Failed to convert image URL ${url} to base64`, e);
    return undefined;
  }
}

interface EnhancedSongData { id: string; title: string; artist: string; album?: string; year?: number; genre?: string; coverArtUrl?: string; }

export const getLyrics = async (title: string, artist: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Encuentra y devuelve únicamente la letra de la canción "${title}" de ${artist}. No incluyas ningún texto adicional, solo la letra. Si no la encuentras, responde con "No se encontraron las letras para esta canción."`
        });
        return response.text.trim();
    } catch (e) {
        console.error("Error fetching lyrics", e);
        return "Hubo un error al buscar la letra. Inténtalo de nuevo.";
    }
};

export const enhanceSongsMetadata = async (songs: LibrarySong[]): Promise<LibrarySong[]> => {
    if (songs.length === 0) return [];
    const songsToEnhance = songs.map(s => ({ id: s.id, title: s.metadata.title === s.file.name.replace(/\.[^/.]+$/, "") ? s.file.name : s.metadata.title, artist: s.metadata.artist === 'Artista Desconocido' ? '' : s.metadata.artist }));

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are a music metadata expert. For each song ID, find accurate information. Use title/artist as clues. Return only corrected info. Songs: ${JSON.stringify(songsToEnhance)}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT, required: ['id', 'title', 'artist'],
                    properties: {
                        id: { type: Type.STRING }, title: { type: Type.STRING }, artist: { type: Type.STRING }, album: { type: Type.STRING }, year: { type: Type.INTEGER }, genre: { type: Type.STRING },
                        coverArtUrl: { type: Type.STRING, description: "Direct URL to official cover art. Prioritize MusicBrainz, SoundCloud, Bandcamp." }
                    }
                }
            }
        }
    });

    const enhancedDataArray: EnhancedSongData[] = JSON.parse(response.text);
    const enhancedDataMap = new Map(enhancedDataArray.map((item: EnhancedSongData) => [item.id, item]));

    return Promise.all(songs.map(async (song) => {
        const enhanced = enhancedDataMap.get(song.id);
        if (!enhanced) return song;
        const newMetadata: SongMetadata = { ...song.metadata };
        if (enhanced.title) newMetadata.title = enhanced.title;
        if (enhanced.artist) newMetadata.artist = enhanced.artist;
        if (enhanced.album) newMetadata.album = enhanced.album;
        if (enhanced.year) newMetadata.year = enhanced.year;
        if (enhanced.genre) newMetadata.genre = enhanced.genre;
        if (enhanced.coverArtUrl) { const base64Image = await imageUrlToBase64(enhanced.coverArtUrl); if (base64Image) newMetadata.picture = base64Image; }
        return { ...song, metadata: newMetadata };
    }));
};

const getAdPrompt = (frequency: string, customAds: string) => {
    if (customAds.trim()) return `Usa EXACTAMENTE los siguientes guiones para los anuncios, distribuyéndolos a lo largo del show:\n${customAds.split('\n').filter(ad => ad.trim() !== '').map(ad => `"${ad.trim()}"`).join(',\n')}\nNo inventes ningún otro anuncio.`;
    switch(frequency) {
        case 'low': return "Genera 1 pausa publicitaria con 1-2 anuncios cortos y divertidos sobre productos falsos y absurdos.";
        case 'medium': return "Genera 2 pausas publicitarias, cada una con 2 anuncios cortos y divertidos sobre productos falsos y absurdos.";
        case 'high': return "Genera 3 pausas publicitarias, cada una con 2-3 anuncios cortos y divertidos sobre productos falsos y absurdos.";
        default: return "No generes ninguna pausa publicitaria.";
    }
}

const getTimeOfDay = (): Exclude<TimeOfDay, 'auto'> => { const h = new Date().getHours(); if (h <= 5) return 'madrugada'; if (h <= 11) return 'mañana'; if (h <= 17) return 'tarde'; return 'noche'; }

const getMoodPrompt = (mood: { energy: number; vibe: number }): string => {
    let e = 'neutra', v = 'equilibrado';
    if (mood.energy > 0.6) e = 'muy alta y enérgica'; else if (mood.energy > 0.2) e = 'animada'; else if (mood.energy < -0.6) e = 'muy baja y tranquila'; else if (mood.energy < -0.2) e = 'relajada';
    if (mood.vibe > 0.6) v = 'muy feliz y eufórico'; else if (mood.vibe > 0.2) v = 'positivo y alegre'; else if (mood.vibe < -0.6) v = 'profundamente melancólico y reflexivo'; else if (mood.vibe < -0.2) v = 'serio o nostálgico';
    return `El usuario busca una atmósfera con una energía ${e} y un ambiente ${v}. Adapta el orden de las canciones y tus comentarios a este mood.`;
}

const getCommentaryPrompt = (length: 'short' | 'standard' | 'long'): string => {
    switch (length) {
        case 'short': return "Tus comentarios deben ser muy breves y directos, de 10 a 15 segundos como máximo.";
        case 'long': return "Tus comentarios deben ser detallados y profundos, de 30 a 45 segundos, explorando a fondo la historia y el contexto de las canciones.";
        default: return "Tus comentarios deben tener una duración estándar de 15 a 30 segundos.";
    }
}

const generatePersonaFromDNA = (dj: ResidentDJ): string => {
    const { persona, dna, name } = dj;
    let style = persona.name === 'Personalizada' ? '' : persona.style;
    const additions: string[] = [];

    // Humor
    if (dna.humor > 0.5) additions.push("Tu humor es extremadamente sarcástico e irónico.");
    else if (dna.humor > 0.1) additions.push("Añade un toque de humor seco y sarcasmo a tus comentarios.");
    else if (dna.humor < -0.5) additions.push("Tu humor es sutil, casi inexistente. Eres muy directo.");
    
    // Energy
    if (dna.energy > 0.5) additions.push("Eres extremadamente enérgico y entusiasta, casi hiperactivo.");
    else if (dna.energy > 0.1) additions.push("Mantén un nivel de energía alto y positivo.");
    else if (dna.energy < -0.5) additions.push("Tu tono es muy calmado, relajado y casi susurrante.");
    else if (dna.energy < -0.1) additions.push("Adopta un tono tranquilo y reflexivo.");

    // Knowledge
    if (dna.knowledge > 0.5) additions.push("Eres un erudito musical. Cada comentario debe incluir datos profundos, técnicos o históricos. Demuestra tu vasto conocimiento.");
    else if (dna.knowledge > 0.1) additions.push("Comparte datos interesantes y anécdotas sobre la música cuando puedas.");
    else if (dna.knowledge < -0.5) additions.push("Evita dar datos o anécdotas. Céntrate únicamente en las sensaciones y el ambiente.");
    
    // Tone
    if (dna.tone > 0.5) additions.push("Tu tono es provocador y desafiante. Te gusta picar al oyente y cuestionar sus gustos de forma juguetona.");
    else if (dna.tone > 0.1) additions.push("A veces eres un poco irreverente y te sales del guion.");
    else if (dna.tone < -0.5) additions.push("Eres extremadamente amable, cercano y servicial. Tratas al oyente con sumo cuidado y afecto.");
    else if (dna.tone < -0.1) additions.push("Mantén un tono consistentemente amigable y de apoyo.");

    return `
      Tu Nombre: "${name}"
      Personalidad Base: ${style}
      Ajustes de ADN: ${additions.length > 0 ? additions.join(' ') : 'Sin ajustes específicos, sigue la personalidad base.'}
    `;
}

const getIntentionPrompt = (intention: Intention): string => {
    switch(intention) {
        case 'Focus': return "La INTENCIÓN del usuario es 'Enfocarme'. Adopta un rol de compañero de concentración. Habla muy poco, solo para introducir la canción de forma breve. Evita datos que distraigan. El ambiente debe ser de máxima productividad y mínima interrupción.";
        case 'Relax': return "La INTENCIÓN del usuario es 'Relajarme'. Tu tono debe ser calmado, casi como un susurro. Los comentarios deben ser poéticos y evocadores, ayudando a crear una atmósfera de paz y tranquilidad. Elige datos suaves sobre la música.";
        case 'Celebrate': return "La INTENCIÓN del usuario es 'Celebrar'. ¡Es una fiesta! Tu energía debe estar por las nubes. Sé entusiasta, divertido y celebra cada canción. Los comentarios deben ser cortos, explosivos y animar al oyente.";
        case 'Nostalgia': return "La INTENCIÓN del usuario es 'Nostalgia'. Conviértete en un narrador de historias. Conecta las canciones con recuerdos, anécdotas del pasado y el contexto histórico de una forma muy personal y emotiva.";
        case 'Discover': return "La INTENCIÓN del usuario es 'Descubrir'. Actúa como un arqueólogo musical. Desentierra los secretos y las joyas ocultas de cada canción. Sorprende al oyente con datos que probablemente no conozca.";
        case 'Automatic': default: return "La INTENCIÓN es 'Automática'. Adapta tu estilo al mood y la hora del día. Sé un DJ versátil y equilibrado, demostrando tu conocimiento sin ser abrumador y tu personalidad sin ser excesiva.";
    }
}

export const createRadioShow = async (songs: AnalyzedSong[], dj: ResidentDJ, options: CustomizationOptions): Promise<RadioShow> => {
  const songListForPrompt = songs.map(s => `${s.index}: "${s.metadata.title}" por ${s.metadata.artist}`).join('\n');
  const finalTimeOfDay = options.timeOfDay === 'auto' ? getTimeOfDay() : options.timeOfDay;
  const historySummary = getHistorySummaryForPrompt();
  const personaPrompt = generatePersonaFromDNA(dj);

  const contextInstructions = [
      `Intención Principal: ${getIntentionPrompt(options.intention)}`,
      `Hora del Día: ${finalTimeOfDay}.`, 
      `Mood del Usuario: ${getMoodPrompt(options.mood)}`,
      `Público Objetivo: ${options.audienceType || 'Para el oyente habitual.'}`,
      `Contexto del Show: ${options.showContext || 'Una sesión más para nosotros.'}`
  ];
  if (options.timeCapsuleYear) contextInstructions.push(`MODO TIME CAPSULE: Estás transmitiendo desde el año ${options.timeCapsuleYear}. TODO tu conocimiento y referencias DEBEN ser de ese año o anteriores.`);
  if (options.includeCallIns) contextInstructions.push(`INCLUIR LLAMADAS: Simula 1 o 2 llamadas cortas de oyentes falsos durante el show.`);
  if (options.mentionRelatedArtists) contextInstructions.push(`MENCIONAR ARTISTAS RELACIONADOS: Cuando sea apropiado, menciona brevemente a artistas similares o influencias de la canción actual.`);
  
  const prompt = `
    Tu tarea es actuar como ${dj.name}, un DJ de radio residente y compañero musical del usuario. Eres una entidad persistente con memoria.

    **1. TU Identidad (NO la rompas):**
    ${personaPrompt}

    **2. Tu MEMORIA (La relación con el oyente):**
    Este es el historial de escucha y las preferencias GLOBALES del usuario. Úsalo para que tus comentarios sean personales y demuestren que lo conoces.
    ${historySummary}

    **3. CONTEXTO Y DIRECTIVAS PARA ESTA SESIÓN:**
    ${contextInstructions.map(c => `- ${c}`).join('\n    ')}

    **4. Instrucciones de la Sesión:**
    - **Búsqueda Obligatoria:** Usa la búsqueda de Google para encontrar datos interesantes (anécdotas, récords, contexto de creación, conexiones entre artistas) sobre las canciones/artistas e incorpóralos en tus comentarios. Cita las fuentes.
    - **Análisis de Género:** Clasifica CADA canción en UNO de los siguientes géneros: 'Rock', 'Electronic', 'Pop', 'Hip-Hop', 'Jazz', 'Classical', 'Vocal', 'Other'.
    - **Tema del Show:** ${options.theme ? `El tema que el usuario ha pedido para hoy es "${options.theme}".` : "No hay un tema específico, guíate por el mood y la intención."}
    - **Flujo y Comentarios:**
        1. Ordena TODAS las canciones para un flujo coherente basado en el tema, el mood, la intención y tu conocimiento del oyente.
        2. ${getCommentaryPrompt(options.commentaryLength)}
        3. Posición del Comentario: ${options.commentaryPlacement === 'before' ? 'El comentario DEBE ser hablado ANTES de cada canción.' : options.commentaryPlacement === 'intro' ? 'El comentario debe ocurrir sobre los primeros segundos instrumentales de la canción (intro).' : 'Varía la posición de tus comentarios, a veces antes, a veces sobre la intro.'}
    - **Pausas Publicitarias:** ${getAdPrompt(options.adFrequency, options.customAds)}
    - **Jingles:** ${options.includeJingles ? `Crea 2-3 jingles cortos y pegadizos para "La Estación de ${dj.name}" o "AI Radio" y distribúyelos entre las canciones.` : 'No incluyas jingles.'}

    **5. Lista de Canciones para esta sesión (índice: "Título" por Artista):**
    ${songListForPrompt}

    **6. Formato de Salida JSON Requerido:**
    Responde ÚNICAMENTE con un objeto JSON válido que siga esta estructura exacta. NO incluyas explicaciones ni markdown.
    {
      "showTitle": "Un nombre creativo y memorable para la sesión de hoy.",
      "introCommentary": "Un saludo inicial de 10-15 segundos para introducir el show, saludando al usuario como si continuarais vuestra conversación de siempre.",
      "playlist": [
        { "type": "song", "songIndex": 0, "commentary": "Tu comentario sobre la canción.", "genre": "Rock" },
        { "type": "jingle", "script": "¡Estás en AI Radio con ${dj.name}!" },
        { "type": "ad_break", "adverts": ["Script del anuncio 1.", "Script del anuncio 2."] }
      ],
      "outroCommentary": "Un comentario final para cerrar la sesión (15-20 segundos), quizás adelantando algo para la próxima vez.",
      "userReactions": {
        "onUnmute": "¡Ah, has vuelto! Justo a tiempo.",
        "onPause": "Pausa. Te espero aquí.",
        "onPlay": "¡Seguimos!",
        "onSkip": "Ok, saltando esta. ¡A ver qué te parece la siguiente!",
        "onFavorite": "¡Buena elección! Marcada como favorita."
      }
    }
  `;
  
  try {
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { tools: [{googleSearch: {}}] } });
    const jsonText = response.text.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
    
    let generatedShow: Omit<RadioShow, 'sources' | 'showArt'>;
    try { generatedShow = JSON.parse(jsonText); } catch (e) { console.error("Error al parsear JSON:", e, "Respuesta:", jsonText); throw new Error("La IA devolvió un formato inesperado."); }
    
    const sources: Source[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(c => c.web).filter((w): w is Source => !!w?.uri) || [];
    
    let showArt: string | undefined;
    if (options.generateShowArt) { showArt = await generateShowArt(generatedShow.showTitle, options.theme, options.negativeShowArtPrompt); }
    
    return { ...generatedShow, sources, showArt };

  } catch (error) {
    console.error("Error al generar la sesión con Gemini:", error);
    if (error instanceof Error && error.message.includes("formato inesperado")) throw error;
    throw new Error("No se pudo generar la sesión de radio. La IA puede estar ocupada.");
  }
};