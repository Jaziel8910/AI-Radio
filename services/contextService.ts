

declare var puter: any;

/**
 * A robust fetch wrapper that adds retries and timeouts.
 * @param url The URL to fetch.
 * @param options Standard fetch options.
 * @param retries Number of retry attempts.
 * @param timeout Request timeout in milliseconds.
 * @returns A promise that resolves to the Response object.
 */
const robustFetch = async (url: string, options: RequestInit = {}, retries = 3, timeout = 8000): Promise<Response> => {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const { signal } = controller;

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => {
                    controller.abort();
                    reject(new Error('Request timed out'));
                }, timeout)
            );

            // Use puter's built-in CORS proxy
            const fetchPromise = puter.net.fetch(url, { ...options, signal });

            const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

            // A 204 status is a valid success response with no body, not an error.
            if (!response.ok && response.status !== 204) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response; // Success
        } catch (error) {
            console.warn(`Fetch attempt ${i + 1} for ${url} failed. Retrying...`, error);
            if (i === retries - 1) {
                console.error(`All fetch attempts for ${url} failed.`);
                throw error; // Re-throw the last error after all retries
            }
            // Wait a bit longer before the next retry
            await new Promise(res => setTimeout(res, 500 * (i + 1)));
        }
    }
    // This part should be unreachable, but it satisfies TypeScript's need for a return path.
    throw new Error('All fetch retries failed.');
};


// --- USER CONTEXT SERVICES ---

/**
 * Gets user's location using browser's Geolocation API.
 * Caches the result in sessionStorage to avoid asking for permission repeatedly.
 */
export const getUserLocation = async (): Promise<{ lat: number; lon: number } | null> => {
    const cachedLoc = sessionStorage.getItem('aiRadioUserLocation');
    if (cachedLoc) return JSON.parse(cachedLoc);

    if (!navigator.geolocation) return null;

    return new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const loc = { lat: position.coords.latitude, lon: position.coords.longitude };
                sessionStorage.setItem('aiRadioUserLocation', JSON.stringify(loc));
                resolve(loc);
            },
            () => resolve(null) // User denies permission or error
        );
    });
};


// --- EXTERNAL API SERVICES (KEYLESS) ---

export const getWeatherUpdate = async (lat: number, lon: number): Promise<string | null> => {
    try {
        const response = await robustFetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=celsius`);
        const data = await response.json();
        const temp = Math.round(data.current.temperature_2m);
        const weatherCode = data.current.weather_code;

        if (weatherCode >= 51) return `Parece que está lloviendo con unos ${temp}°C. Un mood perfecto para música nostálgica.`;
        if (weatherCode > 2 && weatherCode < 51) return `El cielo está nublado y tenemos ${temp}°C. A ver si la música lo despeja.`;
        return `Hace un día despejado con ${temp}°C. ¡A tope!`;
    } catch (e) {
        console.error("Error fetching weather:", e);
        return null;
    }
};

export const getOnThisDayMusicEvent = async (): Promise<string | null> => {
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    try {
        const response = await robustFetch(`https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${month}/${day}`);
        const data = await response.json();
        const musicEvent = data.events.find((e: any) =>
            e.text.toLowerCase().includes("album") ||
            e.text.toLowerCase().includes("song") ||
            e.text.toLowerCase().includes("single")
        );
        if (musicEvent) return `Efeméride musical del día: ${musicEvent.text} (en ${musicEvent.year}).`;
        return null;
    } catch (e) {
        console.error("Error fetching OnThisDay event:", e);
        return null;
    }
};

export const drawACard = async (): Promise<string | null> => {
    try {
        const response = await robustFetch('https://deckofcardsapi.com/api/deck/new/draw/?count=1');
        const data = await response.json();
        const card = data.cards[0];
        const valueMap: { [key: string]: string } = { 'ACE': 'As', 'KING': 'Rey', 'QUEEN': 'Reina', 'JACK': 'Jota' };
        const suitMap: { [key: string]: string } = { 'SPADES': 'Picas', 'DIAMONDS': 'Diamantes', 'CLUBS': 'Tréboles', 'HEARTS': 'Corazones' };
        const cardName = `${valueMap[card.value] || card.value} de ${suitMap[card.suit]}`;
        return `He sacado una carta al azar para inspirarme: el ${cardName}. ¡A ver qué sugiere esto!`;
    } catch (e) {
        console.error("Error fetching card:", e);
        return null;
    }
};

export const getFamousQuote = async (): Promise<string | null> => {
    try {
        const response = await robustFetch('https://api.quotable.io/random');
        const data = await response.json();
        return `Momento filosófico patrocinado por la radio: "${data.content}" -${data.author}.`;
    } catch (e) {
        console.error("Error fetching quote:", e);
        return null;
    }
};

export const getBoredIdea = async (): Promise<string | null> => {
    try {
        const response = await robustFetch('https://www.boredapi.com/api/activity/');
        const data = await response.json();
        return `Sugerencia anti-aburrimiento de la central: ¿Por qué no intentas '${data.activity.toLowerCase()}'?`;
    } catch (e) {
        console.error("Error fetching bored idea:", e);
        return null;
    }
};

export const getARandomJoke = async (): Promise<string | null> => {
    try {
        const response = await robustFetch('https://official-joke-api.appspot.com/random_joke');
        const data = await response.json();
        await new Promise(res => setTimeout(res, 1000)); // Dramatic pause
        return `Momento del chiste malo: ${data.setup}... ${data.punchline}`;
    } catch (e) {
        console.error("Error fetching joke:", e);
        return null;
    }
};

export const getCatFact = async (): Promise<string | null> => {
    try {
        const response = await robustFetch('https://catfact.ninja/fact');
        const data = await response.json();
        return `Dato Felino patrocinado por la Internet: ${data.fact}`;
    } catch (e) {
        console.error("Error fetching cat fact:", e);
        return null;
    }
};

export const getTodaysHoliday = async (): Promise<string | null> => {
    try {
        const userLang = navigator.language || 'en-US';
        const countryCode = userLang.split('-')[1] || 'US';
        const year = new Date().getFullYear();
        
        // This endpoint returns 200 if it's a holiday, and 204 if it is NOT.
        const isHolidayResponse = await robustFetch(`https://date.nager.at/api/v3/IsTodayPublicHoliday/${countryCode}`);
        
        // Only if the status is 200 (OK), we proceed to find the holiday name.
        // A 204 (No Content) response means it's not a holiday, so we do nothing.
        if (isHolidayResponse.status === 200) {
            const holidaysResponse = await robustFetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
            const holidays = await holidaysResponse.json();
            const todayStr = new Date().toISOString().split('T')[0];
            const todayHoliday = holidays.find((h: any) => h.date === todayStr);
            if(todayHoliday) return `¡Alerta de fiesta! Hoy es ${todayHoliday.localName} en tu zona. ¡A celebrar como se debe!`;
        }
        
        return null;
    } catch (e) {
        console.error("Error fetching holiday info:", e);
        return null;
    }
};

export const generateCoolShowName = async (): Promise<string> => {
    try {
        const response = await robustFetch('https://random-data-api.com/api/device/random_device');
        const data = await response.json();
        return `El ${data.manufacturer} ${data.model}`;
    } catch (e) {
        console.error("Error generating show name:", e);
        return "La Sesión de Hoy";
    }
};

export const getSomeAdvice = async (): Promise<string | null> => {
    try {
        const response = await robustFetch('https://api.adviceslip.com/advice');
        const data = await response.json();
        return `Y un pequeño consejo para el alma: "${data.slip.advice}"`;
    } catch (e) {
        console.error("Error fetching advice:", e);
        return null;
    }
};
